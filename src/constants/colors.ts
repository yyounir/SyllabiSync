export const Colors = {
  light: {
    background: '#F8FAFC',
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#E2E8F0',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    primary: '#274f73',
    primaryHover: '#1d3d5a',
    primaryLight: '#EAF1F7',
    secondary: '#3b6d9c',
    success: '#22C55E',
    successLight: '#F0FDF4',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    danger: '#EF4444',
    dangerLight: '#FEF2F2',
  },
  dark: {
    background: '#0B0F19',
    backgroundElement: '#1E293B',
    backgroundSelected: '#334155',
    card: '#161F30',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#273449',
    primary: '#3b74a8',
    primaryHover: '#4e87be',
    primaryLight: '#14283b',
    secondary: '#5c92c4',
    success: '#22C55E',
    successLight: '#052E16',
    warning: '#F59E0B',
    warningLight: '#451A03',
    danger: '#EF4444',
    dangerLight: '#450A0A',
  },
} as const;

export type ThemeType = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;

export const CLASS_COLORS = [
  '#274f73', // Navy Slate
  '#3B82F6', // Blue
  '#0EA5E9', // Sky
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#F97316', // Orange
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#64748B', // Slate
];
