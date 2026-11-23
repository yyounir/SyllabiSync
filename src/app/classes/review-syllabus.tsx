import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { reviewStore } from '@/hooks/useReviewData';
import { classService } from '@/services/class.service';
import { academicItemService } from '@/services/academic-item.service';
import { syllabusService } from '@/services/syllabus.service';
import { ExtractedItem } from '@/types/academic';
import { AcademicItemType } from '@/types/database';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Colors, CLASS_COLORS } from '@/constants/colors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react-native';

export default function ReviewSyllabusScreen() {
  const { user } = useAuth();
  const pending = reviewStore.getPendingData();

  // All hooks called unconditionally at the top level
  const [courseName, setCourseName] = useState(pending?.extractedData?.course_name || '');
  const [courseCode, setCourseCode] = useState(pending?.extractedData?.course_code || '');
  const [professorName, setProfessorName] = useState(pending?.extractedData?.professor_name || '');
  const [professorEmail, setProfessorEmail] = useState(pending?.extractedData?.professor_email || '');
  const [semester, setSemester] = useState(pending?.extractedData?.semester || 'Fall 2026');
  const [description, setDescription] = useState(pending?.extractedData?.description || '');
  const [officeHours, setOfficeHours] = useState(pending?.extractedData?.office_hours || '');
  const [selectedColor, setSelectedColor] = useState(CLASS_COLORS[0]);
  const [items, setItems] = useState<ExtractedItem[]>(pending?.extractedData?.items || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pending) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Syllabus Data to Review</Text>
        <Button
          title="Upload Syllabus"
          onPress={() => router.replace('/classes/upload-syllabus')}
        />
      </View>
    );
  }

  const { extractedData, originalFilename, storagePath } = pending;

  const handleUpdateItem = (index: number, updates: Partial<ExtractedItem>) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddItem = () => {
    const newItem: ExtractedItem = {
      title: 'New Task',
      description: '',
      type: 'assignment',
      due_date: new Date().toISOString().split('T')[0],
      original_date_text: 'Manual entry',
      points: null,
      confidence: 1.0,
      source_excerpt: 'Added manually during review',
      is_tentative: false,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const handleConfirmAndSave = async () => {
    if (!user) return;
    if (!courseName.trim() || !courseCode.trim()) {
      setError('Course name and code cannot be blank');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // 1. Create Class
      const { data: classRow, error: classError } = await classService.createClass({
        user_id: user.id,
        course_name: courseName.trim(),
        course_code: courseCode.trim().toUpperCase(),
        professor_name: professorName.trim() || 'TBD',
        professor_email: professorEmail.trim() || '',
        description: description.trim() || '',
        semester: semester.trim() || 'Fall 2026',
        color: selectedColor,
        grading_breakdown: extractedData.grading_breakdown || [],
        office_hours: officeHours.trim() || null,
        attendance_policy: extractedData.attendance_policy || null,
        late_policy: extractedData.late_policy || null,
        required_textbooks: extractedData.required_textbooks || [],
      });

      if (classError || !classRow) {
        throw new Error(classError?.message || 'Failed to save class to database');
      }

      // 2. Record Syllabus in database if storagePath exists
      if (storagePath) {
        await syllabusService.recordSyllabus(
          classRow.id,
          user.id,
          storagePath,
          originalFilename,
          description
        );
      }

      // 3. Save Academic Items in bulk
      if (items.length > 0) {
        const itemRows = items.map((item) => ({
          class_id: classRow.id,
          user_id: user.id,
          title: item.title,
          description: item.description || '',
          type: item.type,
          due_date: item.due_date ? new Date(item.due_date).toISOString() : null,
          status: 'pending' as const,
          priority: item.type === 'exam' ? ('high' as const) : ('medium' as const),
          points: item.points || null,
          grade: null,
          source_excerpt: item.source_excerpt || null,
          original_date_text: item.original_date_text || null,
          confidence: item.confidence || 0.9,
          is_confirmed: true,
          google_event_id: null,
          google_calendar_id: null,
          last_google_sync_at: null,
          google_sync_status: 'not_synced' as const,
        }));

        await academicItemService.createItemsBulk(itemRows);
      }

      // Clean store
      reviewStore.clear();

      // Navigate to the newly created class dashboard
      router.replace(`/classes/${classRow.id}` as any);
    } catch (err: any) {
      console.error('Error saving extracted syllabus:', err);
      setError(err?.message || 'Failed to create dashboard');
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <ArrowLeft size={18} color={Colors.light.text} />
            <Text style={styles.backBtnText}>Upload</Text>
          </Pressable>

          <View style={styles.sourceTag}>
            <Sparkles size={13} color={Colors.light.primary} />
            <Text style={styles.sourceText} numberOfLines={1}>
              Extracted from {originalFilename}
            </Text>
          </View>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Review Extracted Syllabus</Text>
          <Text style={styles.pageSubtitle}>
            Verify details and correct any dates or assignments before creating
            your dashboard.
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Section 1: Course Information */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.cardSectionTitle}>Course Details</Text>

          <View style={styles.row}>
            <View style={{ flex: 1.5 }}>
              <Input
                label="Course Name *"
                value={courseName}
                onChangeText={setCourseName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Course Code *"
                value={courseCode}
                onChangeText={setCourseCode}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Professor Name"
                value={professorName}
                onChangeText={setProfessorName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Professor Email"
                value={professorEmail}
                onChangeText={setProfessorEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Semester" value={semester} onChangeText={setSemester} />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Office Hours"
                value={officeHours}
                onChangeText={setOfficeHours}
              />
            </View>
          </View>

          <Input
            label="Course Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{ height: 75, textAlignVertical: 'top' }}
          />

          {/* Color theme selection */}
          <View style={styles.colorPickerSection}>
            <Text style={styles.colorLabel}>Select Class Dashboard Color</Text>
            <View style={styles.colorGrid}>
              {CLASS_COLORS.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      isSelected && styles.colorCircleSelected,
                    ]}>
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Section 2: Grading Breakdown */}
        {extractedData.grading_breakdown && extractedData.grading_breakdown.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardSectionTitle}>Grading Policy</Text>
            <View style={styles.breakdownRow}>
              {extractedData.grading_breakdown.map((item, idx) => (
                <View key={idx} style={styles.breakdownItem}>
                  <Text style={styles.breakdownItemCategory}>{item.category}</Text>
                  <Text style={styles.breakdownItemWeight}>{item.weight}%</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Section 3: Extracted Assignments & Exams */}
        <Card style={styles.card}>
          <View style={styles.itemsHeader}>
            <View>
              <Text style={styles.cardSectionTitle}>
                Extracted Deadlines ({items.length})
              </Text>
              <Text style={styles.itemsSubtitle}>
                Edit or remove any items below before finalizing
              </Text>
            </View>
            <Button
              title="Add Item"
              variant="outline"
              size="sm"
              icon={<Plus size={14} color={Colors.light.text} />}
              onPress={handleAddItem}
            />
          </View>

          <View style={styles.itemsList}>
            {items.map((item, idx) => {
              const confidencePercent = Math.round((item.confidence || 0.9) * 100);

              return (
                <View key={idx} style={styles.reviewItemCard}>
                  {/* Top line of item */}
                  <View style={styles.itemTopRow}>
                    <View style={styles.typeSelectorRow}>
                      {(
                        ['assignment', 'exam', 'quiz', 'project', 'reading'] as AcademicItemType[]
                      ).map((t) => (
                        <Pressable
                          key={t}
                          onPress={() => handleUpdateItem(idx, { type: t })}
                          style={[
                            styles.typeChip,
                            item.type === t && styles.typeChipSelected,
                          ]}>
                          <Text
                            style={[
                              styles.typeChipText,
                              item.type === t && styles.typeChipTextSelected,
                            ]}>
                            {t}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Pressable
                      onPress={() => handleDeleteItem(idx)}
                      style={styles.deleteBtn}>
                      <Trash2 size={16} color={Colors.light.danger} />
                    </Pressable>
                  </View>

                  {/* Title & Points inputs */}
                  <View style={styles.row}>
                    <View style={{ flex: 3 }}>
                      <TextInput
                        style={styles.itemTitleInput}
                        value={item.title}
                        onChangeText={(text) => handleUpdateItem(idx, { title: text })}
                        placeholder="Task Title"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={styles.itemPointsInput}
                        value={item.points ? String(item.points) : ''}
                        onChangeText={(pts) =>
                          handleUpdateItem(idx, {
                            points: pts ? parseFloat(pts) : null,
                          })
                        }
                        placeholder="Points"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Due Date & Original Text */}
                  <View style={styles.dateRow}>
                    <View style={styles.dateInputWrapper}>
                      <Calendar size={13} color={Colors.light.textMuted} />
                      <TextInput
                        style={styles.dateInput}
                        value={item.due_date || ''}
                        onChangeText={(date) =>
                          handleUpdateItem(idx, { due_date: date })
                        }
                        placeholder="YYYY-MM-DD"
                      />
                    </View>

                    <View style={styles.confidenceBadge}>
                      <Sparkles size={11} color={Colors.light.primary} />
                      <Text style={styles.confidenceText}>
                        {confidencePercent}% confidence
                      </Text>
                    </View>
                  </View>

                  {/* Excerpt */}
                  {item.source_excerpt && (
                    <View style={styles.excerptContainer}>
                      <Text style={styles.excerptLabel}>Source in syllabus:</Text>
                      <Text style={styles.excerptText}>
                        &ldquo;{item.source_excerpt}&rdquo;
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Card>

        {/* Final Confirmation Action Bar */}
        <View style={styles.confirmationBar}>
          <Button
            title="Confirm & Generate Dashboard"
            icon={<CheckCircle2 size={18} color="#FFFFFF" />}
            onPress={handleConfirmAndSave}
            loading={saving}
            size="lg"
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 720,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
  },
  emptyTitle: {
    ...Typography.lg,
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
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.full,
    maxWidth: 240,
  },
  sourceText: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  titleSection: {
    marginBottom: Spacing.five,
  },
  pageTitle: {
    ...Typography['2xl'],
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: Colors.light.dangerLight,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    ...Typography.sm,
    color: Colors.light.danger,
    fontWeight: '500',
  },
  card: {
    padding: Spacing.five,
    marginBottom: Spacing.four,
  },
  cardSectionTitle: {
    ...Typography.lg,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  colorPickerSection: {
    marginTop: Spacing.two,
  },
  colorLabel: {
    ...Typography.sm,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  breakdownItem: {
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  breakdownItemCategory: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.text,
  },
  breakdownItemWeight: {
    ...Typography.xs,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.four,
  },
  itemsSubtitle: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    marginTop: -8,
  },
  itemsList: {
    gap: Spacing.three,
  },
  reviewItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.four,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  typeChip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  typeChipSelected: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  typeChipText: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    textTransform: 'capitalize',
  },
  typeChipTextSelected: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 6,
  },
  itemTitleInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    ...Typography.sm,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  itemPointsInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    ...Typography.sm,
    color: Colors.light.text,
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.two,
    gap: 6,
    flex: 1,
    maxWidth: 200,
  },
  dateInput: {
    ...Typography.xs,
    color: Colors.light.text,
    paddingVertical: 6,
    flex: 1,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.primaryLight,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  confidenceText: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  excerptContainer: {
    marginTop: Spacing.two,
    backgroundColor: '#FFFFFF',
    padding: Spacing.two,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.primary,
  },
  excerptLabel: {
    ...Typography.xs,
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  excerptText: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  confirmationBar: {
    marginTop: Spacing.four,
    marginBottom: Spacing.eight,
  },
  pressed: {
    opacity: 0.8,
  },
});
