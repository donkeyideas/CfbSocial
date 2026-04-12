import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useColors } from '@/lib/theme/ThemeProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { WEB_API_URL } from '@/lib/constants';

export interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  imageUrl: string | null;
  articleUrl: string;
  byline: string;
  published: string;
  source: string;
  category: 'recruiting' | 'portal' | 'trending';
}

interface NewsModalProps {
  article: NewsArticle | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = (SCREEN_WIDTH - 32) * 0.56;

export function NewsModal({ article, onClose }: NewsModalProps) {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedImage, setResolvedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!article) return;
    setParagraphs([]);
    setLoading(true);
    setResolvedImage(article.imageUrl);

    if (!article.articleUrl) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    fetch(`${WEB_API_URL}/api/espn-article?url=${encodeURIComponent(article.articleUrl)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.paragraphs?.length > 0) {
          setParagraphs(data.paragraphs);
        }
        if (!article.imageUrl && data?.imageUrl) {
          setResolvedImage(data.imageUrl);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [article]);

  const dateStr = article?.published
    ? new Date(article.published).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          paddingHorizontal: 16,
          paddingVertical: 40,
        },
        modal: {
          backgroundColor: colors.surfaceRaised,
          borderRadius: 8,
          maxHeight: '90%',
          overflow: 'hidden',
        },
        closeBtn: {
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        closeBtnText: {
          fontFamily: typography.sansBold,
          fontSize: 14,
          color: '#fff',
        },
        image: {
          width: '100%',
          height: IMAGE_HEIGHT,
        },
        content: {
          padding: 16,
        },
        headline: {
          fontFamily: typography.serifBold,
          fontSize: 20,
          color: colors.ink,
          lineHeight: 26,
          marginBottom: 8,
        },
        meta: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginBottom: 14,
        },
        metaText: {
          fontFamily: typography.sans,
          fontSize: 13,
          color: colors.textMuted,
        },
        paragraph: {
          fontFamily: typography.sans,
          fontSize: 15,
          color: colors.textPrimary,
          lineHeight: 22,
          marginBottom: 12,
        },
        skeletonBlock: {
          marginBottom: 16,
        },
        skeletonLine: {
          height: 14,
          backgroundColor: colors.border,
          borderRadius: 4,
          marginBottom: 6,
        },
        readMoreBtn: {
          marginTop: 8,
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 6,
          alignItems: 'center',
        },
        readMoreText: {
          fontFamily: typography.sansSemiBold,
          fontSize: 14,
          color: colors.textInverse,
          letterSpacing: 1,
        },
      }),
    [colors]
  );

  if (!article) return null;

  return (
    <Modal
      visible={!!article}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>X</Text>
          </Pressable>

          <ScrollView bounces={false}>
            {resolvedImage && (
              <Image
                source={{ uri: resolvedImage }}
                style={styles.image}
                resizeMode="cover"
              />
            )}

            <View style={styles.content}>
              <Text style={styles.headline}>{article.headline}</Text>

              <View style={styles.meta}>
                {article.source ? (
                  <Text style={styles.metaText}>{article.source}</Text>
                ) : null}
                {article.source && (article.byline || dateStr) ? (
                  <Text style={styles.metaText}> · </Text>
                ) : null}
                {article.byline ? (
                  <Text style={styles.metaText}>{article.byline}</Text>
                ) : null}
                {article.byline && dateStr ? (
                  <Text style={styles.metaText}> · </Text>
                ) : null}
                {dateStr ? (
                  <Text style={styles.metaText}>{dateStr}</Text>
                ) : null}
              </View>

              {loading ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={styles.skeletonBlock}>
                      <View style={[styles.skeletonLine, { width: '100%' }]} />
                      <View style={[styles.skeletonLine, { width: '100%' }]} />
                      <View style={[styles.skeletonLine, { width: '92%' }]} />
                      <View style={[styles.skeletonLine, { width: '78%' }]} />
                    </View>
                  ))}
                </>
              ) : paragraphs.length > 0 ? (
                paragraphs.map((p, i) => (
                  <Text key={i} style={styles.paragraph}>
                    {p}
                  </Text>
                ))
              ) : (
                <Text style={styles.paragraph}>{article.description}</Text>
              )}

              <Pressable
                style={[styles.readMoreBtn, { backgroundColor: dark }]}
                onPress={() => {
                  if (article.articleUrl) {
                    Linking.openURL(article.articleUrl);
                  }
                }}
              >
                <Text style={styles.readMoreText}>
                  READ FULL STORY{article.source ? ` ON ${article.source.toUpperCase()}` : ''}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
