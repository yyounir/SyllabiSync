import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { AcademicItem, AcademicItemStatus } from '@/types/database';
import { TypeBadge } from '@/components/common/Badge';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { format, isPast, isToday, parseISO } from 'date-fns';

interface TaskItemProps {
  item: AcademicItem;
  onToggleStatus: (id: string, currentStatus: AcademicItemStatus) => void;
  onPress?: (item: AcademicItem) => void;
}

export function TaskItem({ item, onToggleStatus, onPress }: TaskItemProps) {
  const isCompleted = item.status === 'completed';

  // Due date formatting
  let dateText = 'No deadline';
  let isOverdue = false;
  let isDueToday = false;

  if (item.due_date) {
    try {
      const parsed = parseISO(item.due_date);
      if (isToday(parsed)) {
        isDueToday = true;
        dateText = `Today, ${format(parsed, 'h:mm a')}`;
      } else {
        isOverdue = isPast(parsed) && !isCompleted;
        dateText = format(parsed, 'EEE, MMM d');
      }
    } catch {
      dateText = item.original_date_text || 'Date set';
    }
  } else if (item.original_date_text) {
    dateText = item.original_date_text;
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        isCompleted && styles.completedContainer,
        pressed && styles.pressed,
      ]}
      onPress={() => onPress?.(item)}>
      {/* Checkbox */}
      <Pressable
        hitSlop={8}
        onPress={() => onToggleStatus(item.id, item.status)}
        style={styles.checkbox}>
        {isCompleted ? (
          <CheckCircle2 size={20} color={Colors.light.success} />
        ) : (
          <Circle size={20} color={Colors.light.textMuted} />
        )}
      </Pressable>

      {/* Main Details */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, isCompleted && styles.completedTitle]}
            numberOfLines={1}>
            {item.title}
          </Text>
          {item.confidence && item.confidence >= 0.8 && (
            <View style={styles.aiTag}>
              <Sparkles size={11} color={Colors.light.primary} />
            </View>
          )}
        </View>

        {/* Metadata row */}
        <View style={styles.metaRow}>
          {item.course_code && (
            <View
              style={[
                styles.classPill,
                { backgroundColor: `${item.course_color || Colors.light.primary}15` },
              ]}>
              <Text
                style={[
                  styles.classPillText,
                  { color: item.course_color || Colors.light.primary },
                ]}>
                {item.course_code}
              </Text>
            </View>
          )}

          <TypeBadge type={item.type} />

          {/* Date info */}
          <View style={styles.dateRow}>
            {isOverdue ? (
              <Clock size={12} color={Colors.light.danger} />
            ) : (
              <Calendar size={12} color={Colors.light.textMuted} />
            )}
            <Text
              style={[
                styles.dateText,
                isOverdue && styles.overdueText,
                isDueToday && styles.dueTodayText,
              ]}>
              {dateText}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.two,
  },
  completedContainer: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.75,
  },
  checkbox: {
    marginRight: Spacing.three,
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...Typography.base,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.light.textSecondary,
  },
  aiTag: {
    padding: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
    flexWrap: 'wrap',
  },
  classPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  classPillText: {
    ...Typography.xs,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  overdueText: {
    color: Colors.light.danger,
    fontWeight: '600',
  },
  dueTodayText: {
    color: Colors.light.warning,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.9,
  },
});
