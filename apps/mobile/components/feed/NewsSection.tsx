import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColors } from '@/lib/theme/ThemeProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { WEB_API_URL } from '@/lib/constants';
import { NewsModal, type NewsArticle } from './NewsModal';

type NewsTab = 'trending' | 'recruiting' | 'portal';

export function NewsSection() {
  const colors = useColors();
  const { dark, accent } = useSchoolTheme();
  const [activeTab, setActiveTab] = useState<NewsTab>('trending');
  const [trending, setTrending] = useState<NewsArticle[]>([]);
  const [recruiting, setRecruiting] = useState<NewsArticle[]>([]);
  const [portal, setPortal] = useState<NewsArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${WEB_API_URL}/api/news-feeds`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.trending?.length > 0) setTrending(data.trending);
          if (data.recruiting?.length > 0) setRecruiting(data.recruiting);
          if (data.portal?.length > 0) setPortal(data.portal);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

    return () => controller.abort();
  }, []);

  const articles =
    activeTab === 'trending'
      ? trending
      : activeTab === 'recruiting'
        ? recruiting
        : portal;

  const handlePress = useCallback((article: NewsArticle) => {
    setSelectedArticle(article);
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginHorizontal: 12,
          marginVertical: 8,
          borderRadius: 6,
          borderWidth: 2,
          overflow: 'hidden',
          backgroundColor: colors.surfaceRaised,
        },
        header: {
          paddingVertical: 10,
          paddingHorizontal: 14,
          alignItems: 'center',
        },
        headerText: {
          fontFamily: typography.mono,
          fontSize: 13,
          letterSpacing: 3,
        },
        tabs: {
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        tab: {
          flex: 1,
          paddingVertical: 8,
          alignItems: 'center',
        },
        tabText: {
          fontFamily: typography.sansSemiBold,
          fontSize: 12,
          letterSpacing: 0.5,
        },
        tabActive: {
          borderBottomWidth: 2,
        },
        body: {
          padding: 12,
        },
        articleRow: {
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        articleRowLast: {
          borderBottomWidth: 0,
        },
        articleNumber: {
          fontFamily: typography.serifBold,
          fontSize: 14,
          color: colors.crimson,
          marginRight: 6,
        },
        articleHeadline: {
          fontFamily: typography.serif,
          fontSize: 14,
          color: colors.ink,
          lineHeight: 19,
        },
        articleMeta: {
          fontFamily: typography.sans,
          fontSize: 11,
          color: colors.textMuted,
          marginTop: 3,
        },
        emptyText: {
          fontFamily: typography.sans,
          fontSize: 13,
          color: colors.textMuted,
          textAlign: 'center',
          paddingVertical: 16,
        },
      }),
    [colors]
  );

  // Don't render if no news loaded
  if (loaded && trending.length === 0 && recruiting.length === 0 && portal.length === 0) {
    return null;
  }

  const tabs: { key: NewsTab; label: string }[] = [
    { key: 'trending', label: 'TRENDING' },
    { key: 'recruiting', label: 'RECRUITING' },
    { key: 'portal', label: 'PORTAL' },
  ];

  return (
    <>
      <View style={[styles.container, { borderColor: dark }]}>
        <View style={[styles.header, { backgroundColor: dark }]}>
          <Text style={[styles.headerText, { color: accent }]}>PRESS BOX</Text>
        </View>

        <View style={styles.tabs}>
          {tabs.map((t) => (
            <Pressable
              key={t.key}
              style={[
                styles.tab,
                activeTab === t.key && styles.tabActive,
                activeTab === t.key && { borderBottomColor: dark },
              ]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === t.key ? dark : colors.textMuted },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.body}>
          {articles.length > 0 ? (
            articles.slice(0, 5).map((article, i) => {
              const dateLabel = article.published
                ? new Date(article.published).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : '';
              return (
                <Pressable
                  key={article.id}
                  style={[
                    styles.articleRow,
                    i === Math.min(articles.length, 5) - 1 && styles.articleRowLast,
                  ]}
                  onPress={() => handlePress(article)}
                >
                  <Text style={styles.articleHeadline}>
                    <Text style={styles.articleNumber}>{i + 1}. </Text>
                    {article.headline.length > 80
                      ? article.headline.slice(0, 80) + '...'
                      : article.headline}
                  </Text>
                  <Text style={styles.articleMeta}>
                    {article.source}
                    {dateLabel ? ` · ${dateLabel}` : ''}
                    {article.byline ? ` · ${article.byline}` : ''}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.emptyText}>
              {loaded ? 'No stories available' : 'Loading stories...'}
            </Text>
          )}
        </View>
      </View>

      <NewsModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </>
  );
}
