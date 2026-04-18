import { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/lib/theme/ThemeProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { AppHeader } from '@/components/navigation/AppHeader';
import { FEATURE_GUIDES, type FeatureGuide } from '@/lib/constants/featureGuides';

export default function FeatureGuideScreen() {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { index: indexParam } = useLocalSearchParams<{ index: string }>();

  const startIndex = Math.max(0, Math.min(parseInt(indexParam || '0', 10) || 0, FEATURE_GUIDES.length - 1));
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const flatListRef = useRef<FlatList>(null);

  const crimson = '#8b1a1a';
  const gold = '#c9a84c';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    indicatorBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    pageIndicator: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 1,
    },
    page: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    // --- Variant header cards ---
    headerCardClassic: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 4,
      borderLeftWidth: 4,
      borderLeftColor: crimson,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    headerCardRivalry: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 4,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    rivalryHeader: {
      backgroundColor: crimson,
      paddingVertical: 8,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rivalryLabel: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: gold,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    rivalryTitle: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: '#f4efe4',
    },
    headerCardPrediction: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 4,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: gold,
    },
    predictionHeader: {
      backgroundColor: colors.surface,
      paddingVertical: 8,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: gold,
    },
    predictionLabel: {
      fontFamily: typography.serifBold,
      fontSize: 14,
      color: gold,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    predictionTag: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: '#f4efe4',
      backgroundColor: gold,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 2,
      overflow: 'hidden',
      textTransform: 'uppercase',
    },
    headerCardAging: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 4,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    agingHeader: {
      backgroundColor: colors.surface,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    agingLabel: {
      fontFamily: typography.serifBold,
      fontSize: 14,
      color: crimson,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    headerCardReceipt: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 3,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.success,
    },
    receiptStamp: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: '#f4efe4',
      backgroundColor: '#4a7c59',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 2,
      overflow: 'hidden',
      alignSelf: 'flex-start',
      marginTop: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    headerCardPressbox: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 4,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressboxHeader: {
      backgroundColor: '#2a1f14',
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    pressboxTitle: {
      fontFamily: typography.mono,
      fontSize: 12,
      color: '#f4efe4',
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    headerCardPenalty: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 4,
      borderLeftWidth: 4,
      borderLeftColor: crimson,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    penaltyTitle: {
      fontFamily: typography.serifBold,
      fontSize: 14,
      color: crimson,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    headerCardStandard: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 4,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: gold,
    },
    cardBody: {
      padding: 14,
    },
    cardTitle: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    cardDesc: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    // --- Feature detail sections ---
    featureTitle: {
      fontFamily: typography.serifBold,
      fontSize: 26,
      color: colors.textPrimary,
      marginTop: 20,
    },
    tagline: {
      fontFamily: typography.sans,
      fontSize: 15,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: 4,
      marginBottom: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    sectionTitle: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 12,
    },
    stepRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    stepNumber: {
      fontFamily: typography.mono,
      fontSize: 14,
      color: dark,
      minWidth: 18,
    },
    stepText: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
      flex: 1,
    },
    highlightRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    highlightDash: {
      fontFamily: typography.mono,
      fontSize: 14,
      color: dark,
    },
    highlightText: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
      flex: 1,
    },
    exampleCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      padding: 14,
    },
    exampleLabel: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    exampleTitle: {
      fontFamily: typography.serifBold,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    exampleContent: {
      fontFamily: typography.serif,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 21,
      fontStyle: 'italic',
    },
    ctaButton: {
      marginTop: 24,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    ctaText: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: '#f4efe4',
    },
    swipeHint: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 16,
    },
  }), [colors, dark]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setCurrentIndex(idx);
  }, [screenWidth]);

  const getItemLayout = useCallback((_: unknown, index: number) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  }), [screenWidth]);

  function renderVariantHeader(guide: FeatureGuide) {
    switch (guide.variant) {
      case 'classic':
        return (
          <View style={styles.headerCardClassic}>
            <Text style={styles.cardTitle}>{guide.title}</Text>
            <Text style={styles.cardDesc}>{guide.description}</Text>
          </View>
        );
      case 'rivalry':
        return (
          <View style={styles.headerCardRivalry}>
            <View style={styles.rivalryHeader}>
              <Text style={styles.rivalryLabel}>Feature</Text>
              <Text style={styles.rivalryTitle}>{guide.title}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardDesc}>{guide.description}</Text>
            </View>
          </View>
        );
      case 'prediction':
        return (
          <View style={styles.headerCardPrediction}>
            <View style={styles.predictionHeader}>
              <Text style={styles.predictionLabel}>{guide.title}</Text>
              <Text style={styles.predictionTag}>Poll</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardDesc}>{guide.description}</Text>
            </View>
          </View>
        );
      case 'aging':
        return (
          <View style={styles.headerCardAging}>
            <View style={styles.agingHeader}>
              <Text style={styles.agingLabel}>{guide.title}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardDesc}>{guide.description}</Text>
            </View>
          </View>
        );
      case 'receipt':
        return (
          <View style={styles.headerCardReceipt}>
            <Text style={styles.cardTitle}>{guide.title}</Text>
            <Text style={styles.cardDesc}>{guide.description}</Text>
            <Text style={styles.receiptStamp}>Confirmed</Text>
          </View>
        );
      case 'pressbox':
        return (
          <View style={styles.headerCardPressbox}>
            <View style={styles.pressboxHeader}>
              <Text style={styles.pressboxTitle}>{guide.title}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardDesc}>{guide.description}</Text>
            </View>
          </View>
        );
      case 'penalty':
        return (
          <View style={styles.headerCardPenalty}>
            <Text style={styles.penaltyTitle}>{guide.title}</Text>
            <Text style={styles.cardDesc}>{guide.description}</Text>
          </View>
        );
      case 'standard':
      default:
        return (
          <View style={styles.headerCardStandard}>
            <Text style={styles.cardTitle}>{guide.title}</Text>
            <Text style={styles.cardDesc}>{guide.description}</Text>
          </View>
        );
    }
  }

  const renderPage = useCallback(({ item: guide, index }: { item: FeatureGuide; index: number }) => {
    const isLast = index === FEATURE_GUIDES.length - 1;
    const isFirst = index === 0;

    return (
      <View style={[styles.page, { width: screenWidth }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Variant header card */}
          {renderVariantHeader(guide)}

          {/* Title + tagline */}
          <Text style={styles.featureTitle}>{guide.title}</Text>
          <Text style={styles.tagline}>{guide.tagline}</Text>

          {/* How It Works */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>How It Works</Text>
          {guide.howItWorks.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{i + 1}.</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          {/* Highlights */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Highlights</Text>
          {guide.highlights.map((item, i) => (
            <View key={i} style={styles.highlightRow}>
              <Text style={styles.highlightDash}>--</Text>
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}

          {/* Example */}
          <View style={styles.divider} />
          <View style={styles.exampleCard}>
            <Text style={styles.exampleLabel}>Example</Text>
            <Text style={styles.exampleTitle}>{guide.exampleTitle}</Text>
            <Text style={styles.exampleContent}>{guide.exampleContent}</Text>
          </View>

          {/* CTA Button */}
          <Pressable
            style={[styles.ctaButton, { backgroundColor: dark }]}
            onPress={() => router.push(guide.route as never)}
          >
            <Text style={styles.ctaText}>Open {guide.title}</Text>
          </Pressable>

          {/* Swipe hint */}
          {!isLast && !isFirst && (
            <Text style={styles.swipeHint}>Swipe for more</Text>
          )}
          {isFirst && FEATURE_GUIDES.length > 1 && (
            <Text style={styles.swipeHint}>Swipe left for next</Text>
          )}
          {isLast && FEATURE_GUIDES.length > 1 && (
            <Text style={styles.swipeHint}>Swipe right for previous</Text>
          )}
        </ScrollView>
      </View>
    );
  }, [colors, dark, screenWidth, styles, router]);

  return (
    <View style={styles.container}>
      <AppHeader />

      {/* Page indicator bar */}
      <View style={styles.indicatorBar}>
        <Text style={styles.pageIndicator}>
          {currentIndex + 1} of {FEATURE_GUIDES.length}
        </Text>
      </View>

      {/* Horizontal pager */}
      <FlatList
        ref={flatListRef}
        data={FEATURE_GUIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleScrollEnd}
        keyExtractor={(item) => item.title}
        renderItem={renderPage}
      />
    </View>
  );
}
