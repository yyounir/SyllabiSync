import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useIsDesktop } from '@/hooks/useResponsive';
import { classService } from '@/services/class.service';
import { academicItemService } from '@/services/academic-item.service';
import { ClassItem, AcademicItem } from '@/types/database';
import { ClassCard } from '@/components/classes/ClassCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { BookOpen, Plus, Search, Upload } from 'lucide-react-native';

export default function ClassesScreen() {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [items, setItems] = useState<AcademicItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClasses = useCallback(async () => {
    const effectiveUserId = user?.id || 'guest_student';
    try {
      const [classRes, itemsRes] = await Promise.all([
        classService.getClasses(effectiveUserId),
        academicItemService.getItems(effectiveUserId),
      ]);

      if (classRes.data) setClasses(classRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
    } catch (err) {
      console.error('Error loading classes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [loadClasses])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadClasses();
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.professor_name &&
        c.professor_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={[styles.innerContent, isDesktop && styles.desktopContent]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Classes</Text>
            <Text style={styles.subtitle}>
              Manage your course dashboards, assignments, and policies
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              title="Upload Syllabus"
              icon={<Upload size={16} color="#FFFFFF" />}
              onPress={() => router.push('/classes/upload-syllabus')}
            />
            <Button
              title="Add Manually"
              variant="outline"
              icon={<Plus size={16} color={Colors.light.text} />}
              onPress={() => router.push('/classes/create')}
            />
          </View>
        </View>

        {/* Search Bar */}
        {classes.length > 0 && (
          <View style={styles.searchContainer}>
            <Search size={18} color={Colors.light.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search classes by name, code, or professor..."
              placeholderTextColor={Colors.light.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        {/* Classes List / Grid */}
        {classes.length === 0 && !loading ? (
          <EmptyState
            icon={<BookOpen size={32} color={Colors.light.primary} />}
            title="No classes created yet"
            description="Create your first class dashboard by uploading a course syllabus PDF or entering details manually."
            actionTitle="Upload Syllabus PDF"
            onAction={() => router.push('/classes/upload-syllabus')}
          />
        ) : filteredClasses.length === 0 ? (
          <View style={styles.noMatchBox}>
            <Text style={styles.noMatchText}>No courses match &ldquo;{searchQuery}&rdquo;</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredClasses.map((c) => (
              <ClassCard key={c.id} classItem={c} items={items} />
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
    marginBottom: Spacing.four,
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  title: {
    ...Typography['2xl'],
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  searchInput: {
    flex: 1,
    ...Typography.sm,
    color: Colors.light.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  noMatchBox: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMatchText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
  },
});
