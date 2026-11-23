import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Pressable,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { classService } from '@/services/class.service';
import { academicItemService } from '@/services/academic-item.service';
import { notesService } from '@/services/notes.service';
import {
  ClassItem,
  AcademicItem,
  AcademicItemStatus,
  AcademicItemType,
  NoteItem,
} from '@/types/database';
import { TaskItem } from '@/components/assignments/TaskItem';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ProgressBar } from '@/components/common/ProgressBar';
import { EmptyState } from '@/components/common/EmptyState';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius, MaxContentWidth } from '@/constants/theme';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Info,
  Mail,
  Plus,
  Trash2,
  Upload,
  User,
} from 'lucide-react-native';

type TabKey = 'overview' | 'assignments' | 'exams' | 'policies' | 'notes';

export default function ClassDashboardScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [classData, setClassData] = useState<ClassItem | null>(null);
  const [items, setItems] = useState<AcademicItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Task Creation Modal State
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<AcademicItemType>('assignment');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Note Creation Modal State
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [creatingNote, setCreatingNote] = useState(false);

  const loadData = useCallback(async () => {
    if (!classId || !user) return;
    try {
      const [classRes, itemsRes, notesRes] = await Promise.all([
        classService.getClassById(classId),
        academicItemService.getItems(user.id, { classId }),
        notesService.getNotes(classId),
      ]);

      if (classRes.data) setClassData(classRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
      if (notesRes.data) setNotes(notesRes.data);
    } catch (err) {
      console.error('Error loading class dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleTaskStatus = async (itemId: string, currentStatus: AcademicItemStatus) => {
    const nextStatus: AcademicItemStatus =
      currentStatus === 'completed' ? 'pending' : 'completed';
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: nextStatus } : i))
    );
    await academicItemService.toggleStatus(itemId, currentStatus);
    loadData();
  };

  const handleCreateTask = async () => {
    if (!user || !classId || !newTaskTitle.trim()) return;
    setCreatingTask(true);

    const pointsNum = newTaskPoints ? parseFloat(newTaskPoints) : null;
    const dueIso = newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null;

    await academicItemService.createItem({
      class_id: classId,
      user_id: user.id,
      title: newTaskTitle.trim(),
      description: '',
      type: newTaskType,
      due_date: dueIso,
      status: 'pending',
      priority: 'medium',
      points: isNaN(pointsNum as number) ? null : pointsNum,
      grade: null,
      source_excerpt: null,
      original_date_text: newTaskDueDate || null,
      confidence: 1.0,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
    });

    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskPoints('');
    setCreatingTask(false);
    setTaskModalVisible(false);
    loadData();
  };

  const handleDeleteTask = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await academicItemService.deleteItem(itemId);
  };

  const handleCreateNote = async () => {
    if (!user || !classId || !newNoteTitle.trim()) return;
    setCreatingNote(true);

    await notesService.createNote({
      class_id: classId,
      user_id: user.id,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
    });

    setNewNoteTitle('');
    setNewNoteContent('');
    setCreatingNote(false);
    setNoteModalVisible(false);
    loadData();
  };

  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await notesService.deleteNote(noteId);
  };

  // Calculations
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const examsList = items.filter((i) => i.type === 'exam' || i.type === 'quiz');

  if (!classData && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Class Not Found</Text>
        <Button title="Back to Classes" onPress={() => router.push('/(tabs)/classes')} />
      </View>
    );
  }

  const themeColor = classData?.color || Colors.light.primary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={[styles.innerContent, isDesktop && styles.desktopContent]}>
        {/* Navigation & Header */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <ArrowLeft size={18} color={Colors.light.text} />
            <Text style={styles.backBtnText}>Classes</Text>
          </Pressable>

          <View style={styles.headerRightActions}>
            <Button
              title="Upload Syllabus"
              variant="outline"
              size="sm"
              icon={<Upload size={14} color={Colors.light.text} />}
              onPress={() => router.push('/classes/upload-syllabus')}
            />
            <Button
              title="Add Task"
              size="sm"
              icon={<Plus size={14} color="#FFFFFF" />}
              onPress={() => setTaskModalVisible(true)}
            />
          </View>
        </View>

        {/* Hero Card */}
        <Card variant="elevated" style={styles.heroCard}>
          <View style={[styles.colorStrip, { backgroundColor: themeColor }]} />
          <View style={styles.heroBody}>
            <View style={styles.heroHeaderRow}>
              <View style={[styles.codeBadge, { backgroundColor: `${themeColor}18` }]}>
                <Text style={[styles.codeText, { color: themeColor }]}>
                  {classData?.course_code}
                </Text>
              </View>
              <Text style={styles.semesterTag}>{classData?.semester}</Text>
            </View>

            <Text style={styles.courseTitle}>{classData?.course_name}</Text>

            {classData?.professor_name && (
              <View style={styles.profRow}>
                <View style={styles.profInfo}>
                  <User size={15} color={Colors.light.textSecondary} />
                  <Text style={styles.profText}>{classData.professor_name}</Text>
                </View>
                {classData.professor_email ? (
                  <View style={styles.profInfo}>
                    <Mail size={15} color={Colors.light.textSecondary} />
                    <Text style={styles.profText}>{classData.professor_email}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Course Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Course Progress</Text>
                <Text style={styles.progressPercent}>
                  {completedCount} of {totalCount} completed ({Math.round(progress)}%)
                </Text>
              </View>
              <ProgressBar progress={progress} color={themeColor} height={8} />
            </View>
          </View>
        </Card>

        {/* Tabs Bar */}
        <View style={styles.tabsContainer}>
          {[
            { key: 'overview', label: 'Overview', icon: BookOpen },
            { key: 'assignments', label: `Tasks (${items.length})`, icon: Clock },
            { key: 'exams', label: `Exams (${examsList.length})`, icon: GraduationCap },
            { key: 'policies', label: 'Course Info', icon: Info },
            { key: 'notes', label: `Notes (${notes.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as TabKey)}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}>
                <Icon
                  size={16}
                  color={isSelected ? themeColor : Colors.light.textSecondary}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    isSelected && [styles.tabButtonTextActive, { color: themeColor }],
                  ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Quick Stats Grid */}
            <View style={styles.overviewGrid}>
              <Card style={styles.overviewStatCard}>
                <Clock size={20} color={themeColor} />
                <Text style={styles.overviewStatValue}>
                  {items.filter((i) => i.status !== 'completed').length}
                </Text>
                <Text style={styles.overviewStatLabel}>Remaining Tasks</Text>
              </Card>

              <Card style={styles.overviewStatCard}>
                <GraduationCap size={20} color="#EF4444" />
                <Text style={styles.overviewStatValue}>{examsList.length}</Text>
                <Text style={styles.overviewStatLabel}>Exams & Quizzes</Text>
              </Card>

              <Card style={styles.overviewStatCard}>
                <CheckCircle2 size={20} color="#22C55E" />
                <Text style={styles.overviewStatValue}>{completedCount}</Text>
                <Text style={styles.overviewStatLabel}>Completed</Text>
              </Card>
            </View>

            {/* Grading Breakdown Card */}
            {classData?.grading_breakdown && classData.grading_breakdown.length > 0 && (
              <Card style={styles.breakdownCard}>
                <Text style={styles.cardHeaderTitle}>Grading Breakdown</Text>
                <View style={styles.breakdownList}>
                  {classData.grading_breakdown.map((item, idx) => (
                    <View key={idx} style={styles.breakdownRow}>
                      <Text style={styles.breakdownCategory}>{item.category}</Text>
                      <View style={styles.breakdownBarContainer}>
                        <View
                          style={[
                            styles.breakdownBar,
                            { width: `${Math.min(item.weight, 100)}%`, backgroundColor: themeColor },
                          ]}
                        />
                      </View>
                      <Text style={styles.breakdownWeight}>{item.weight}%</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Upcoming Deadlines in this class */}
            <View style={styles.classSection}>
              <Text style={styles.cardHeaderTitle}>Upcoming Class Deadlines</Text>
              {items.filter((i) => i.status !== 'completed').length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={28} color={Colors.light.success} />}
                  title="No Pending Tasks"
                  description="You have finished all assignments for this course!"
                />
              ) : (
                items
                  .filter((i) => i.status !== 'completed')
                  .slice(0, 5)
                  .map((item) => (
                    <TaskItem
                      key={item.id}
                      item={item}
                      onToggleStatus={handleToggleTaskStatus}
                    />
                  ))
              )}
            </View>
          </View>
        )}

        {/* Tab 2: Assignments & Tasks */}
        {activeTab === 'assignments' && (
          <View style={styles.tabContent}>
            <View style={styles.subHeaderRow}>
              <Text style={styles.cardHeaderTitle}>All Course Tasks</Text>
              <Button
                title="Add Task"
                size="sm"
                icon={<Plus size={14} color="#FFFFFF" />}
                onPress={() => setTaskModalVisible(true)}
              />
            </View>

            {items.length === 0 ? (
              <EmptyState
                icon={<Clock size={28} color={themeColor} />}
                title="No tasks yet"
                description="Add assignments manually or upload a syllabus to automatically populate assignments."
                actionTitle="Add New Task"
                onAction={() => setTaskModalVisible(true)}
              />
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.taskWithDelete}>
                  <View style={{ flex: 1 }}>
                    <TaskItem item={item} onToggleStatus={handleToggleTaskStatus} />
                  </View>
                  <Pressable
                    style={styles.deleteTaskBtn}
                    onPress={() => handleDeleteTask(item.id)}>
                    <Trash2 size={16} color={Colors.light.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 3: Exams & Quizzes */}
        {activeTab === 'exams' && (
          <View style={styles.tabContent}>
            <Text style={styles.cardHeaderTitle}>Exams & Scheduled Quizzes</Text>
            {examsList.length === 0 ? (
              <EmptyState
                icon={<GraduationCap size={28} color="#EF4444" />}
                title="No Exams Found"
                description="No upcoming exams or quizzes detected in this syllabus."
              />
            ) : (
              examsList.map((exam) => (
                <Card key={exam.id} style={styles.examCard}>
                  <View style={styles.examHeader}>
                    <View style={styles.examTitleBox}>
                      <GraduationCap size={20} color="#EF4444" />
                      <Text style={styles.examTitle}>{exam.title}</Text>
                    </View>
                    {exam.points ? (
                      <Text style={styles.examPoints}>{exam.points} pts</Text>
                    ) : null}
                  </View>

                  {exam.due_date && (
                    <View style={styles.examDateRow}>
                      <Calendar size={14} color={Colors.light.textSecondary} />
                      <Text style={styles.examDateText}>
                        Date: {new Date(exam.due_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  {exam.description ? (
                    <Text style={styles.examDesc}>{exam.description}</Text>
                  ) : null}

                  {exam.source_excerpt ? (
                    <View style={styles.excerptBox}>
                      <Text style={styles.excerptTitle}>Excerpt from syllabus:</Text>
                      <Text style={styles.excerptText}>&ldquo;{exam.source_excerpt}&rdquo;</Text>
                    </View>
                  ) : null}
                </Card>
              ))
            )}
          </View>
        )}

        {/* Tab 4: Policies & Info */}
        {activeTab === 'policies' && (
          <View style={styles.tabContent}>
            {classData?.description ? (
              <Card style={styles.policyCard}>
                <Text style={styles.policyTitle}>Course Description</Text>
                <Text style={styles.policyText}>{classData.description}</Text>
              </Card>
            ) : null}

            {classData?.office_hours ? (
              <Card style={styles.policyCard}>
                <Text style={styles.policyTitle}>Office Hours & Location</Text>
                <Text style={styles.policyText}>{classData.office_hours}</Text>
              </Card>
            ) : null}

            {classData?.late_policy ? (
              <Card style={styles.policyCard}>
                <Text style={styles.policyTitle}>Late Submission Policy</Text>
                <Text style={styles.policyText}>{classData.late_policy}</Text>
              </Card>
            ) : null}

            {classData?.attendance_policy ? (
              <Card style={styles.policyCard}>
                <Text style={styles.policyTitle}>Attendance Policy</Text>
                <Text style={styles.policyText}>{classData.attendance_policy}</Text>
              </Card>
            ) : null}

            {classData?.required_textbooks && classData.required_textbooks.length > 0 ? (
              <Card style={styles.policyCard}>
                <Text style={styles.policyTitle}>Required Textbooks & Materials</Text>
                {classData.required_textbooks.map((tb, idx) => (
                  <Text key={idx} style={styles.textbookItem}>
                    • {tb}
                  </Text>
                ))}
              </Card>
            ) : null}
          </View>
        )}

        {/* Tab 5: Notes */}
        {activeTab === 'notes' && (
          <View style={styles.tabContent}>
            <View style={styles.subHeaderRow}>
              <Text style={styles.cardHeaderTitle}>Course Notes</Text>
              <Button
                title="New Note"
                size="sm"
                icon={<Plus size={14} color="#FFFFFF" />}
                onPress={() => setNoteModalVisible(true)}
              />
            </View>

            {notes.length === 0 ? (
              <EmptyState
                icon={<FileText size={28} color={themeColor} />}
                title="No notes yet"
                description="Keep track of lecture notes, study reminders, and key concepts."
                actionTitle="Create First Note"
                onAction={() => setNoteModalVisible(true)}
              />
            ) : (
              notes.map((note) => (
                <Card key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteTitle}>{note.title}</Text>
                    <Pressable
                      onPress={() => handleDeleteNote(note.id)}
                      style={styles.deleteNoteBtn}>
                      <Trash2 size={16} color={Colors.light.danger} />
                    </Pressable>
                  </View>
                  <Text style={styles.noteContent}>{note.content}</Text>
                  <Text style={styles.noteDate}>
                    {new Date(note.created_at).toLocaleDateString()}
                  </Text>
                </Card>
              ))
            )}
          </View>
        )}

        {/* Add Task Modal */}
        <Modal
          visible={taskModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setTaskModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add New Academic Task</Text>

              <Input
                label="Task Title *"
                placeholder="e.g. Problem Set 3"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
              />

              <View style={styles.typeSelector}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeButtonsRow}>
                  {(['assignment', 'exam', 'quiz', 'project', 'reading'] as AcademicItemType[]).map(
                    (t) => (
                      <Pressable
                        key={t}
                        onPress={() => setNewTaskType(t)}
                        style={[
                          styles.typeChoiceBtn,
                          newTaskType === t && [styles.typeChoiceActive, { borderColor: themeColor }],
                        ]}>
                        <Text
                          style={[
                            styles.typeChoiceText,
                            newTaskType === t && { color: themeColor, fontWeight: '700' },
                          ]}>
                          {t}
                        </Text>
                      </Pressable>
                    )
                  )}
                </View>
              </View>

              <Input
                label="Due Date (YYYY-MM-DD)"
                placeholder="2026-12-05"
                value={newTaskDueDate}
                onChangeText={setNewTaskDueDate}
              />

              <Input
                label="Points / Weight (Optional)"
                placeholder="e.g. 100"
                value={newTaskPoints}
                onChangeText={setNewTaskPoints}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setTaskModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Task"
                  onPress={handleCreateTask}
                  loading={creatingTask}
                  style={{ flex: 1, backgroundColor: themeColor }}
                />
              </View>
            </Card>
          </View>
        </Modal>

        {/* Add Note Modal */}
        <Modal
          visible={noteModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setNoteModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Create Course Note</Text>

              <Input
                label="Note Title *"
                placeholder="e.g. Lecture 4 Summary"
                value={newNoteTitle}
                onChangeText={setNewNoteTitle}
              />

              <Input
                label="Content"
                placeholder="Enter lecture highlights, formulas, or reminders..."
                value={newNoteContent}
                onChangeText={setNewNoteContent}
                multiline
                numberOfLines={5}
                style={{ height: 110, textAlignVertical: 'top' }}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setNoteModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Note"
                  onPress={handleCreateNote}
                  loading={creatingNote}
                  style={{ flex: 1, backgroundColor: themeColor }}
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
  },
  errorTitle: {
    ...Typography.xl,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.four,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  backBtnText: {
    ...Typography.sm,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: Spacing.five,
  },
  colorStrip: {
    height: 8,
    width: '100%',
  },
  heroBody: {
    padding: Spacing.five,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  codeBadge: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.two,
    borderRadius: BorderRadius.sm,
  },
  codeText: {
    ...Typography.sm,
    fontWeight: '700',
  },
  semesterTag: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  courseTitle: {
    ...Typography['2xl'],
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
    marginBottom: Spacing.two,
  },
  profRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.four,
    flexWrap: 'wrap',
  },
  profInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
  },
  progressSection: {
    marginTop: Spacing.two,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  progressPercent: {
    ...Typography.xs,
    fontWeight: '700',
    color: Colors.light.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.five,
    overflow: 'scroll',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
  },
  tabButtonActive: {
    backgroundColor: Colors.light.backgroundElement,
  },
  tabButtonText: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  tabButtonTextActive: {
    fontWeight: '700',
  },
  tabContent: {
    gap: Spacing.four,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  overviewStatCard: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    padding: Spacing.four,
    gap: 4,
  },
  overviewStatValue: {
    ...Typography.xl,
    fontWeight: '800',
    color: Colors.light.text,
    marginTop: 4,
  },
  overviewStatLabel: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  breakdownCard: {
    padding: Spacing.five,
  },
  cardHeaderTitle: {
    ...Typography.lg,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  breakdownList: {
    gap: Spacing.three,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  breakdownCategory: {
    width: 140,
    ...Typography.sm,
    fontWeight: '600',
    color: Colors.light.text,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownWeight: {
    width: 44,
    textAlign: 'right',
    ...Typography.xs,
    fontWeight: '700',
    color: Colors.light.text,
  },
  classSection: {
    marginTop: Spacing.two,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  taskWithDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  deleteTaskBtn: {
    padding: Spacing.two,
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  examCard: {
    padding: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  examTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  examTitle: {
    ...Typography.md,
    fontWeight: '700',
    color: Colors.light.text,
  },
  examPoints: {
    ...Typography.xs,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  examDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.two,
  },
  examDateText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  examDesc: {
    ...Typography.sm,
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  excerptBox: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.one,
  },
  excerptTitle: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.textMuted,
    marginBottom: 2,
  },
  excerptText: {
    ...Typography.xs,
    fontStyle: 'italic',
    color: Colors.light.textSecondary,
  },
  policyCard: {
    padding: Spacing.five,
  },
  policyTitle: {
    ...Typography.md,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  policyText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  textbookItem: {
    ...Typography.sm,
    color: Colors.light.text,
    marginVertical: 2,
  },
  noteCard: {
    padding: Spacing.four,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  noteTitle: {
    ...Typography.md,
    fontWeight: '700',
    color: Colors.light.text,
  },
  deleteNoteBtn: {
    padding: 4,
  },
  noteContent: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  noteDate: {
    ...Typography.xs,
    color: Colors.light.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    padding: Spacing.six,
  },
  modalTitle: {
    ...Typography.lg,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: Spacing.four,
  },
  inputLabel: {
    ...Typography.sm,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  typeSelector: {
    marginBottom: Spacing.four,
  },
  typeButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  typeChoiceBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundElement,
  },
  typeChoiceActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  typeChoiceText: {
    ...Typography.xs,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    textTransform: 'capitalize',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
});
