import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useIsDesktop } from '@/hooks/useResponsive';
import { format } from 'date-fns';
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
  Edit2,
  Edit3,
  FileText,
  GraduationCap,
  Info,
  Mail,
  Plus,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react-native';

type TabKey = 'overview' | 'assignments' | 'exams' | 'policies' | 'notes';

export default function ClassDashboardScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [classData, setClassData] = useState<ClassItem | null>(null);
  const [items, setItems] = useState<AcademicItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ==========================================
  // Course Info Edit Modal State
  // ==========================================
  const [courseInfoModalVisible, setCourseInfoModalVisible] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editOfficeHours, setEditOfficeHours] = useState('');
  const [editAttendancePolicy, setEditAttendancePolicy] = useState('');
  const [editLatePolicy, setEditLatePolicy] = useState('');
  const [savingCourseInfo, setSavingCourseInfo] = useState(false);

  // ==========================================
  // Task Creation Modal State
  // ==========================================
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskType, setNewTaskType] = useState<AcademicItemType>('assignment');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // ==========================================
  // Task Edit Modal State
  // ==========================================
  const [editTaskModalVisible, setEditTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<AcademicItem | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskType, setEditTaskType] = useState<AcademicItemType>('assignment');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskPoints, setEditTaskPoints] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState<AcademicItemStatus>('pending');
  const [savingTask, setSavingTask] = useState(false);

  // ==========================================
  // Exam Creation Modal State
  // ==========================================
  const [examModalVisible, setExamModalVisible] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDescription, setNewExamDescription] = useState('');
  const [newExamType, setNewExamType] = useState<'exam' | 'quiz'>('exam');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamPoints, setNewExamPoints] = useState('');
  const [creatingExam, setCreatingExam] = useState(false);

  // ==========================================
  // Exam Edit Modal State
  // ==========================================
  const [editExamModalVisible, setEditExamModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState<AcademicItem | null>(null);
  const [editExamTitle, setEditExamTitle] = useState('');
  const [editExamDescription, setEditExamDescription] = useState('');
  const [editExamType, setEditExamType] = useState<'exam' | 'quiz'>('exam');
  const [editExamDate, setEditExamDate] = useState('');
  const [editExamPoints, setEditExamPoints] = useState('');
  const [editExamStatus, setEditExamStatus] = useState<AcademicItemStatus>('pending');
  const [savingExam, setSavingExam] = useState(false);

  // ==========================================
  // Note Creation Modal State
  // ==========================================
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [creatingNote, setCreatingNote] = useState(false);

  const loadData = useCallback(async () => {
    if (!classId) return;
    const effectiveUserId = user?.id || 'guest_student';
    try {
      const [classRes, itemsRes, notesRes] = await Promise.all([
        classService.getClassById(classId),
        academicItemService.getItems(effectiveUserId, { classId }),
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

  // ==========================================
  // Course Info Handlers
  // ==========================================
  const handleOpenEditCourseInfo = () => {
    setEditDescription(classData?.description || '');
    setEditOfficeHours(classData?.office_hours || '');
    setEditAttendancePolicy(classData?.attendance_policy || '');
    setEditLatePolicy(classData?.late_policy || '');
    setCourseInfoModalVisible(true);
  };

  const handleSaveCourseInfo = async () => {
    if (!classId) return;
    setSavingCourseInfo(true);
    try {
      const updates = {
        description: editDescription.trim(),
        office_hours: editOfficeHours.trim() || null,
        attendance_policy: editAttendancePolicy.trim() || null,
        late_policy: editLatePolicy.trim() || null,
      };

      await classService.updateClass(classId, updates);
      setClassData((prev) => (prev ? { ...prev, ...updates } : null));
      setCourseInfoModalVisible(false);
    } catch (err) {
      console.error('Error saving course info:', err);
    } finally {
      setSavingCourseInfo(false);
    }
  };

  // ==========================================
  // Task Handlers
  // ==========================================
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
    if (!classId || !newTaskTitle.trim()) return;
    setCreatingTask(true);
    const effectiveUserId = user?.id || 'guest_student';

    const pointsNum = newTaskPoints ? parseFloat(newTaskPoints) : null;
    const dueIso = newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null;

    const { data: created } = await academicItemService.createItem({
      class_id: classId,
      user_id: effectiveUserId,
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
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

    if (created) {
      setItems((prev) => [...prev, created]);
    }

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskDueDate('');
    setNewTaskPoints('');
    setCreatingTask(false);
    setTaskModalVisible(false);
    loadData();
  };

  const handleOpenEditTask = (task: AcademicItem) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || '');
    setEditTaskType(task.type);
    setEditTaskDueDate(
      task.due_date ? task.due_date.split('T')[0] : task.original_date_text || ''
    );
    setEditTaskPoints(task.points ? String(task.points) : '');
    setEditTaskStatus(task.status);
    setEditTaskModalVisible(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editTaskTitle.trim()) return;
    setSavingTask(true);

    try {
      const pointsNum = editTaskPoints ? parseFloat(editTaskPoints) : null;
      const dueIso = editTaskDueDate ? new Date(editTaskDueDate).toISOString() : null;

      const updates: Partial<AcademicItem> = {
        title: editTaskTitle.trim(),
        description: editTaskDescription.trim(),
        type: editTaskType,
        due_date: dueIso,
        original_date_text: editTaskDueDate || null,
        points: isNaN(pointsNum as number) ? null : pointsNum,
        status: editTaskStatus,
      };

      await academicItemService.updateItem(editingTask.id, updates);
      setItems((prev) =>
        prev.map((i) => (i.id === editingTask.id ? { ...i, ...updates } : i))
      );
      setEditTaskModalVisible(false);
      loadData();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    if (editTaskModalVisible && editingTask?.id === itemId) {
      setEditTaskModalVisible(false);
    }
    await academicItemService.deleteItem(itemId);
  };

  // ==========================================
  // Exam Handlers
  // ==========================================
  const handleCreateExam = async () => {
    if (!classId || !newExamTitle.trim()) return;
    setCreatingExam(true);
    const effectiveUserId = user?.id || 'guest_student';

    try {
      const pointsNum = newExamPoints ? parseFloat(newExamPoints) : null;
      const dueIso = newExamDate ? new Date(newExamDate).toISOString() : null;

      const { data: created } = await academicItemService.createItem({
        class_id: classId,
        user_id: effectiveUserId,
        title: newExamTitle.trim(),
        description: newExamDescription.trim(),
        type: newExamType,
        due_date: dueIso,
        status: 'pending',
        priority: 'high',
        points: isNaN(pointsNum as number) ? null : pointsNum,
        grade: null,
        source_excerpt: null,
        original_date_text: newExamDate || null,
        confidence: 1.0,
        is_confirmed: true,
        google_event_id: null,
        google_calendar_id: null,
        last_google_sync_at: null,
        google_sync_status: 'not_synced',
      });

      if (created) {
        setItems((prev) => [...prev, created]);
      }

      setNewExamTitle('');
      setNewExamDescription('');
      setNewExamDate('');
      setNewExamPoints('');
      setExamModalVisible(false);
      loadData();
    } catch (err) {
      console.error('Error creating exam:', err);
    } finally {
      setCreatingExam(false);
    }
  };

  const handleOpenEditExam = (exam: AcademicItem) => {
    setEditingExam(exam);
    setEditExamTitle(exam.title);
    setEditExamDescription(exam.description || '');
    setEditExamType(exam.type === 'quiz' ? 'quiz' : 'exam');
    setEditExamDate(
      exam.due_date ? exam.due_date.split('T')[0] : exam.original_date_text || ''
    );
    setEditExamPoints(exam.points ? String(exam.points) : '');
    setEditExamStatus(exam.status);
    setEditExamModalVisible(true);
  };

  const handleUpdateExam = async () => {
    if (!editingExam || !editExamTitle.trim()) return;
    setSavingExam(true);

    try {
      const pointsNum = editExamPoints ? parseFloat(editExamPoints) : null;
      const dueIso = editExamDate ? new Date(editExamDate).toISOString() : null;

      const updates: Partial<AcademicItem> = {
        title: editExamTitle.trim(),
        description: editExamDescription.trim(),
        type: editExamType,
        due_date: dueIso,
        original_date_text: editExamDate || null,
        points: isNaN(pointsNum as number) ? null : pointsNum,
        status: editExamStatus,
      };

      await academicItemService.updateItem(editingExam.id, updates);
      setItems((prev) =>
        prev.map((i) => (i.id === editingExam.id ? { ...i, ...updates } : i))
      );
      setEditExamModalVisible(false);
      loadData();
    } catch (err) {
      console.error('Error updating exam:', err);
    } finally {
      setSavingExam(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== examId));
    if (editExamModalVisible && editingExam?.id === examId) {
      setEditExamModalVisible(false);
    }
    await academicItemService.deleteItem(examId);
  };

  // ==========================================
  // Note Handlers
  // ==========================================
  const handleCreateNote = async () => {
    if (!classId || !newNoteTitle.trim()) return;
    setCreatingNote(true);
    const effectiveUserId = user?.id || 'guest_student';

    await notesService.createNote({
      class_id: classId,
      user_id: effectiveUserId,
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

  // Calculations & Item Slices
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const examsList = items.filter((i) => i.type === 'exam' || i.type === 'quiz');
  const tasksList = items.filter((i) => i.type !== 'exam' && i.type !== 'quiz');

  if (!classData && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Class Not Found</Text>
        <Button title="Back to Dashboard" onPress={() => router.replace('/(tabs)/dashboard')} />
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
            onPress={() => router.replace('/(tabs)/dashboard')}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <ArrowLeft size={18} color={Colors.light.text} />
            <Text style={styles.backBtnText}>Dashboard</Text>
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
            { key: 'assignments', label: `Tasks (${tasksList.length})`, icon: Clock },
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

        {/* ============================================================== */}
        {/* Tab 1: Overview */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Quick Stats Grid */}
            <View style={styles.overviewGrid}>
              <Card style={styles.overviewStatCard}>
                <Clock size={20} color={themeColor} />
                <Text style={styles.overviewStatValue}>
                  {tasksList.filter((i) => i.status !== 'completed').length}
                </Text>
                <Text style={styles.overviewStatLabel}>Pending Tasks</Text>
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
                      onPress={() => (item.type === 'exam' || item.type === 'quiz' ? handleOpenEditExam(item) : handleOpenEditTask(item))}
                    />
                  ))
              )}
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* Tab 2: Assignments & Tasks (Full CRUD) */}
        {/* ============================================================== */}
        {activeTab === 'assignments' && (
          <View style={styles.tabContent}>
            <View style={styles.subHeaderRow}>
              <View>
                <Text style={styles.cardHeaderTitle}>Course Tasks & Assignments</Text>
                <Text style={styles.subHeaderSubtitle}>
                  Manage, edit, or complete homework, projects, and readings
                </Text>
              </View>
              <Button
                title="Add Task"
                size="sm"
                icon={<Plus size={14} color="#FFFFFF" />}
                onPress={() => setTaskModalVisible(true)}
              />
            </View>

            {tasksList.length === 0 ? (
              <EmptyState
                icon={<Clock size={28} color={themeColor} />}
                title="No tasks yet"
                description="Add assignments manually or upload a syllabus to automatically extract course tasks."
                actionTitle="Add New Task"
                onAction={() => setTaskModalVisible(true)}
              />
            ) : (
              tasksList.map((item) => (
                <View key={item.id} style={styles.taskWithDelete}>
                  <View style={{ flex: 1 }}>
                    <TaskItem
                      item={item}
                      onToggleStatus={handleToggleTaskStatus}
                      onPress={() => handleOpenEditTask(item)}
                    />
                  </View>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => handleOpenEditTask(item)}>
                    <Edit2 size={16} color={Colors.light.textSecondary} />
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.deleteBtnHover]}
                    onPress={() => handleDeleteTask(item.id)}>
                    <Trash2 size={16} color={Colors.light.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* Tab 3: Exams & Quizzes (Full CRUD) */}
        {/* ============================================================== */}
        {activeTab === 'exams' && (
          <View style={styles.tabContent}>
            <View style={styles.subHeaderRow}>
              <View>
                <Text style={styles.cardHeaderTitle}>Exams & Scheduled Quizzes</Text>
                <Text style={styles.subHeaderSubtitle}>
                  Midterms, final examinations, and quizzes
                </Text>
              </View>
              <Button
                title="Add Exam"
                size="sm"
                icon={<Plus size={14} color="#FFFFFF" />}
                onPress={() => setExamModalVisible(true)}
                style={{ backgroundColor: '#EF4444' }}
              />
            </View>

            {examsList.length === 0 ? (
              <EmptyState
                icon={<GraduationCap size={28} color="#EF4444" />}
                title="No Exams Found"
                description="No upcoming exams or quizzes in this course. Tap below to schedule an exam."
                actionTitle="Add Exam"
                onAction={() => setExamModalVisible(true)}
              />
            ) : (
              examsList.map((exam) => {
                const isCompleted = exam.status === 'completed';

                return (
                  <Card key={exam.id} style={[styles.examCard, isCompleted && styles.examCompletedCard]}>
                    <View style={styles.examHeader}>
                      <View style={styles.examTitleBox}>
                        <Pressable
                          hitSlop={6}
                          onPress={() => handleToggleTaskStatus(exam.id, exam.status)}>
                          {isCompleted ? (
                            <CheckCircle2 size={20} color={Colors.light.success} />
                          ) : (
                            <GraduationCap size={20} color="#EF4444" />
                          )}
                        </Pressable>
                        <Text
                          style={[
                            styles.examTitle,
                            isCompleted && styles.completedTitle,
                          ]}>
                          {exam.title}
                        </Text>
                      </View>

                      <View style={styles.examHeaderRight}>
                        {exam.points ? (
                          <Text style={styles.examPoints}>{exam.points} pts</Text>
                        ) : null}
                        <Pressable
                          style={styles.actionBtn}
                          onPress={() => handleOpenEditExam(exam)}>
                          <Edit2 size={15} color={Colors.light.textSecondary} />
                        </Pressable>
                        <Pressable
                          style={[styles.actionBtn, styles.deleteBtnHover]}
                          onPress={() => handleDeleteExam(exam.id)}>
                          <Trash2 size={15} color={Colors.light.danger} />
                        </Pressable>
                      </View>
                    </View>

                    {exam.due_date && (
                      <View style={styles.examDateRow}>
                        <Calendar size={14} color={Colors.light.textSecondary} />
                        <Text style={styles.examDateText}>
                          Date: {format(new Date(exam.due_date), 'EEE, MMM d, yyyy')}
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
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* Tab 4: Course Info & Policies (Editing Support) */}
        {/* ============================================================== */}
        {activeTab === 'policies' && (
          <View style={styles.tabContent}>
            <View style={styles.subHeaderRow}>
              <View>
                <Text style={styles.cardHeaderTitle}>Course Information & Policies</Text>
                <Text style={styles.subHeaderSubtitle}>
                  View and update course description, office hours, and attendance rules
                </Text>
              </View>
              <Button
                title="Edit Course Info"
                size="sm"
                variant="outline"
                icon={<Edit3 size={14} color={Colors.light.text} />}
                onPress={handleOpenEditCourseInfo}
              />
            </View>

            {/* Course Description */}
            <Card style={styles.policyCard}>
              <View style={styles.policyCardHeader}>
                <Text style={styles.policyTitle}>Course Description</Text>
                <Pressable
                  hitSlop={8}
                  style={styles.inlineEditBtn}
                  onPress={handleOpenEditCourseInfo}>
                  <Edit2 size={14} color={Colors.light.primary} />
                  <Text style={styles.inlineEditText}>Edit</Text>
                </Pressable>
              </View>
              <Text
                style={[
                  styles.policyText,
                  !classData?.description && styles.placeholderText,
                ]}>
                {classData?.description ||
                  'No description provided. Tap Edit above to add an overview and course objectives.'}
              </Text>
            </Card>

            {/* Office Hours & Location */}
            <Card style={styles.policyCard}>
              <View style={styles.policyCardHeader}>
                <Text style={styles.policyTitle}>Office Hours & Location</Text>
                <Pressable
                  hitSlop={8}
                  style={styles.inlineEditBtn}
                  onPress={handleOpenEditCourseInfo}>
                  <Edit2 size={14} color={Colors.light.primary} />
                  <Text style={styles.inlineEditText}>Edit</Text>
                </Pressable>
              </View>
              <Text
                style={[
                  styles.policyText,
                  !classData?.office_hours && styles.placeholderText,
                ]}>
                {classData?.office_hours ||
                  'No office hours or meeting location recorded. Tap Edit to add your instructor\'s contact hours and office room.'}
              </Text>
            </Card>

            {/* Attendance Policy */}
            <Card style={styles.policyCard}>
              <View style={styles.policyCardHeader}>
                <Text style={styles.policyTitle}>Attendance Policy</Text>
                <Pressable
                  hitSlop={8}
                  style={styles.inlineEditBtn}
                  onPress={handleOpenEditCourseInfo}>
                  <Edit2 size={14} color={Colors.light.primary} />
                  <Text style={styles.inlineEditText}>Edit</Text>
                </Pressable>
              </View>
              <Text
                style={[
                  styles.policyText,
                  !classData?.attendance_policy && styles.placeholderText,
                ]}>
                {classData?.attendance_policy ||
                  'No attendance policy specified. Tap Edit to record attendance requirements and participation rules.'}
              </Text>
            </Card>

            {/* Late Submission Policy */}
            <Card style={styles.policyCard}>
              <View style={styles.policyCardHeader}>
                <Text style={styles.policyTitle}>Late Submission Policy</Text>
                <Pressable
                  hitSlop={8}
                  style={styles.inlineEditBtn}
                  onPress={handleOpenEditCourseInfo}>
                  <Edit2 size={14} color={Colors.light.primary} />
                  <Text style={styles.inlineEditText}>Edit</Text>
                </Pressable>
              </View>
              <Text
                style={[
                  styles.policyText,
                  !classData?.late_policy && styles.placeholderText,
                ]}>
                {classData?.late_policy ||
                  'No late policy specified. Tap Edit to enter slip days, penalties, or extension rules.'}
              </Text>
            </Card>

            {/* Required Textbooks */}
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

        {/* ============================================================== */}
        {/* Tab 5: Notes */}
        {/* ============================================================== */}
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
                    {format(new Date(note.created_at), 'MMM d, yyyy')}
                  </Text>
                </Card>
              ))
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* Modal 1: Edit Course Info (Description, Office Hours, Attendance) */}
        {/* ============================================================== */}
        <Modal
          visible={courseInfoModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setCourseInfoModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Course Information</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => setCourseInfoModalVisible(false)}>
                  <X size={20} color={Colors.light.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                <Input
                  label="Course Description"
                  placeholder="Summarize course goals, syllabus overview, or catalog blurb..."
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={4}
                  style={{ height: 85, textAlignVertical: 'top' }}
                />

                <Input
                  label="Office Hours & Location"
                  placeholder="e.g. Tuesdays & Thursdays 2:00 PM - 4:00 PM, Turing Hall Room 402"
                  value={editOfficeHours}
                  onChangeText={setEditOfficeHours}
                  multiline
                  numberOfLines={2}
                  style={{ height: 60, textAlignVertical: 'top' }}
                />

                <Input
                  label="Attendance Policy"
                  placeholder="e.g. Attendance is required. More than 3 unexcused absences result in grade penalty."
                  value={editAttendancePolicy}
                  onChangeText={setEditAttendancePolicy}
                  multiline
                  numberOfLines={3}
                  style={{ height: 75, textAlignVertical: 'top' }}
                />

                <Input
                  label="Late Submission Policy"
                  placeholder="e.g. 3 slip days allowed for semester. Late work thereafter penalized 10% per day."
                  value={editLatePolicy}
                  onChangeText={setEditLatePolicy}
                  multiline
                  numberOfLines={3}
                  style={{ height: 75, textAlignVertical: 'top' }}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setCourseInfoModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Information"
                  onPress={handleSaveCourseInfo}
                  loading={savingCourseInfo}
                  style={{ flex: 1, backgroundColor: themeColor }}
                />
              </View>
            </Card>
          </View>
        </Modal>

        {/* ============================================================== */}
        {/* Modal 2: Create Task */}
        {/* ============================================================== */}
        <Modal
          visible={taskModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setTaskModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Academic Task</Text>
                <Pressable hitSlop={8} onPress={() => setTaskModalVisible(false)}>
                  <X size={20} color={Colors.light.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                <Input
                  label="Task Title *"
                  placeholder="e.g. Problem Set 3: Concurrency"
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                />

                <View style={styles.typeSelector}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={styles.typeButtonsRow}>
                    {(['assignment', 'project', 'reading', 'quiz', 'other'] as AcademicItemType[]).map(
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
                  placeholder="2026-10-15"
                  value={newTaskDueDate}
                  onChangeText={setNewTaskDueDate}
                />

                <Input
                  label="Points / Weight (Optional)"
                  placeholder="e.g. 50"
                  value={newTaskPoints}
                  onChangeText={setNewTaskPoints}
                  keyboardType="numeric"
                />

                <Input
                  label="Description / Instructions"
                  placeholder="Optional details or submission requirements..."
                  value={newTaskDescription}
                  onChangeText={setNewTaskDescription}
                  multiline
                  numberOfLines={2}
                  style={{ height: 60, textAlignVertical: 'top' }}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setTaskModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Create Task"
                  onPress={handleCreateTask}
                  loading={creatingTask}
                  style={{ flex: 1, backgroundColor: themeColor }}
                />
              </View>
            </Card>
          </View>
        </Modal>

        {/* ============================================================== */}
        {/* Modal 3: Edit Task (Update & Delete) */}
        {/* ============================================================== */}
        <Modal
          visible={editTaskModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setEditTaskModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Academic Task</Text>
                <Pressable hitSlop={8} onPress={() => setEditTaskModalVisible(false)}>
                  <X size={20} color={Colors.light.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                <Input
                  label="Task Title *"
                  value={editTaskTitle}
                  onChangeText={setEditTaskTitle}
                />

                <View style={styles.typeSelector}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={styles.typeButtonsRow}>
                    {(['assignment', 'project', 'reading', 'quiz', 'other'] as AcademicItemType[]).map(
                      (t) => (
                        <Pressable
                          key={t}
                          onPress={() => setEditTaskType(t)}
                          style={[
                            styles.typeChoiceBtn,
                            editTaskType === t && [styles.typeChoiceActive, { borderColor: themeColor }],
                          ]}>
                          <Text
                            style={[
                              styles.typeChoiceText,
                              editTaskType === t && { color: themeColor, fontWeight: '700' },
                            ]}>
                            {t}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>

                {/* Status Toggle */}
                <View style={styles.typeSelector}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.typeButtonsRow}>
                    <Pressable
                      onPress={() => setEditTaskStatus('pending')}
                      style={[
                        styles.typeChoiceBtn,
                        editTaskStatus === 'pending' && [styles.typeChoiceActive, { borderColor: Colors.light.warning }],
                      ]}>
                      <Text
                        style={[
                          styles.typeChoiceText,
                          editTaskStatus === 'pending' && { color: Colors.light.warning, fontWeight: '700' },
                        ]}>
                        Pending
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setEditTaskStatus('completed')}
                      style={[
                        styles.typeChoiceBtn,
                        editTaskStatus === 'completed' && [styles.typeChoiceActive, { borderColor: Colors.light.success }],
                      ]}>
                      <Text
                        style={[
                          styles.typeChoiceText,
                          editTaskStatus === 'completed' && { color: Colors.light.success, fontWeight: '700' },
                        ]}>
                        Completed
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Input
                  label="Due Date (YYYY-MM-DD)"
                  placeholder="2026-10-15"
                  value={editTaskDueDate}
                  onChangeText={setEditTaskDueDate}
                />

                <Input
                  label="Points / Weight"
                  placeholder="e.g. 50"
                  value={editTaskPoints}
                  onChangeText={setEditTaskPoints}
                  keyboardType="numeric"
                />

                <Input
                  label="Description / Notes"
                  value={editTaskDescription}
                  onChangeText={setEditTaskDescription}
                  multiline
                  numberOfLines={2}
                  style={{ height: 60, textAlignVertical: 'top' }}
                />
              </ScrollView>

              <View style={styles.modalFooterBetween}>
                <Button
                  title="Delete"
                  variant="outline"
                  icon={<Trash2 size={14} color={Colors.light.danger} />}
                  onPress={() => editingTask && handleDeleteTask(editingTask.id)}
                  style={{ borderColor: Colors.light.danger }}
                />
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setEditTaskModalVisible(false)}
                  />
                  <Button
                    title="Save Changes"
                    onPress={handleUpdateTask}
                    loading={savingTask}
                    style={{ backgroundColor: themeColor }}
                  />
                </View>
              </View>
            </Card>
          </View>
        </Modal>

        {/* ============================================================== */}
        {/* Modal 4: Create Exam / Quiz */}
        {/* ============================================================== */}
        <Modal
          visible={examModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setExamModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Schedule Exam or Quiz</Text>
                <Pressable hitSlop={8} onPress={() => setExamModalVisible(false)}>
                  <X size={20} color={Colors.light.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                <Input
                  label="Exam Title *"
                  placeholder="e.g. Midterm 1: Virtual Memory"
                  value={newExamTitle}
                  onChangeText={setNewExamTitle}
                />

                <View style={styles.typeSelector}>
                  <Text style={styles.inputLabel}>Type</Text>
                  <View style={styles.typeButtonsRow}>
                    <Pressable
                      onPress={() => setNewExamType('exam')}
                      style={[
                        styles.typeChoiceBtn,
                        newExamType === 'exam' && [styles.typeChoiceActive, { borderColor: '#EF4444' }],
                      ]}>
                      <Text
                        style={[
                          styles.typeChoiceText,
                          newExamType === 'exam' && { color: '#EF4444', fontWeight: '700' },
                        ]}>
                        Examination
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setNewExamType('quiz')}
                      style={[
                        styles.typeChoiceBtn,
                        newExamType === 'quiz' && [styles.typeChoiceActive, { borderColor: '#EF4444' }],
                      ]}>
                      <Text
                        style={[
                          styles.typeChoiceText,
                          newExamType === 'quiz' && { color: '#EF4444', fontWeight: '700' },
                        ]}>
                        Quiz
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Input
                  label="Exam Date (YYYY-MM-DD)"
                  placeholder="2026-10-22"
                  value={newExamDate}
                  onChangeText={setNewExamDate}
                />

                <Input
                  label="Points / Weight"
                  placeholder="e.g. 150"
                  value={newExamPoints}
                  onChangeText={setNewExamPoints}
                  keyboardType="numeric"
                />

                <Input
                  label="Location / Coverage Topics"
                  placeholder="e.g. Turing Hall 101, Chapters 1-5"
                  value={newExamDescription}
                  onChangeText={setNewExamDescription}
                  multiline
                  numberOfLines={2}
                  style={{ height: 60, textAlignVertical: 'top' }}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setExamModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Add Exam"
                  onPress={handleCreateExam}
                  loading={creatingExam}
                  style={{ flex: 1, backgroundColor: '#EF4444' }}
                />
              </View>
            </Card>
          </View>
        </Modal>

        {/* ============================================================== */}
        {/* Modal 5: Edit Exam / Quiz (Update & Delete) */}
        {/* ============================================================== */}
        <Modal
          visible={editExamModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setEditExamModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Exam or Quiz</Text>
                <Pressable hitSlop={8} onPress={() => setEditExamModalVisible(false)}>
                  <X size={20} color={Colors.light.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                <Input
                  label="Exam Title *"
                  value={editExamTitle}
                  onChangeText={setEditExamTitle}
                />

                <View style={styles.typeSelector}>
                  <Text style={styles.inputLabel}>Type</Text>
                  <View style={styles.typeButtonsRow}>
                    <Pressable
                      onPress={() => setEditExamType('exam')}
                      style={[
                        styles.typeChoiceBtn,
                        editExamType === 'exam' && [styles.typeChoiceActive, { borderColor: '#EF4444' }],
                      ]}>
                      <Text
                        style={[
                          styles.typeChoiceText,
                          editExamType === 'exam' && { color: '#EF4444', fontWeight: '700' },
                        ]}>
                        Examination
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setEditExamType('quiz')}
                      style={[
                        styles.typeChoiceBtn,
                        editExamType === 'quiz' && [styles.typeChoiceActive, { borderColor: '#EF4444' }],
                      ]}>
                      <Text
                        style={[
                          styles.typeChoiceText,
                          editExamType === 'quiz' && { color: '#EF4444', fontWeight: '700' },
                        ]}>
                        Quiz
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Status Toggle */}
                <View style={styles.typeSelector}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.typeButtonsRow}>
                    <Pressable
                      onPress={() => setEditExamStatus('pending')}
                      style={[
                        styles.typeChoiceBtn,
                        editExamStatus === 'pending' && [styles.typeChoiceActive, { borderColor: Colors.light.warning }],
                      ]}>
                      <Text
                        style={[
                          styles.typeChoiceText,
                          editExamStatus === 'pending' && { color: Colors.light.warning, fontWeight: '700' },
                        ]}>
                        Upcoming
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setEditExamStatus('completed')}
                      style={[
                        styles.typeChoiceBtn,
                        editExamStatus === 'completed' && [styles.typeChoiceActive, { borderColor: Colors.light.success }],
                      ]}>
                      <Text
                        style={[
                          styles.typeChoiceText,
                          editExamStatus === 'completed' && { color: Colors.light.success, fontWeight: '700' },
                        ]}>
                        Completed
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Input
                  label="Exam Date (YYYY-MM-DD)"
                  value={editExamDate}
                  onChangeText={setEditExamDate}
                />

                <Input
                  label="Points / Weight"
                  value={editExamPoints}
                  onChangeText={setEditExamPoints}
                  keyboardType="numeric"
                />

                <Input
                  label="Description / Location"
                  value={editExamDescription}
                  onChangeText={setEditExamDescription}
                  multiline
                  numberOfLines={2}
                  style={{ height: 60, textAlignVertical: 'top' }}
                />
              </ScrollView>

              <View style={styles.modalFooterBetween}>
                <Button
                  title="Delete Exam"
                  variant="outline"
                  icon={<Trash2 size={14} color={Colors.light.danger} />}
                  onPress={() => editingExam && handleDeleteExam(editingExam.id)}
                  style={{ borderColor: Colors.light.danger }}
                />
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setEditExamModalVisible(false)}
                  />
                  <Button
                    title="Save Changes"
                    onPress={handleUpdateExam}
                    loading={savingExam}
                    style={{ backgroundColor: '#EF4444' }}
                  />
                </View>
              </View>
            </Card>
          </View>
        </Modal>

        {/* ============================================================== */}
        {/* Modal 6: Create Note */}
        {/* ============================================================== */}
        <Modal
          visible={noteModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setNoteModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Course Note</Text>
                <Pressable hitSlop={8} onPress={() => setNoteModalVisible(false)}>
                  <X size={20} color={Colors.light.textSecondary} />
                </Pressable>
              </View>

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
    marginBottom: 2,
  },
  subHeaderSubtitle: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
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
  actionBtn: {
    padding: Spacing.two,
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  deleteBtnHover: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  examCard: {
    padding: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  examCompletedCard: {
    opacity: 0.75,
    backgroundColor: '#F8FAFC',
    borderLeftColor: Colors.light.success,
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
    flex: 1,
  },
  examHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  examTitle: {
    ...Typography.md,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.light.textSecondary,
  },
  examPoints: {
    ...Typography.xs,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.two,
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
  policyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  policyTitle: {
    ...Typography.md,
    fontWeight: '700',
    color: Colors.light.text,
  },
  inlineEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.primaryLight,
  },
  inlineEditText: {
    ...Typography.xs,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  policyText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  placeholderText: {
    fontStyle: 'italic',
    color: Colors.light.textMuted,
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
    maxWidth: 520,
    padding: Spacing.six,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  modalTitle: {
    ...Typography.lg,
    fontWeight: '800',
    color: Colors.light.text,
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
    marginTop: Spacing.three,
  },
  modalFooterBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  pressed: {
    opacity: 0.8,
  },
});
