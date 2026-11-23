import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/common/Card';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = Colors.light.primaryLight,
}: StatCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
          {icon}
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.value}>{value}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 160,
    padding: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...Typography.xl,
    fontWeight: '800',
    color: Colors.light.text,
    marginTop: 2,
  },
  subtitle: {
    ...Typography.xs,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
});
