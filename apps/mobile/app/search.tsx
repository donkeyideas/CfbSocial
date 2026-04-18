import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EmptyState } from '@/components/ui/EmptyState';
import { PostCard, type PostData } from '@/components/posts/PostCard';
import { Avatar } from '@/components/ui/Avatar';
import { Ionicons } from '@expo/vector-icons';

type SearchTab = 'posts' | 'users' | 'schools';

interface ProfileResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  dynasty_tier: string | null;
  school_id: string | null;
  school?: {
    abbreviation: string;
    primary_color: string;
    slug: string | null;
  } | null;
}

interface SchoolResult {
  id: string;
  name: string;
  abbreviation: string;
  mascot: string | null;
  slug: string;
  primary_color: string | null;
}

const TABS: { key: SearchTab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'users', label: 'Users' },
  { key: 'schools', label: 'Schools' },
];

export default function SearchScreen() {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('posts');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [users, setUsers] = useState<ProfileResult[]>([]);
  const [schools, setSchools] = useState<SchoolResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    inputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 40,
    },
    input: {
      flex: 1,
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textPrimary,
      marginLeft: 8,
      paddingVertical: 0,
    },
    clearButton: {
      padding: 4,
    },
    tabRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.textMuted,
    },
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      padding: 12,
      gap: 10,
      paddingBottom: 40,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      gap: 12,
    },
    userInfo: {
      flex: 1,
    },
    username: {
      fontFamily: typography.sansSemiBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    displayName: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 1,
    },
    schoolBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    schoolBadgeText: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    schoolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      gap: 12,
    },
    schoolColorDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    schoolAbbr: {
      fontFamily: typography.sansBold,
      fontSize: 11,
      color: '#ffffff',
    },
    schoolInfo: {
      flex: 1,
    },
    schoolName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    schoolMascot: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 1,
    },
    promptContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    promptText: {
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
    },
  }), [colors]);

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const performSearch = useCallback(async (term: string, tab: SearchTab) => {
    if (term.trim().length < 2) {
      setPosts([]);
      setUsers([]);
      setSchools([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const searchTerm = `%${term.trim()}%`;

    try {
      if (tab === 'posts') {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:author_id (
              id,
              username,
              display_name,
              avatar_url,
              school_id,
              dynasty_tier,
              school:schools!profiles_school_id_fkey(abbreviation, primary_color, secondary_color, slug)
            ),
            school:school_id (
              id,
              name,
              abbreviation,
              slug,
              primary_color,
              logo_url
            )
          `)
          .eq('status', 'PUBLISHED')
          .is('parent_id', null)
          .ilike('content', searchTerm)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && data) {
          setPosts(data as unknown as PostData[]);
        }
      } else if (tab === 'users') {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            display_name,
            avatar_url,
            dynasty_tier,
            school_id,
            school:schools!profiles_school_id_fkey(abbreviation, primary_color, secondary_color, slug)
          `)
          .eq('status', 'ACTIVE')
          .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
          .order('follower_count', { ascending: false })
          .limit(30);

        if (!error && data) {
          setUsers(data as unknown as ProfileResult[]);
        }
      } else if (tab === 'schools') {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name, abbreviation, mascot, slug, primary_color')
          .eq('is_active', true)
          .or(`name.ilike.${searchTerm},abbreviation.ilike.${searchTerm},mascot.ilike.${searchTerm}`)
          .order('name')
          .limit(30);

        if (!error && data) {
          setSchools(data as SchoolResult[]);
        }
      }
    } catch {
      // Silently handle search errors
    }

    setLoading(false);
  }, []);

  // Debounced search whenever query or tab changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setPosts([]);
      setUsers([]);
      setSchools([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      performSearch(query, activeTab);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeTab, performSearch]);

  const handleClear = () => {
    setQuery('');
    setPosts([]);
    setUsers([]);
    setSchools([]);
    inputRef.current?.focus();
  };

  const renderPostItem = useCallback(
    ({ item }: { item: PostData }) => <PostCard post={item} />,
    []
  );

  const renderUserItem = useCallback(
    ({ item }: { item: ProfileResult }) => (
      <Pressable
        style={styles.userRow}
        onPress={() => item.username && router.push(`/profile/${item.username}` as never)}
      >
        <Avatar url={item.avatar_url} name={item.display_name || item.username} size={40} />
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{item.username}</Text>
          {item.display_name && (
            <Text style={styles.displayName}>{item.display_name}</Text>
          )}
        </View>
        {item.school && (
          <View style={[styles.schoolBadge, { backgroundColor: item.school.primary_color || dark }]}>
            <Text style={styles.schoolBadgeText}>{item.school.abbreviation}</Text>
          </View>
        )}
      </Pressable>
    ),
    [styles, dark, router]
  );

  const renderSchoolItem = useCallback(
    ({ item }: { item: SchoolResult }) => (
      <Pressable
        style={styles.schoolRow}
        onPress={() => router.push(`/school/${item.slug}` as never)}
      >
        <View style={[styles.schoolColorDot, { backgroundColor: item.primary_color || dark }]}>
          <Text style={styles.schoolAbbr}>{item.abbreviation}</Text>
        </View>
        <View style={styles.schoolInfo}>
          <Text style={styles.schoolName}>{item.name}</Text>
          {item.mascot && (
            <Text style={styles.schoolMascot}>{item.mascot}</Text>
          )}
        </View>
      </Pressable>
    ),
    [styles, dark, router]
  );

  const hasSearched = query.trim().length >= 2;
  const currentData = activeTab === 'posts' ? posts : activeTab === 'users' ? users : schools;
  const currentRenderItem =
    activeTab === 'posts'
      ? renderPostItem
      : activeTab === 'users'
      ? renderUserItem
      : renderSchoolItem;

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="Search" />

      {/* Search input */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search posts, users, schools..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} style={styles.clearButton} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tab pills */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && { borderBottomColor: dark }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && { color: colors.textPrimary },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Results */}
      {!hasSearched ? (
        <View style={styles.promptContainer}>
          <Text style={styles.promptText}>
            Enter at least 2 characters to search.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={dark} />
        </View>
      ) : (
        <FlatList
          data={currentData as any[]}
          keyExtractor={(item) => item.id}
          renderItem={currentRenderItem as any}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          initialNumToRender={6}
          windowSize={5}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No results found"
              subtitle={`No ${activeTab} matching "${query}".`}
            />
          }
        />
      )}
    </View>
  );
}
