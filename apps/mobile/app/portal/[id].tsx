import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { SchoolBadge } from '@/components/ui/SchoolBadge';
import { Avatar } from '@/components/ui/Avatar';
import { SchoolInterestBar } from '@/components/portal/SchoolInterestBar';
import { ClaimModal } from '@/components/portal/ClaimModal';
import { useColors } from '@/lib/theme/ThemeProvider';
import type { ColorPalette } from '@/lib/theme/palettes';
import { typography } from '@/lib/theme/typography';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';

interface PortalSchool {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
  slug: string | null;
}

interface PlayerDetail {
  id: string;
  name: string;
  position: string;
  height: string | null;
  weight: string | null;
  star_rating: number | null;
  status: string | null;
  class_year: string | null;
  entered_portal_at: string | null;
  previous_school_name: string | null;
  total_claims: number | null;
  previous_school: PortalSchool | null;
  committed_school: PortalSchool | null;
}

interface ClaimData {
  id: string;
  confidence: number | null;
  reasoning: string | null;
  is_correct: boolean | null;
  created_at: string | null;
  user: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  school: {
    id: string;
    name: string;
    abbreviation: string;
    primary_color: string;
    slug: string | null;
  } | null;
}

interface SchoolInterest {
  school_id: string;
  school_name: string;
  abbreviation: string;
  primary_color: string;
  count: number;
}

function getStatusStyle(status: string | null, c: ColorPalette) {
  switch (status) {
    case 'COMMITTED':
      return { bg: `${c.success}20`, text: c.success };
    case 'WITHDRAWN':
      return { bg: `${c.textMuted}20`, text: c.textMuted };
    default:
      return { bg: `${c.warning}20`, text: c.warning };
  }
}

function getStatusLabel(status: string | null): string {
  switch (status) {
    case 'IN_PORTAL': return 'IN PORTAL';
    case 'COMMITTED': return 'COMMITTED';
    case 'WITHDRAWN': return 'WITHDRAWN';
    default: return status?.replace(/_/g, ' ') ?? 'UNKNOWN';
  }
}

function renderStars(rating: number | null): string {
  if (!rating || rating < 1) return '';
  return Array(Math.min(rating, 5)).fill('*').join('');
}

export default function PortalPlayerDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { dark } = useSchoolTheme();

  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [claims, setClaims] = useState<ClaimData[]>([]);
  const [interests, setInterests] = useState<SchoolInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimModalVisible, setClaimModalVisible] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    backButton: {
      paddingTop: 50,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    backText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 15,
      color: colors.crimson,
    },
    playerCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginHorizontal: 16,
      overflow: 'hidden',
    },
    accentBar: {
      height: 5,
    },
    playerBody: {
      padding: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    nameSection: {
      flex: 1,
      marginRight: 8,
    },
    playerName: {
      fontFamily: typography.serifBold,
      fontSize: 24,
      color: colors.ink,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    position: {
      fontFamily: typography.mono,
      fontSize: 13,
      color: colors.textMuted,
      letterSpacing: 1,
    },
    stars: {
      fontFamily: typography.sansBold,
      fontSize: 16,
      color: colors.secondary,
      letterSpacing: 3,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontFamily: typography.mono,
      fontSize: 10,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    physicals: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 8,
    },
    schoolsRow: {
      marginTop: 14,
      gap: 10,
    },
    schoolInfoBlock: {
      gap: 4,
    },
    schoolLabel: {
      fontFamily: typography.mono,
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 1,
    },
    schoolDetail: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    schoolName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.ink,
    },
    portalDate: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 12,
    },
    claimBtn: {
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },
    claimBtnText: {
      fontFamily: typography.sansBold,
      fontSize: 14,
      color: colors.textInverse,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    interestSection: {
      padding: 16,
    },
    claimsHeader: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 2,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    listContent: {
      paddingBottom: 40,
    },
    claimCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 10,
    },
    claimHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    claimAuthor: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    claimAuthorName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.ink,
    },
    confidenceBadge: {
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    confidenceText: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    claimReasoning: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
      marginTop: 8,
    },
    correctBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      marginTop: 8,
    },
    correctText: {
      fontFamily: typography.mono,
      fontSize: 9,
      letterSpacing: 1,
    },
  }), [colors]);

  const fetchPlayer = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('portal_players')
      .select(`
        *,
        previous_school:schools!portal_players_previous_school_id_fkey(id, name, abbreviation, primary_color, slug),
        committed_school:schools!portal_players_committed_school_id_fkey(id, name, abbreviation, primary_color, slug)
      `)
      .eq('id', id)
      .single();
    if (data) {
      setPlayer(data as unknown as PlayerDetail);
    }
  }, [id]);

  const fetchClaims = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('roster_claims')
      .select(`
        id, confidence, reasoning, is_correct, created_at,
        user:profiles!roster_claims_user_id_fkey(id, username, display_name, avatar_url),
        school:schools!roster_claims_school_id_fkey(id, name, abbreviation, primary_color, slug)
      `)
      .eq('player_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      const typedClaims = data as unknown as ClaimData[];
      setClaims(typedClaims);

      // Build interest map from claims
      const interestMap = new Map<string, SchoolInterest>();
      typedClaims.forEach((claim) => {
        if (!claim.school) return;
        const existing = interestMap.get(claim.school.id);
        if (existing) {
          existing.count += 1;
        } else {
          interestMap.set(claim.school.id, {
            school_id: claim.school.id,
            school_name: claim.school.name,
            abbreviation: claim.school.abbreviation,
            primary_color: claim.school.primary_color,
            count: 1,
          });
        }
      });
      setInterests(Array.from(interestMap.values()));
    }
  }, [id]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPlayer(), fetchClaims()]);
    } catch (err) {
      console.warn('PortalDetail: failed to load:', err);
    }
    setLoading(false);
    setRefreshing(false);
  }, [fetchPlayer, fetchClaims]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const handleClaimCreated = () => {
    fetchAll();
  };

  const handleOpenClaim = () => {
    if (!session) {
      router.push('/(auth)/login' as never);
      return;
    }
    setClaimModalVisible(true);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!player) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: dark }]}>Back</Text>
        </Pressable>
        <EmptyState title="Player not found" />
      </View>
    );
  }

  const statusStyle = getStatusStyle(player.status, colors);
  const accentColor = player.previous_school?.primary_color ?? colors.crimson;

  const physicals: string[] = [];
  if (player.height) physicals.push(player.height);
  if (player.weight) physicals.push(`${player.weight} lbs`);
  if (player.class_year) physicals.push(player.class_year);

  const renderClaim = ({ item }: { item: ClaimData }) => (
    <View style={styles.claimCard}>
      <View style={styles.claimHeader}>
        <Avatar
          url={item.user?.avatar_url}
          name={item.user?.display_name ?? item.user?.username}
          size={32}
        />
        <View style={styles.claimAuthor}>
          <Text style={styles.claimAuthorName}>
            {item.user?.display_name ?? item.user?.username ?? 'Unknown'}
          </Text>
          {item.school && (
            <SchoolBadge
              abbreviation={item.school.abbreviation}
              color={item.school.primary_color}
              slug={item.school.slug}
              small
            />
          )}
        </View>
        {item.confidence !== null && (
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{item.confidence}/10</Text>
          </View>
        )}
      </View>
      {item.reasoning && (
        <Text style={styles.claimReasoning}>{item.reasoning}</Text>
      )}
      {item.is_correct !== null && (
        <View
          style={[
            styles.correctBadge,
            {
              backgroundColor: item.is_correct
                ? `${colors.success}20`
                : `${colors.error}20`,
            },
          ]}
        >
          <Text
            style={[
              styles.correctText,
              { color: item.is_correct ? colors.success : colors.error },
            ]}
          >
            {item.is_correct ? 'CORRECT' : 'INCORRECT'}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={[styles.backText, { color: dark }]}>Back</Text>
            </Pressable>

            {/* Player info card */}
            <View style={styles.playerCard}>
              <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
              <View style={styles.playerBody}>
                {/* Name and status */}
                <View style={styles.headerRow}>
                  <View style={styles.nameSection}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.position}>{player.position}</Text>
                      {player.star_rating && player.star_rating > 0 && (
                        <Text style={styles.stars}>{renderStars(player.star_rating)}</Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {getStatusLabel(player.status)}
                    </Text>
                  </View>
                </View>

                {/* Physicals */}
                {physicals.length > 0 && (
                  <Text style={styles.physicals}>{physicals.join(' / ')}</Text>
                )}

                {/* Schools */}
                <View style={styles.schoolsRow}>
                  {player.previous_school && (
                    <View style={styles.schoolInfoBlock}>
                      <Text style={styles.schoolLabel}>FROM</Text>
                      <View style={styles.schoolDetail}>
                        <SchoolBadge
                          abbreviation={player.previous_school.abbreviation}
                          color={player.previous_school.primary_color}
                          slug={player.previous_school.slug}
                        />
                        <Text style={styles.schoolName}>{player.previous_school.name}</Text>
                      </View>
                    </View>
                  )}
                  {player.committed_school && (
                    <View style={styles.schoolInfoBlock}>
                      <Text style={styles.schoolLabel}>COMMITTED TO</Text>
                      <View style={styles.schoolDetail}>
                        <SchoolBadge
                          abbreviation={player.committed_school.abbreviation}
                          color={player.committed_school.primary_color}
                          slug={player.committed_school.slug}
                        />
                        <Text style={styles.schoolName}>{player.committed_school.name}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Portal entry date */}
                {player.entered_portal_at && (
                  <Text style={styles.portalDate}>
                    Entered portal:{' '}
                    {new Date(player.entered_portal_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                )}

                {/* Claim button */}
                {player.status === 'IN_PORTAL' && (
                  <Pressable
                    style={[styles.claimBtn, { backgroundColor: accentColor }]}
                    onPress={handleOpenClaim}
                  >
                    <Text style={styles.claimBtnText}>Claim Source</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* School Interest Bar */}
            <View style={styles.interestSection}>
              <SchoolInterestBar interests={interests} totalClaims={claims.length} />
            </View>

            {/* Claims header */}
            {claims.length > 0 && (
              <Text style={styles.claimsHeader}>
                CLAIMS ({claims.length})
              </Text>
            )}
          </View>
        }
        data={claims}
        keyExtractor={(item) => item.id}
        renderItem={renderClaim}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={dark}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No claims yet"
            subtitle="Be the first to claim a source for this player."
          />
        }
      />

      <ClaimModal
        visible={claimModalVisible}
        playerId={player.id}
        playerName={player.name}
        onClose={() => setClaimModalVisible(false)}
        onCreated={handleClaimCreated}
      />
    </View>
  );
}
