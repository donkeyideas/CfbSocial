import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

export interface PortalFilterState {
  status: string;
  position: string;
  stars: string;
}

interface PortalFiltersProps {
  filters: PortalFilterState;
  onFilterChange: (filters: PortalFilterState) => void;
}

const STATUS_OPTIONS = ['All', 'In Portal', 'Committed', 'Withdrawn'];
const POSITION_OPTIONS = ['All', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
const STAR_OPTIONS = ['All', '5-star', '4-star', '3-star'];

function statusToDb(label: string): string {
  switch (label) {
    case 'In Portal': return 'IN_PORTAL';
    case 'Committed': return 'COMMITTED';
    case 'Withdrawn': return 'WITHDRAWN';
    default: return 'All';
  }
}

function starToDb(label: string): string {
  switch (label) {
    case '5-star': return '5';
    case '4-star': return '4';
    case '3-star': return '3';
    default: return 'All';
  }
}

export function PortalFilters({ filters, onFilterChange }: PortalFiltersProps) {
  const colors = useColors();
  const { dark } = useSchoolTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      paddingVertical: 4,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    filterLabel: {
      fontFamily: typography.mono,
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      width: 56,
    },
    pills: {
      gap: 6,
      paddingRight: 12,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
    },
    pillText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 11,
    },
  }), [colors]);

  const renderRow = (
    label: string,
    options: string[],
    current: string,
    onChange: (val: string) => void
  ) => (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
      >
        {options.map((opt) => {
          const isActive = current === opt;
          return (
            <Pressable
              key={opt}
              style={[
                styles.pill,
                isActive
                  ? { backgroundColor: dark }
                  : { borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => onChange(opt)}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: isActive ? '#f4efe4' : colors.textSecondary },
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderRow('Status', STATUS_OPTIONS, filters.status, (val) =>
        onFilterChange({ ...filters, status: val })
      )}
      {renderRow('Position', POSITION_OPTIONS, filters.position, (val) =>
        onFilterChange({ ...filters, position: val })
      )}
      {renderRow('Rating', STAR_OPTIONS, filters.stars, (val) =>
        onFilterChange({ ...filters, stars: val })
      )}
    </View>
  );
}

// Export helpers for the parent screen to use
export { statusToDb, starToDb };
