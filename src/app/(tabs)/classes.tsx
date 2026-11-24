import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Pressable,
  Modal,
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
import { Card } from '@/components/common/Card';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { BookOpen, Plus, Search, Trash2, Upload } from 'lucide-react-native';

type FilterTab = 'active' | 'archived' | 'all';

export default function ClassesScreen() {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [items, setItems] = useState<AcademicItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Deletion modal state
  const [classToDelete, setClassToDelete] = useState<ClassItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleArchiveToggle = async (classItem: ClassItem) => {
    const nextArchived = !classItem.is_archived;
    setClasses((prev) =>
      prev.map((c) => (c.id === classItem.id ? { ...c, is_archived: nextArchived } : c))
    );
    await classService.archiveClass(classItem.id, nextArchived);
  };

  const handleDeleteRequest = (classItem: ClassItem) => {
    setClassToDelete(classItem);
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    setDeleting(true);
    try {
      await classService.deleteClass(classToDelete.id);
      setClasses((prev) => prev.filter((c) => c.id !== classToDelete.id));
      setItems((prev) => prev.filter((i) => i.class_id !== classToDelete.id));
      setClassToDelete(null);
    } catch (err) {
      console.error('Error deleting class:', err);
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = classes.filter((c) => !c.is_archived).length;
  const archivedCount = classes.filter((c) => c.is_archived).length;
  const allCount = classes.length;

  const filteredClasses = classes.filter((c) => {
    // Tab filter
    if (filterTab === 'active' && c.is_archived) return false;
    if (filterTab === 'archived' && !c.is_archived) return false;

    // Search query filter
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      c.course_name.toLowerCase().includes(query) ||
      c.course_code.toLowerCase().includes(query) ||
      (c.professor_name && c.professor_name.toLowerCase().includes(query))
    );
  });

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

        {/* Tab Filters (Active / Archived / All) */}
        {classes.length > 0 && (
          <View style={styles.filterTabsRow}>
            <Pressable
              onPress={() => setFilterTab('active')}
              style={[
                styles.filterTab,
                filterTab === 'active' && styles.filterTabActive,
              ]}>
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'active' && styles.filterTabTextActive,
                ]}>
                Active ({activeCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFilterTab('archived')}
              style={[
                styles.filterTab,
                filterTab === 'archived' && styles.filterTabActive,
              ]}>
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'archived' && styles.filterTabTextActive,
                ]}>
                Archived ({archivedCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFilterTab('all')}
              style={[
                styles.filterTab,
                filterTab === 'all' && styles.filterTabActive,
              ]}>
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'all' && styles.filterTabTextActive,
                ]}>
                All Classes ({allCount})
              </Text>
            </Pressable>
          </View>
        )}

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
            <Text style={styles.noMatchText}>
              {searchQuery
                ? `No courses match "${searchQuery}"`
                : filterTab === 'archived'
                ? 'No archived classes yet. You can archive completed courses to keep your active semester organized.'
                : 'No active courses found.'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredClasses.map((c) => (
              <ClassCard
                key={c.id}
                classItem={c}
                items={items}
                onArchiveToggle={handleArchiveToggle}
                onDelete={handleDeleteRequest}
              />
            ))}
          </View>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          visible={!!classToDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setClassToDelete(null)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.dangerIconBadge}>
                <Trash2 size={24} color={Colors.light.danger} />
              </View>
              <Text style={styles.modalTitle}>
                Delete {classToDelete?.course_code}?
              </Text>
              <Text style={styles.modalDesc}>
                This will permanently delete &ldquo;{classToDelete?.course_name}&rdquo; and all associated tasks, exams, and notes. This action cannot be undone.
              </Text>
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setClassToDelete(null)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Delete Class"
                  variant="danger"
                  loading={deleting}
                  onPress={handleConfirmDelete}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        </Modal>
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
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.three,
    alignSelf: 'flex-start',
    gap: 4,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.sm,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabText: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
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
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  noMatchText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: Spacing.five,
  },
  dangerIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.light.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  modalTitle: {
    ...Typography.lg,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  modalDesc: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.five,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
  },
});
