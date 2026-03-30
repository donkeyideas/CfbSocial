export const CHART_COLORS = {
  primary: '#8b1a1a',
  success: '#4a7c59',
  warning: '#b8860b',
  danger: '#c43030',
  info: '#4a6c8c',
  muted: '#9a8c7a',
  purple: '#7c5295',
  cyan: '#2d7d8c',
} as const;

const CHART_CONFIG_DARK = {
  fontFamily: "'Source Sans 3', 'Inter', system-ui, sans-serif",
  fontSize: 12,
  axisColor: '#8a8070',
  gridColor: '#3e3a34',
  tooltipBg: '#262320',
  tooltipBorder: '#3e3a34',
} as const;

const CHART_CONFIG_LIGHT = {
  fontFamily: "'Source Sans 3', 'Inter', system-ui, sans-serif",
  fontSize: 12,
  axisColor: '#9a8c7a',
  gridColor: '#d4c9b5',
  tooltipBg: '#faf7f0',
  tooltipBorder: '#d4c9b5',
} as const;

/** Returns chart config matching the current admin theme */
export function getChartConfig() {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return CHART_CONFIG_DARK;
  }
  return CHART_CONFIG_LIGHT;
}

/** @deprecated Use getChartConfig() for theme-aware charts */
export const CHART_CONFIG = CHART_CONFIG_DARK;

export const SERIES_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.cyan,
  CHART_COLORS.muted,
];
