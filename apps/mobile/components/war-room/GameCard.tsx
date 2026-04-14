import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import type { ColorPalette } from '@/lib/theme/palettes';

export interface ESPNCompetitor {
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    logo: string;
  };
  score?: string;
  homeAway: 'home' | 'away';
}

export interface ESPNGame {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: {
    type: {
      id: string;
      name: string;
      state: 'pre' | 'in' | 'post';
      completed: boolean;
    };
    displayClock?: string;
    period?: number;
  };
  competitions: Array<{
    competitors: ESPNCompetitor[];
    broadcasts?: Array<{ names: string[] }>;
  }>;
}

interface GameCardProps {
  game: ESPNGame;
}

function getStatusLabel(game: ESPNGame, colors: ColorPalette): { text: string; color: string } {
  const state = game.status.type.state;
  if (state === 'in') {
    const period = game.status.period ?? 0;
    const clock = game.status.displayClock ?? '';
    return {
      text: clock ? `Q${period} ${clock}` : 'LIVE',
      color: colors.success,
    };
  }
  if (state === 'post') {
    return { text: 'FINAL', color: colors.ink };
  }
  // pre
  const gameDate = new Date(game.date);
  const timeStr = gameDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return { text: timeStr, color: colors.textMuted };
}

export function GameCard({ game }: GameCardProps) {
  const colors = useColors();
  const router = useRouter();
  const competition = game.competitions?.[0];
  if (!competition) return null;

  const away = competition.competitors.find((c) => c.homeAway === 'away');
  const home = competition.competitors.find((c) => c.homeAway === 'home');
  if (!away || !home) return null;

  const statusLabel = getStatusLabel(game, colors);
  const isLive = game.status.type.state === 'in';
  const showScores = game.status.type.state !== 'pre';

  const broadcast =
    competition.broadcasts?.[0]?.names?.[0] ?? '';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 10,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    statusText: {
      fontFamily: typography.sansBold,
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    broadcast: {
      fontFamily: typography.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    matchup: {
      gap: 4,
    },
    teamRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    teamName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 15,
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    score: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: colors.textPrimary,
      minWidth: 36,
      textAlign: 'right',
    },
    vs: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      paddingLeft: 4,
    },
  }), [colors]);

  return (
    <Pressable
      onPress={() => router.push(`/war-room/${game.id}` as never)}
      style={styles.container}
    >
      {/* Status badge */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isLive ? colors.success : colors.surface },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isLive ? '#f4efe4' : statusLabel.color },
            ]}
          >
            {statusLabel.text}
          </Text>
        </View>
        {broadcast ? (
          <Text style={styles.broadcast}>{broadcast}</Text>
        ) : null}
      </View>

      {/* Teams and scores */}
      <View style={styles.matchup}>
        <View style={styles.teamRow}>
          <Text style={styles.teamName} numberOfLines={1}>
            {away.team.displayName}
          </Text>
          {showScores && (
            <Text style={styles.score}>{away.score ?? '-'}</Text>
          )}
        </View>

        <Text style={styles.vs}>at</Text>

        <View style={styles.teamRow}>
          <Text style={styles.teamName} numberOfLines={1}>
            {home.team.displayName}
          </Text>
          {showScores && (
            <Text style={styles.score}>{home.score ?? '-'}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
