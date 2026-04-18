import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useColors } from '@/lib/theme/ThemeProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { AppHeader } from '@/components/navigation/AppHeader';
import { FEATURE_GUIDES, type FeatureItem } from '@/lib/constants/featureGuides';

export default function FeaturesScreen() {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const router = useRouter();

  const styles = useMemo(() => {
    const crimson = '#8b1a1a';
    const gold = '#c9a84c';
    const warmWhite = colors.surfaceRaised;
    const inkFaded = colors.textSecondary;

    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.paper,
      },
      scrollContent: {
        padding: 16,
        paddingBottom: 60,
      },
      sectionTitle: {
        fontFamily: typography.serifBold,
        fontSize: 16,
        color: colors.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        borderBottomWidth: 2,
        borderBottomColor: colors.textPrimary,
        paddingBottom: 6,
        marginBottom: 16,
      },
      // --- Classic (Feed) ---
      cardClassic: {
        backgroundColor: warmWhite,
        borderRadius: 3,
        borderLeftWidth: 4,
        borderLeftColor: crimson,
        padding: 12,
        marginBottom: 12,
        // ticket perforation effect
        borderTopWidth: 1,
        borderTopColor: colors.border,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderRightWidth: 1,
        borderRightColor: colors.border,
      },
      // --- Rivalry ---
      cardRivalry: {
        backgroundColor: warmWhite,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      rivalryHeader: {
        backgroundColor: crimson,
        paddingVertical: 6,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
        fontSize: 14,
        color: '#f4efe4',
      },
      cardBody: {
        padding: 10,
      },
      // --- Prediction ---
      cardPrediction: {
        backgroundColor: warmWhite,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: gold,
      },
      predictionHeader: {
        backgroundColor: colors.surface,
        paddingVertical: 6,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: gold,
      },
      predictionLabel: {
        fontFamily: typography.serifBold,
        fontSize: 13,
        color: gold,
        textTransform: 'uppercase',
        letterSpacing: 1,
      },
      predictionTag: {
        fontFamily: typography.mono,
        fontSize: 10,
        color: '#f4efe4',
        backgroundColor: gold,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
        overflow: 'hidden',
        textTransform: 'uppercase',
      },
      // --- Aging ---
      cardAging: {
        backgroundColor: warmWhite,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      agingHeader: {
        backgroundColor: colors.surface,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      agingLabel: {
        fontFamily: typography.serifBold,
        fontSize: 13,
        color: crimson,
        textTransform: 'uppercase',
        letterSpacing: 1,
      },
      agingQuote: {
        borderLeftWidth: 3,
        borderLeftColor: crimson,
        paddingLeft: 8,
        fontStyle: 'italic',
      },
      // --- Receipt ---
      cardReceipt: {
        backgroundColor: colors.surfaceRaised,
        borderRadius: 2,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
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
        marginTop: 6,
        textTransform: 'uppercase',
        letterSpacing: 1,
      },
      // --- Pressbox (Portal) ---
      cardPressbox: {
        backgroundColor: warmWhite,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      pressboxHeader: {
        backgroundColor: '#2a1f14',
        paddingVertical: 6,
        paddingHorizontal: 12,
      },
      pressboxTitle: {
        fontFamily: typography.mono,
        fontSize: 11,
        color: '#f4efe4',
        textTransform: 'uppercase',
        letterSpacing: 2,
      },
      // --- Penalty (Moderation) ---
      cardPenalty: {
        backgroundColor: colors.surfaceRaised,
        borderRadius: 3,
        borderLeftWidth: 4,
        borderLeftColor: crimson,
        padding: 12,
        marginBottom: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderRightWidth: 1,
        borderRightColor: colors.border,
      },
      penaltyTitle: {
        fontFamily: typography.serifBold,
        fontSize: 13,
        color: crimson,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
      },
      // --- Standard ---
      cardStandard: {
        backgroundColor: warmWhite,
        borderRadius: 3,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: gold,
      },
      // --- Shared ---
      cardName: {
        fontFamily: typography.serifBold,
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: 3,
      },
      cardDesc: {
        fontFamily: typography.sans,
        fontSize: 13,
        color: inkFaded,
        lineHeight: 18,
      },
      tapHint: {
        fontFamily: typography.mono,
        fontSize: 10,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 8,
      },
    });
  }, [colors]);

  function handleNav(index: number) {
    router.push(`/feature-guide?index=${index}` as never);
  }

  function renderCard(feature: FeatureItem, index: number) {
    switch (feature.variant) {
      case 'classic':
        return (
          <Pressable key={feature.title} style={styles.cardClassic} onPress={() => handleNav(index)}>
            <Text style={styles.cardName}>{feature.title}</Text>
            <Text style={styles.cardDesc}>{feature.description}</Text>
            <Text style={styles.tapHint}>Tap to open</Text>
          </Pressable>
        );

      case 'rivalry':
        return (
          <Pressable key={feature.title} style={styles.cardRivalry} onPress={() => handleNav(index)}>
            <View style={styles.rivalryHeader}>
              <Text style={styles.rivalryLabel}>Feature</Text>
              <Text style={styles.rivalryTitle}>{feature.title}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardDesc}>{feature.description}</Text>
              <Text style={styles.tapHint}>Tap to open</Text>
            </View>
          </Pressable>
        );

      case 'prediction':
        return (
          <Pressable key={feature.title} style={styles.cardPrediction} onPress={() => handleNav(index)}>
            <View style={styles.predictionHeader}>
              <Text style={styles.predictionLabel}>{feature.title}</Text>
              <Text style={styles.predictionTag}>Poll</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardDesc}>{feature.description}</Text>
              <Text style={styles.tapHint}>Tap to open</Text>
            </View>
          </Pressable>
        );

      case 'aging':
        return (
          <Pressable key={feature.title} style={styles.cardAging} onPress={() => handleNav(index)}>
            <View style={styles.agingHeader}>
              <Text style={styles.agingLabel}>{feature.title}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardDesc, styles.agingQuote]}>{feature.description}</Text>
              <Text style={styles.tapHint}>Tap to open</Text>
            </View>
          </Pressable>
        );

      case 'receipt':
        return (
          <Pressable key={feature.title} style={styles.cardReceipt} onPress={() => handleNav(index)}>
            <Text style={styles.cardName}>{feature.title}</Text>
            <Text style={styles.cardDesc}>{feature.description}</Text>
            <Text style={styles.receiptStamp}>CONFIRMED</Text>
          </Pressable>
        );

      case 'pressbox':
        return (
          <Pressable key={feature.title} style={styles.cardPressbox} onPress={() => handleNav(index)}>
            <View style={styles.pressboxHeader}>
              <Text style={styles.pressboxTitle}>{feature.title}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardDesc}>{feature.description}</Text>
              <Text style={styles.tapHint}>Tap to open</Text>
            </View>
          </Pressable>
        );

      case 'penalty':
        return (
          <Pressable key={feature.title} style={styles.cardPenalty} onPress={() => handleNav(index)}>
            <Text style={styles.penaltyTitle}>{feature.title}</Text>
            <Text style={styles.cardDesc}>{feature.description}</Text>
            <Text style={styles.tapHint}>Tap to open</Text>
          </Pressable>
        );

      case 'standard':
      default:
        return (
          <Pressable key={feature.title} style={styles.cardStandard} onPress={() => handleNav(index)}>
            <Text style={styles.cardName}>{feature.title}</Text>
            <Text style={styles.cardDesc}>{feature.description}</Text>
            <Text style={styles.tapHint}>Tap to open</Text>
          </Pressable>
        );
    }
  }

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Features</Text>
        {FEATURE_GUIDES.map((feature, index) => renderCard(feature, index))}
      </ScrollView>
    </View>
  );
}
