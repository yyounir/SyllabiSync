import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { AcademicItemType, AcademicItemStatus, AcademicItemPriority } from '@/types/database';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline'
  | 'custom';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  color?: string; // custom background or accent color
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', color, size = 'sm', style }: BadgeProps) {
  const getColors = (): { bg: string; text: string; border?: string } => {
    if (color) {
      return {
        bg: `${color}18`, // 10% opacity
        text: color,
        border: `${color}40`,
      };
    }

    switch (variant) {
      case 'primary':
        return { bg: Colors.light.primaryLight, text: Colors.light.primary };
      case 'success':
        return { bg: Colors.light.successLight, text: Colors.light.success };
      case 'warning':
        return { bg: Colors.light.warningLight, text: Colors.light.warning };
      case 'danger':
        return { bg: Colors.light.dangerLight, text: Colors.light.danger };
      case 'outline':
        return {
          bg: 'transparent',
          text: Colors.light.textSecondary,
          border: Colors.light.border,
        };
      case 'default':
      default:
        return { bg: Colors.light.backgroundElement, text: Colors.light.textSecondary };
    }
  };

  const scheme = getColors();

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: scheme.bg },
        scheme.border ? { borderWidth: 1, borderColor: scheme.border } : null,
        style,
      ]}>
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: scheme.text },
        ]}>
        {label}
      </Text>
    </View>
  );
}

export function TypeBadge({ type }: { type: AcademicItemType }) {
  const map: Record<AcademicItemType, { label: string; color: string }> = {
    assignment: { label: 'Assignment', color: '#6366F1' },
    exam: { label: 'Exam', color: '#EF4444' },
    quiz: { label: 'Quiz', color: '#F59E0B' },
    project: { label: 'Project', color: '#8B5CF6' },
    reading: { label: 'Reading', color: '#0EA5E9' },
    other: { label: 'Event', color: '#64748B' },
  };

  const config = map[type] || map.other;
  return <Badge label={config.label} color={config.color} />;
}

export function StatusBadge({ status }: { status: AcademicItemStatus }) {
  const map: Record<AcademicItemStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'To Do', variant: 'outline' },
    in_progress: { label: 'In Progress', variant: 'warning' },
    completed: { label: 'Completed', variant: 'success' },
  };

  const config = map[status] || map.pending;
  return <Badge label={config.label} variant={config.variant} />;
}

export function PriorityBadge({ priority }: { priority: AcademicItemPriority }) {
  const map: Record<AcademicItemPriority, { label: string; variant: BadgeVariant }> = {
    low: { label: 'Low', variant: 'default' },
    medium: { label: 'Medium', variant: 'primary' },
    high: { label: 'High', variant: 'danger' },
  };

  const config = map[priority] || map.medium;
  return <Badge label={config.label} variant={config.variant} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.two,
  },
  md: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  textSm: {
    ...Typography.xs,
  },
  textMd: {
    ...Typography.sm,
  },
});
