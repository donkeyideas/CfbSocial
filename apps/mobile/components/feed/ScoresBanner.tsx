import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { withAlpha } from '@/lib/theme/utils';
import { ESPN_SCOREBOARD_URL, GAMES_REFRESH_MS } from '@/lib/constants';
const SCROLL_SPEED = 30; // pixels per second
const ITEM_WIDTH = 140;
const ITEM_GAP = 8;

interface EspnCompetitor {
  team: {
    abbreviation: string;
    displayName: string;
    color?: string;
  };
  score?: string;
  homeAway: 'home' | 'away';
}

interface EspnEvent {
  id: string;
  status: {
    type: {
      completed: boolean;
      description: string;
      state: string;
    };
  };
  competitions: Array<{
    competitors: EspnCompetitor[];
  }>;
}

interface GameScore {
  id: string;
  awayAbbr: string;
  homeAbbr: string;
  awayScore: string | null;
  homeScore: string | null;
  status: string;
  state: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ScoresBanner() {
  const colors = useColors();
  const [games, setGames] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);
  const { accent } = useSchoolTheme();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    banner: {
      backgroundColor: colors.dark,
      height: 52,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    loader: {
      alignSelf: 'center',
    },
    empty: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: 'rgba(255,255,255,0.5)',
      textAlign: 'center',
    },
    tickerContainer: {
      overflow: 'hidden',
      flex: 1,
      justifyContent: 'center',
    },
    tickerTrack: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    gameItem: {
      width: ITEM_WIDTH,
      marginRight: ITEM_GAP,
      alignItems: 'center',
      paddingVertical: 6,
    },
    gameText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 12,
    },
    statusText: {
      fontFamily: typography.sans,
      fontSize: 9,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  }), [colors]);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(ESPN_SCOREBOARD_URL);
      const json = await res.json();
      const events: EspnEvent[] = json.events ?? [];

      const parsed: GameScore[] = events.map((ev) => {
        const comp = ev.competitions[0];
        const away = comp.competitors.find((c) => c.homeAway === 'away');
        const home = comp.competitors.find((c) => c.homeAway === 'home');
        return {
          id: ev.id,
          awayAbbr: away?.team.abbreviation ?? '???',
          homeAbbr: home?.team.abbreviation ?? '???',
          awayScore: away?.score ?? null,
          homeScore: home?.score ?? null,
          status: ev.status.type.description,
          state: ev.status.type.state,
        };
      });

      setGames(parsed);
    } catch {
      // silently fail -- scores are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
    intervalRef.current = setInterval(fetchScores, GAMES_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchScores]);

  // Auto-scroll animation
  useEffect(() => {
    if (games.length === 0) return;

    const totalWidth = games.length * (ITEM_WIDTH + ITEM_GAP);
    if (totalWidth <= SCREEN_WIDTH) return; // no need to scroll

    const startAutoScroll = () => {
      scrollX.setValue(0);
      const duration = (totalWidth / SCROLL_SPEED) * 1000;
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scrollX, {
            toValue: -totalWidth,
            duration,
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(scrollX, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
            isInteraction: false,
          }),
        ])
      );
      animRef.current.start();
    };

    startAutoScroll();
    return () => {
      if (animRef.current) animRef.current.stop();
    };
  }, [games, scrollX]);

  const handlePress = (gameId: string) => {
    router.push(`/war-room/${gameId}` as never);
  };

  // Duplicate games for seamless loop
  const displayGames = games.length > 0 ? [...games, ...games] : [];

  return (
    <View style={styles.banner}>
      {loading ? (
        <ActivityIndicator size="small" color={accent} style={styles.loader} />
      ) : games.length === 0 ? (
        <Text style={styles.empty}>No games today</Text>
      ) : (
        <View style={styles.tickerContainer}>
          <Animated.View
            style={[
              styles.tickerTrack,
              { transform: [{ translateX: scrollX }] },
            ]}
          >
            {displayGames.map((game, idx) => (
              <Pressable
                key={`${game.id}-${idx}`}
                style={styles.gameItem}
                onPress={() => handlePress(game.id)}
              >
                {game.state === 'pre' ? (
                  <Text style={[styles.gameText, { color: accent }]}>
                    {game.awayAbbr} vs {game.homeAbbr}
                  </Text>
                ) : (
                  <Text style={[styles.gameText, { color: accent }]}>
                    {game.awayAbbr} {game.awayScore} - {game.homeScore}{' '}
                    {game.homeAbbr}
                  </Text>
                )}
                <Text style={styles.statusText}>{game.status}</Text>
              </Pressable>
            ))}
          </Animated.View>
        </View>
      )}
    </View>
  );
}
