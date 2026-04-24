'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeGameChat } from '@cfb-social/api';
import { WeatherBadge } from '@/components/war-room/WeatherBadge';

interface GameThreadProps {
  thread: {
    id: string;
    espn_game_id: string;
    title: string;
    away_team: string;
    home_team: string;
    away_score: number;
    home_score: number;
    status: string;
    status_detail: string;
    game_date: string;
    viewer_count: number;
    message_count: number;
  };
  espnGameId: string;
  initialMessages: Array<Record<string, unknown>>;
}

interface ChatMessage {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  user_id: string;
  author?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    dynasty_tier: string | null;
  } | null;
}

const REACTIONS = [
  { label: 'TD', value: 'TOUCHDOWN', color: 'var(--crimson)' },
  { label: 'INT', value: 'INTERCEPTION', color: '#1a5276' },
  { label: 'SACK', value: 'SACK', color: '#6b3a2a' },
  { label: 'FG', value: 'FIELD GOAL', color: 'var(--gold)' },
  { label: 'FMB', value: 'FUMBLE', color: '#8b4513' },
];

export function GameThread({ thread, espnGameId, initialMessages }: GameThreadProps) {
  const [awayScore, setAwayScore] = useState(thread.away_score);
  const [homeScore, setHomeScore] = useState(thread.home_score);
  const [status, setStatus] = useState(thread.status);
  const [statusDetail, setStatusDetail] = useState(thread.status_detail);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>(initialMessages as unknown as ChatMessage[]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time messages
  const { messages: realtimeMessages } = useRealtimeGameChat(thread.id);

  // Merge realtime messages into allMessages (fetch author profile for each)
  useEffect(() => {
    if (realtimeMessages.length === 0) return;

    const fetchAndMerge = async () => {
      const supabase = createClient();
      const existingIds = new Set(allMessages.map((m) => m.id));
      const newMsgs = realtimeMessages.filter((m) => !existingIds.has(m.id));
      if (newMsgs.length === 0) return;

      // Fetch author profiles for new messages
      const userIds = [...new Set(newMsgs.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, dynasty_tier')
        .in('id', userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      const enriched: ChatMessage[] = newMsgs.map((m) => ({
        ...m,
        author: profileMap.get(m.user_id) ?? null,
      }));

      setAllMessages((prev) => {
        const ids = new Set(prev.map((msg) => msg.id));
        const toAdd = enriched.filter((msg) => !ids.has(msg.id));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      });
    };

    fetchAndMerge();
  }, [realtimeMessages]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  // Refresh scores from ESPN every 30s
  useEffect(() => {
    if (status === 'FINAL') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard'
        );
        if (!res.ok) return;
        const data = await res.json();
        const event = data?.events?.find((e: Record<string, unknown>) => e.id === espnGameId);
        if (!event) return;

        const competition = (event.competitions as Array<Record<string, unknown>>)?.[0];
        const competitors = (competition?.competitors as Array<Record<string, unknown>>) ?? [];
        const homeTeam = competitors.find((c) => c.homeAway === 'home');
        const awayTeam = competitors.find((c) => c.homeAway === 'away');
        const statusType = (event.status as Record<string, unknown>)?.type as Record<string, unknown> | undefined;
        const statusState = (statusType?.state ?? '') as string;

        setAwayScore(parseInt(awayTeam?.score as string) || 0);
        setHomeScore(parseInt(homeTeam?.score as string) || 0);
        setStatusDetail((statusType?.shortDetail ?? '') as string);

        if (statusState === 'in') setStatus('LIVE');
        else if (statusState === 'post') setStatus('FINAL');
      } catch {
        // Keep existing data
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [espnGameId, status]);

  // Presence tracking
  useEffect(() => {
    if (!thread.id) return;
    const supabase = createClient();
    const channel = supabase.channel(`war-room-presence:${thread.id}`, {
      config: { presence: { key: thread.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.values(state).reduce((sum, arr) => sum + (arr as unknown[]).length, 0);
        setViewerCount(Math.max(1, count));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread.id]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending || !thread.id) return;
    setSending(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }

    await supabase.from('game_thread_messages').insert({
      game_thread_id: thread.id,
      user_id: user.id,
      content: input.trim(),
      message_type: 'CHAT',
    });

    setInput('');
    setSending(false);
  }, [input, sending, thread.id]);

  const handleReaction = useCallback(async (value: string) => {
    if (!thread.id) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('game_thread_messages').insert({
      game_thread_id: thread.id,
      user_id: user.id,
      content: value,
      message_type: 'REACTION',
    });
  }, [thread.id]);

  const isLive = status === 'LIVE';

  return (
    <div>
      {/* Scoreboard */}
      <div className={`game-scoreboard ${isLive ? 'game-scoreboard-live' : ''}`}>
        <div className="game-scoreboard-header">
          <span className="game-scoreboard-title">{thread.title}</span>
          <div className="war-room-viewers">{viewerCount} watching</div>
        </div>
        <WeatherBadge homeAbbr={thread.home_team} status={status} />
        <div className="game-scoreboard-teams">
          <div className="game-scoreboard-team">
            <span className="game-scoreboard-abbr">{thread.away_team}</span>
            <span className="game-scoreboard-score">{awayScore}</span>
          </div>
          <div className="game-scoreboard-divider">
            {isLive && <span className="game-card-live-dot" />}
            <span className="game-scoreboard-at">@</span>
          </div>
          <div className="game-scoreboard-team">
            <span className="game-scoreboard-abbr">{thread.home_team}</span>
            <span className="game-scoreboard-score">{homeScore}</span>
          </div>
        </div>
        <div className="game-scoreboard-status">
          {statusDetail || status}
        </div>
      </div>

      {/* Quick Reactions */}
      <div className="war-room-reactions-bar">
        {REACTIONS.map((r) => (
          <button
            key={r.label}
            className="war-room-reaction-btn"
            style={{ borderColor: r.color, color: r.color }}
            onClick={() => handleReaction(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="war-room-chat">
        <div className="war-room-chat-header">Game Thread</div>
        <div className="war-room-messages">
          {allMessages.length === 0 ? (
            <div className="war-room-empty">
              No messages yet. Be the first to post in this game thread.
            </div>
          ) : (
            allMessages.map((msg) => (
              <MessageRow key={msg.id} message={msg} />
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {thread.id && (
          <div className="war-room-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Drop your take..."
              maxLength={300}
              className="war-room-input-field"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="war-room-send-btn"
              style={{ opacity: !input.trim() || sending ? 0.5 : 1 }}
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  const isReaction = message.message_type === 'REACTION';
  const authorName = message.author?.display_name ?? message.author?.username ?? 'Anon';
  const username = message.author?.username ?? 'anon';
  const timeAgo = getTimeAgo(new Date(message.created_at));

  if (isReaction) {
    return (
      <div className="war-room-message war-room-reaction-msg">
        <span className="war-room-msg-author">@{username}</span>
        <span className="war-room-msg-reaction">{message.content}</span>
        <span className="war-room-msg-time">{timeAgo}</span>
      </div>
    );
  }

  return (
    <div className="war-room-message">
      {message.author?.avatar_url ? (
        <img src={message.author.avatar_url} alt="" className="war-room-msg-avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <span className="war-room-msg-avatar">{authorName[0]?.toUpperCase()}</span>
      )}
      <div className="war-room-msg-body">
        <span className="war-room-msg-author">@{username}</span>
        <span className="war-room-msg-text">{message.content}</span>
      </div>
      <span className="war-room-msg-time">{timeAgo}</span>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return date.toLocaleDateString();
}
