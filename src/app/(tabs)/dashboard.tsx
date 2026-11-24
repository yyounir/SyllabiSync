import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useIsDesktop } from '@/hooks/useResponsive';
import { classService } from '@/services/class.service';
import { academicItemService } from '@/services/academic-item.service';
import { ClassItem, AcademicItem, AcademicItemStatus } from '@/types/database';
import { StatCard } from '@/components/dashboard/StatCard';
import { ClassCard } from '@/components/classes/ClassCard';
import { TaskItem } from '@/components/assignments/TaskItem';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius, MaxContentWidth } from '@/constants/theme';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  GraduationCap,
  Plus,
  Upload,
} from 'lucide-react-native';

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const isDesktop = useIsDesktop();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [items, setItems] = useState<AcademicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    const effectiveUserId = user?.id || 'guest_student';
    try {
      const [classRes, itemsRes] = await Promise.all([
        classService.getClasses(effectiveUserId),
        academicItemService.getItems(effectiveUserId),
      ]);

      if (classRes.data) setClasses(classRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleToggleTaskStatus = async (itemId: string, currentStatus: AcademicItemStatus) => {
    // Optimistic update
    const nextStatus: AcademicItemStatus =
      currentStatus === 'completed' ? 'pending' : 'completed';
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: nextStatus } : i))
    );

    await academicItemService.toggleStatus(itemId, currentStatus);
    loadDashboardData();
  };

  // Calculations
  const totalClasses = classes.length;
  const completedItems = items.filter((i) => i.status === 'completed').length;
  const pendingItems = items.filter((i) => i.status !== 'completed');
  const upcomingExams = pendingItems.filter(
    (i) => i.type === 'exam' || i.type === 'quiz'
  ).length;
  const completionRate =
    items.length > 0 ? Math.round((completedItems / items.length) * 100) : 0;

  // Upcoming deadlines (next 6 incomplete)
  const upcomingDeadlines = pendingItems.slice(0, 6);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={[styles.innerContent, isDesktop && styles.desktopContent]}>
        {/* Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, {profile?.full_name || user?.email?.split('@')[0] || 'Student'} 👋
            </Text>
            <Text style={styles.semesterSubtitle}>
              Fall 2026 Semester • SyllabiSync Dashboard
            </Text>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.actionButtonGroup}>
            <Button
              title="Upload Syllabus"
              icon={<Upload size={16} color="#FFFFFF" />}
              onPress={() => router.push('/classes/upload-syllabus')}
              style={styles.primaryAction}
            />
            <Button
              title="New Class"
              variant="outline"
              icon={<Plus size={16} color={Colors.light.text} />}
              onPress={() => router.push('/classes/create')}
            />
          </View>
        </View>

        {/* Top Statistics Cards */}
        <View style={styles.statsRow}>
          <StatCard
            title="Enrolled Classes"
            value={totalClasses}
            subtitle={totalClasses === 1 ? '1 active course' : `${totalClasses} active courses`}
            icon={<BookOpen size={20} color={Colors.light.primary} />}
            iconBgColor={Colors.light.primaryLight}
          />
          <StatCard
            title="Tasks Due"
            value={pendingItems.length}
            subtitle="Assignments pending"
            icon={<Clock size={20} color="#F59E0B" />}
            iconBgColor="#FEF3C7"
          />
          <StatCard
            title="Exams & Quizzes"
            value={upcomingExams}
            subtitle="Upcoming tests"
            icon={<GraduationCap size={20} color="#EF4444" />}
            iconBgColor="#FEE2E2"
          />
          <StatCard
            title="Completion Rate"
            value={`${completionRate}%`}
            subtitle={`${completedItems} of ${items.length} completed`}
            icon={<CheckCircle size={20} color="#22C55E" />}
            iconBgColor="#DCFCE7"
          />
        </View>

        {/* My Classes Section */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>My Classes</Text>
            <Text style={styles.sectionSubtitle}>
              Interactive course dashboards synced with your syllabi
            </Text>
          </View>
          {classes.length > 0 && (
            <Button
              title="Add Class"
              variant="ghost"
              size="sm"
              icon={<Plus size={14} color={Colors.light.primary} />}
              onPress={() => router.push('/classes/create')}
            />
          )}
        </View>

        {classes.length === 0 && !loading ? (
          <EmptyState
            icon={<Upload size={32} color={Colors.light.primary} />}
            title="No courses added yet"
            description="Upload your first course syllabus PDF. SyllabiSync will automatically extract assignments, exam dates, grading policies, and build your dashboard in seconds."
            actionTitle="Upload Syllabus PDF"
            onAction={() => router.push('/classes/upload-syllabus')}
          />
        ) : (
          <View style={styles.classesGrid}>
            {classes.map((c) => (
              <ClassCard key={c.id} classItem={c} items={items} />
            ))}
          </View>
        )}

        {/* Upcoming Academic Deadlines Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: Spacing.six }]}>
          <View>
            <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
            <Text style={styles.sectionSubtitle}>
              Chronological schedule across all your courses
            </Text>
          </View>
          <Button
            title="View Calendar"
            variant="ghost"
            size="sm"
            icon={<Calendar size={14} color={Colors.light.primary} />}
            onPress={() => router.push('/(tabs)/calendar')}
          />
        </View>

        {upcomingDeadlines.length === 0 && !loading ? (
          <View style={styles.emptyTasksBox}>
            <CheckCircle size={24} color={Colors.light.success} />
            <Text style={styles.emptyTasksText}>
              No upcoming deadlines pending! Great job staying ahead.
            </Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {upcomingDeadlines.map((item) => (
              <TaskItem
                key={item.id}
                item={item}
                onToggleStatus={handleToggleTaskStatus}
                onPress={() => router.push(`/classes/${item.class_id}` as any)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    padding: Spacing.four,
    paddingBottom: Spacing.eight,
    alignItems: 'center',
  },
  innerContent: {
    width: '100%',
  },
  desktopContent: {
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.five,
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  greeting: {
    ...Typography['2xl'],
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.6,
  },
  semesterSubtitle: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  primaryAction: {
    backgroundColor: Colors.light.primary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.six,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    ...Typography.lg,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  classesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  tasksList: {
    gap: Spacing.one,
  },
  emptyTasksBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.light.card,
    padding: Spacing.four,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  emptyTasksText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
});
