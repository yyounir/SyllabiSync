import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/theme';

interface ProgressBarProps {
  progress: number; // 0 to 1 or 0 to 100
  color?: string;
  height?: number;
  showLabel?: boolean;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = Colors.light.primary,
  height = 8,
  showLabel = false,
  style,
}: ProgressBarProps) {
  // Normalize to 0 - 100
  const normalized = Math.min(Math.max(progress > 1 ? progress : progress * 100, 0), 100);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${normalized}%`,
              backgroundColor: color,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.label}>{Math.round(normalized)}% complete</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    width: '100%',
    backgroundColor: Colors.light.backgroundElement,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  label: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
    fontWeight: '500',
  },
});
