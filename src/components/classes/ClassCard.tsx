import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { ClassItem, AcademicItem } from '@/types/database';
import { Calendar, CheckCircle2, ChevronRight, User } from 'lucide-react-native';
import { format, isPast, parseISO } from 'date-fns';

interface ClassCardProps {
  classItem: ClassItem;
  items?: AcademicItem[];
}

export function ClassCard({ classItem, items = [] }: ClassCardProps) {
  const classItems = items.filter((i) => i.class_id === classItem.id);
  const completedCount = classItems.filter((i) => i.status === 'completed').length;
  const totalCount = classItems.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const incompleteCount = totalCount - completedCount;

  // Find next upcoming deadline
  const upcomingItems = classItems
    .filter((i) => i.due_date && i.status !== 'completed' && !isPast(parseISO(i.due_date)))
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  const nextDeadline = upcomingItems[0];

  return (
    <Card
      style={styles.card}
      onPress={() => router.push(`/classes/${classItem.id}` as any)}>
      {/* Accent color bar */}
      <View style={[styles.colorBar, { backgroundColor: classItem.color || Colors.light.primary }]} />

      <View style={styles.innerContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.courseBadge}>
            <Text style={[styles.courseCode, { color: classItem.color || Colors.light.primary }]}>
              {classItem.course_code}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.light.textMuted} />
        </View>

        <Text style={styles.courseName} numberOfLines={1}>
          {classItem.course_name}
        </Text>

        {classItem.professor_name && (
          <View style={styles.profRow}>
            <User size={13} color={Colors.light.textMuted} />
            <Text style={styles.profName} numberOfLines={1}>
              {classItem.professor_name}
            </Text>
          </View>
        )}

        {/* Next Deadline or Status */}
        <View style={styles.deadlineContainer}>
          {nextDeadline ? (
            <View style={styles.deadlineToShow}>
              <Calendar size={13} color={Colors.light.primary} />
              <Text style={styles.deadlineLabel} numberOfLines={1}>
                {nextDeadline.title} • {format(parseISO(nextDeadline.due_date!), 'MMM d')}
              </Text>
            </View>
          ) : (
            <View style={styles.noDeadline}>
              <CheckCircle2 size={13} color={Colors.light.success} />
              <Text style={styles.allCaughtUp}>All caught up</Text>
            </View>
          )}
        </View>

        {/* Progress & Incomplete Tasks */}
        <View style={styles.footerSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.tasksRemaining}>
              {incompleteCount} {incompleteCount === 1 ? 'task' : 'tasks'} left
            </Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <ProgressBar
            progress={progress}
            color={classItem.color || Colors.light.primary}
            height={6}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    minWidth: 260,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  colorBar: {
    height: 6,
    width: '100%',
  },
  innerContent: {
    padding: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  courseBadge: {
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  courseCode: {
    ...Typography.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  courseName: {
    ...Typography.md,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  profRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.three,
  },
  profName: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
  },
  deadlineContainer: {
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.three,
  },
  deadlineToShow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadlineLabel: {
    ...Typography.xs,
    color: Colors.light.text,
    fontWeight: '500',
    flex: 1,
  },
  noDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allCaughtUp: {
    ...Typography.xs,
    color: Colors.light.success,
    fontWeight: '600',
  },
  footerSection: {
    marginTop: 'auto',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tasksRemaining: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  progressPercent: {
    ...Typography.xs,
    color: Colors.light.text,
    fontWeight: '700',
  },
});
