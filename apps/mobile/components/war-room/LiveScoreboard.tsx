import { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/lib/theme/ThemeProvider';
import { withAlpha } from '@/lib/theme/utils';
import { typography } from '@/lib/theme/typography';
import { ESPN_SCOREBOARD_URL, SCORE_REFRESH_MS } from '@/lib/constants';

interface TeamInfo {
  displayName: string;
  abbreviation: string;
  logo: string;
  score: string;
}

interface ScoreboardProps {
  espnGameId: string;
  viewerCount: number;
}

export function LiveScoreboard({ espnGameId, viewerCount }: ScoreboardProps) {
  const colors = useColors();
  const [away, setAway] = useState<TeamInfo | null>(null);
  const [home, setHome] = useState<TeamInfo | null>(null);
  const [statusText, setStatusText] = useState('');
  const [isLive, setIsLive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.dark,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    teamSide: {
      alignItems: 'center',
      flex: 1,
      gap: 4,
    },
    teamLogo: {
      width: 40,
      height: 40,
    },
    teamAbbr: {
      fontFamily: typography.sansBold,
      fontSize: 12,
      color: '#ffffff',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    teamScore: {
      fontFamily: typography.serifBold,
      fontSize: 32,
      color: '#ffffff',
    },
    center: {
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusText: {
      fontFamily: typography.sansBold,
      fontSize: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    viewerText: {
      fontFamily: typography.sans,
      fontSize: 11,
      color: 'rgba(255,255,255,0.6)',
    },
  }), [colors]);

  const fetchScore = async () => {
    try {
      const res = await fetch(
        `${ESPN_SCOREBOARD_URL}/${espnGameId}`
      );
      const data = await res.json();

      const competition = data?.competitions?.[0];
      if (!competition) return;

      const awayComp = competition.competitors?.find(
        (c: { homeAway: string }) => c.homeAway === 'away'
      );
      const homeComp = competition.competitors?.find(
        (c: { homeAway: string }) => c.homeAway === 'home'
      );

      if (awayComp?.team) {
        setAway({
          displayName: awayComp.team.displayName,
          abbreviation: awayComp.team.abbreviation,
          logo: awayComp.team.logo,
          score: awayComp.score ?? '0',
        });
      }
      if (homeComp?.team) {
        setHome({
          displayName: homeComp.team.displayName,
          abbreviation: homeComp.team.abbreviation,
          logo: homeComp.team.logo,
          score: homeComp.score ?? '0',
        });
      }

      const state = data?.status?.type?.state;
      setIsLive(state === 'in');

      if (state === 'in') {
        const period = data?.status?.period ?? 0;
        const clock = data?.status?.displayClock ?? '';
        setStatusText(clock ? `Q${period} ${clock}` : 'LIVE');
      } else if (state === 'post') {
        setStatusText('FINAL');
      } else {
        const gameDate = new Date(data?.date);
        setStatusText(
          gameDate.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })
        );
      }
    } catch {
      // Silently fail - scoreboard just won't update
    }
  };

  useEffect(() => {
    fetchScore();

    intervalRef.current = setInterval(fetchScore, SCORE_REFRESH_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [espnGameId]);

  if (!away || !home) return null;

  return (
    <View style={styles.container}>
      {/* Away team */}
      <View style={styles.teamSide}>
        {away.logo ? (
          <Image
            source={{ uri: away.logo }}
            style={styles.teamLogo}
            contentFit="contain"
          />
        ) : null}
        <Text style={styles.teamAbbr}>{away.abbreviation}</Text>
        <Text style={styles.teamScore}>{away.score}</Text>
      </View>

      {/* Center info */}
      <View style={styles.center}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isLive ? colors.success : colors.surface },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isLive ? '#f4efe4' : '#ffffff' },
            ]}
          >
            {statusText}
          </Text>
        </View>
        <Text style={styles.viewerText}>
          {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}
        </Text>
      </View>

      {/* Home team */}
      <View style={styles.teamSide}>
        {home.logo ? (
          <Image
            source={{ uri: home.logo }}
            style={styles.teamLogo}
            contentFit="contain"
          />
        ) : null}
        <Text style={styles.teamAbbr}>{home.abbreviation}</Text>
        <Text style={styles.teamScore}>{home.score}</Text>
      </View>
    </View>
  );
}
