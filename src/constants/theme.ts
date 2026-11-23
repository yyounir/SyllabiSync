import { Platform } from 'react-native';
import { Colors, CLASS_COLORS, ThemeColors, ThemeType } from './colors';

export { Colors, CLASS_COLORS };
export type { ThemeColors, ThemeType };

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;

export const Typography = {
  xs: { fontSize: 11, lineHeight: 15 },
  sm: { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 22 },
  md: { fontSize: 17, lineHeight: 24 },
  lg: { fontSize: 20, lineHeight: 28 },
  xl: { fontSize: 24, lineHeight: 32 },
  '2xl': { fontSize: 30, lineHeight: 38 },
} as const;

export const Shadows = Platform.select({
  web: {
    sm: {
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    md: {
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    },
    lg: {
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
    },
  },
  default: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
  },
});

export const BottomTabInset = Platform.select({ ios: 60, android: 70 }) ?? 0;
export const MaxContentWidth = 1200;
