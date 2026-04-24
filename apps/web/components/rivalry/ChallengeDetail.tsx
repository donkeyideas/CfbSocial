'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resolveChallenge } from '@cfb-social/api';
import { VoteBar } from './VoteBar';

interface Participant {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  dynasty_tier: string | null;
}

interface ChallengeDetailProps {
  challenge: {
    id: string;
    topic: string;
    status: string;
    challenger_id: string;
    challenged_id: string;
    challenger_argument: string | null;
    challenged_argument: string | null;
    challenger_votes: number;
    challenged_votes: number;
    winner_id: string | null;
    voting_ends_at: string | null;
    created_at: string;
    challenger: Participant | null;
    challenged: Participant | null;
  };
  currentUserId: string | null;
  existingVote: string | null;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Awaiting Response',
  ACTIVE: 'Arguments Open',
  VOTING: 'Voting Active',
  COMPLETED: 'Completed',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
};

export function ChallengeDetail({ challenge, currentUserId, existingVote }: ChallengeDetailProps) {
  const router = useRouter();
  const [argument, setArgument] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState(existingVote);
  const [challengerVotes, setChallengerVotes] = useState(challenge.challenger_votes);
  const [challengedVotes, setChallengedVotes] = useState(challenge.challenged_votes);

  const isChallenger = currentUserId === challenge.challenger_id;
  const isChallenged = currentUserId === challenge.challenged_id;
  const isParticipant = isChallenger || isChallenged;

  const canSubmitArgument =
    isParticipant &&
    (challenge.status === 'PENDING' || challenge.status === 'ACTIVE') &&
    ((isChallenger && !challenge.challenger_argument) ||
     (isChallenged && !challenge.challenged_argument));

  const canVote =
    challenge.status === 'VOTING' && !isParticipant && !voted;

  async function handleSubmitArgument(e: React.FormEvent) {
    e.preventDefault();
    if (!argument.trim() || submitting) return;

    setSubmitting(true);
    const supabase = createClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (isChallenger) {
      updates.challenger_argument = argument.trim();
    } else {
      updates.challenged_argument = argument.trim();
      if (challenge.status === 'PENDING') {
        updates.status = 'ACTIVE';
      }
    }

    // Check if both arguments will now be set
    const hasChallenger = isChallenger ? true : !!challenge.challenger_argument;
    const hasChallenged = isChallenged ? true : !!challenge.challenged_argument;
    if (hasChallenger && hasChallenged) {
      updates.status = 'VOTING';
      updates.voting_ends_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    await supabase
      .from('challenges')
      .update(updates)
      .eq('id', challenge.id);

    setArgument('');
    setSubmitting(false);
    router.refresh();
  }

  async function handleVote(votedForId: string) {
    if (!canVote) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setVoted(votedForId);
    if (votedForId === challenge.challenger_id) setChallengerVotes((c) => c + 1);
    else setChallengedVotes((c) => c + 1);

    await supabase.from('challenge_votes').insert({
      challenge_id: challenge.id,
      user_id: user.id,
      voted_for: votedForId,
    });
  }

  async function handleDecline() {
    const supabase = createClient();
    await supabase
      .from('challenges')
      .update({ status: 'DECLINED', updated_at: new Date().toISOString() })
      .eq('id', challenge.id);
    router.refresh();
  }

  const votingEnded = challenge.status === 'VOTING' && challenge.voting_ends_at && new Date(challenge.voting_ends_at) <= new Date();
  const [resolving, setResolving] = useState(false);

  // Auto-resolve when voting period has ended
  useEffect(() => {
    if (votingEnded && !resolving) {
      handleResolve();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleResolve() {
    setResolving(true);
    try {
      const supabase = createClient();
      await resolveChallenge(supabase, challenge.id);
      router.refresh();
    } catch {
      // Already resolved or error — just refresh
      router.refresh();
    } finally {
      setResolving(false);
    }
  }

  const challengerName = challenge.challenger?.display_name ?? challenge.challenger?.username ?? 'Unknown';
  const challengedName = challenge.challenged?.display_name ?? challenge.challenged?.username ?? 'Unknown';

  return (
    <div>
      {/* Challenge header card */}
      <div style={{
        background: 'var(--warm-white)',
        border: '1.5px solid rgba(59,47,30,0.2)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        <div style={{
          background: 'var(--dark-brown)',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.65rem',
            color: 'var(--gold)',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}>
            Challenge
          </span>
          <span style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.7rem',
            color: 'var(--cream)',
            fontWeight: 600,
          }}>
            {statusLabels[challenge.status] ?? challenge.status}
          </span>
        </div>

        <div style={{ padding: 20 }}>
          <h2 style={{
            fontFamily: 'var(--serif)',
            fontSize: '1.2rem',
            fontWeight: 800,
            color: 'var(--dark-brown)',
            marginBottom: 16,
          }}>
            {challenge.topic}
          </h2>

          {/* Participants */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--crimson)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontWeight: 700, fontSize: '1.1rem',
                margin: '0 auto 6px', overflow: 'hidden',
              }}>
                {challenge.challenger?.avatar_url ? (
                  <img src={challenge.challenger.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  challengerName[0]?.toUpperCase()
                )}
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', fontWeight: 600 }}>
                @{challenge.challenger?.username}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--faded-ink)' }}>
                Challenger
              </div>
            </div>

            <span style={{ fontFamily: 'var(--serif)', fontWeight: 800, color: 'var(--faded-ink)', fontSize: '1rem' }}>
              VS
            </span>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--dark-brown)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontWeight: 700, fontSize: '1.1rem',
                margin: '0 auto 6px', overflow: 'hidden',
              }}>
                {challenge.challenged?.avatar_url ? (
                  <img src={challenge.challenged.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  challengedName[0]?.toUpperCase()
                )}
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', fontWeight: 600 }}>
                @{challenge.challenged?.username}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--faded-ink)' }}>
                Challenged
              </div>
            </div>
          </div>

          {/* Vote bar (during voting/completed) */}
          {(challenge.status === 'VOTING' || challenge.status === 'COMPLETED') && (
            <VoteBar
              votesA={challengerVotes}
              votesB={challengedVotes}
              labelA={challenge.challenger?.username ?? 'Challenger'}
              labelB={challenge.challenged?.username ?? 'Challenged'}
            />
          )}

          {/* Voting deadline */}
          {challenge.status === 'VOTING' && challenge.voting_ends_at && !votingEnded && (
            <p style={{
              fontFamily: 'var(--mono)', fontSize: '0.65rem',
              color: 'var(--faded-ink)', textAlign: 'center', marginTop: 8,
            }}>
              Voting ends {new Date(challenge.voting_ends_at).toLocaleString()}
            </p>
          )}

          {/* Resolve button when voting period has ended */}
          {votingEnded && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="composer-submit"
                style={{ opacity: resolving ? 0.5 : 1 }}
              >
                {resolving ? 'Finalizing...' : 'Finalize Results'}
              </button>
              <p style={{
                fontFamily: 'var(--mono)', fontSize: '0.6rem',
                color: 'var(--faded-ink)', marginTop: 6,
              }}>
                Voting period has ended. Click to declare the winner.
              </p>
            </div>
          )}

          {/* Winner display */}
          {challenge.status === 'COMPLETED' && challenge.winner_id && (
            <div style={{
              textAlign: 'center', marginTop: 12, padding: '10px 16px',
              background: 'rgba(196,154,47,0.08)', border: '1px solid var(--gold)',
              borderRadius: 3,
            }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: '0.6rem',
                color: 'var(--gold)', textTransform: 'uppercase',
                letterSpacing: 2, marginBottom: 4,
              }}>
                Winner
              </div>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: '1.1rem',
                fontWeight: 800, color: 'var(--dark-brown)',
              }}>
                {challenge.winner_id === challenge.challenger_id ? challengerName : challengedName}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Arguments section */}
      <div className="challenge-arguments">
        {/* Challenger argument */}
        <div className="challenge-argument-card">
          <div className="challenge-argument-label" style={{ color: 'var(--crimson)' }}>
            @{challenge.challenger?.username}&apos;s Argument
          </div>
          {challenge.challenger_argument ? (
            <p className="challenge-argument-text">
              {challenge.challenger_argument}
            </p>
          ) : (
            <p className="challenge-argument-empty">
              No argument submitted yet.
            </p>
          )}
          {canVote && (
            <button
              onClick={() => handleVote(challenge.challenger_id)}
              className="composer-submit"
              style={{
                marginTop: 10, width: '100%',
                background: voted === challenge.challenger_id ? 'var(--crimson)' : 'var(--dark-brown)',
              }}
            >
              {voted === challenge.challenger_id ? 'Voted' : 'Vote for this side'}
            </button>
          )}
        </div>

        {/* Challenged argument */}
        <div className="challenge-argument-card">
          <div className="challenge-argument-label" style={{ color: 'var(--dark-brown)' }}>
            @{challenge.challenged?.username}&apos;s Argument
          </div>
          {challenge.challenged_argument ? (
            <p className="challenge-argument-text">
              {challenge.challenged_argument}
            </p>
          ) : (
            <p className="challenge-argument-empty">
              No argument submitted yet.
            </p>
          )}
          {canVote && (
            <button
              onClick={() => handleVote(challenge.challenged_id)}
              className="composer-submit"
              style={{
                marginTop: 10, width: '100%',
                background: voted === challenge.challenged_id ? 'var(--crimson)' : 'var(--dark-brown)',
              }}
            >
              {voted === challenge.challenged_id ? 'Voted' : 'Vote for this side'}
            </button>
          )}
        </div>
      </div>

      {/* Submit argument form (for participants) */}
      {canSubmitArgument && (
        <form onSubmit={handleSubmitArgument} className="composer">
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '0.65rem',
            letterSpacing: 2, color: 'var(--faded-ink)',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            Submit Your Argument
          </div>
          <textarea
            value={argument}
            onChange={(e) => setArgument(e.target.value)}
            placeholder="Make your case..."
            className="composer-input"
            rows={3}
            maxLength={500}
          />
          <div className="composer-footer">
            <div />
            <button
              type="submit"
              disabled={!argument.trim() || submitting}
              className="composer-submit"
              style={{ opacity: !argument.trim() || submitting ? 0.5 : 1 }}
            >
              {submitting ? 'Submitting...' : 'Submit Argument'}
            </button>
          </div>
        </form>
      )}

      {/* Decline button (for challenged user on PENDING) */}
      {isChallenged && challenge.status === 'PENDING' && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={handleDecline}
            className="composer-tool"
            style={{ color: 'var(--crimson)', borderColor: 'var(--crimson)' }}
          >
            Decline Challenge
          </button>
        </div>
      )}
    </div>
  );
}
