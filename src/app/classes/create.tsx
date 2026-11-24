import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { classService } from '@/services/class.service';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Colors, CLASS_COLORS } from '@/constants/colors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { ArrowLeft, BookOpen, Check, Mail, User } from 'lucide-react-native';

export default function CreateClassScreen() {
  const { user } = useAuth();
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [professorName, setProfessorName] = useState('');
  const [professorEmail, setProfessorEmail] = useState('');
  const [semester, setSemester] = useState('Fall 2026');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(CLASS_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!courseName.trim() || !courseCode.trim()) {
      setError('Course name and course code are required.');
      return;
    }

    const effectiveUserId = user?.id || 'guest_student';

    setError(null);
    setLoading(true);

    const { data, error: createError } = await classService.createClass({
      user_id: effectiveUserId,
      course_name: courseName.trim(),
      course_code: courseCode.trim().toUpperCase(),
      professor_name: professorName.trim() || 'TBD',
      professor_email: professorEmail.trim() || '',
      semester: semester.trim() || 'Fall 2026',
      description: description.trim() || '',
      color: selectedColor,
      grading_breakdown: [],
      required_textbooks: [],
    });

    setLoading(false);

    if (createError) {
      setError(createError.message || 'Failed to create class');
    } else if (data) {
      router.replace(`/classes/${data.id}` as any);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
              <ArrowLeft size={20} color={Colors.light.text} />
            </Pressable>
            <View>
              <Text style={styles.title}>Create New Class</Text>
              <Text style={styles.subtitle}>Enter course details manually</Text>
            </View>
          </View>

          <Card variant="elevated" style={styles.card}>
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Input
              label="Course Name *"
              placeholder="e.g. Distributed Systems"
              value={courseName}
              onChangeText={setCourseName}
              leftIcon={<BookOpen size={18} color={Colors.light.textMuted} />}
            />

            <Input
              label="Course Code *"
              placeholder="e.g. CS 436"
              value={courseCode}
              onChangeText={setCourseCode}
              autoCapitalize="characters"
            />

            <Input
              label="Professor Name"
              placeholder="e.g. Dr. Jane Smith"
              value={professorName}
              onChangeText={setProfessorName}
              leftIcon={<User size={18} color={Colors.light.textMuted} />}
            />

            <Input
              label="Professor Email"
              placeholder="e.g. jsmith@university.edu"
              value={professorEmail}
              onChangeText={setProfessorEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={18} color={Colors.light.textMuted} />}
            />

            <Input
              label="Semester"
              placeholder="e.g. Fall 2026"
              value={semester}
              onChangeText={setSemester}
            />

            <Input
              label="Course Description"
              placeholder="Brief course overview..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.multilineInput}
            />

            {/* Color Picker */}
            <View style={styles.colorPickerSection}>
              <Text style={styles.colorLabel}>Class Theme Color</Text>
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

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => router.back()}
                style={styles.actionBtn}
              />
              <Button
                title="Create Class"
                onPress={handleCreate}
                loading={loading}
                style={styles.actionBtn}
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.four,
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  container: {
    width: '100%',
    maxWidth: 580,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.xl,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  card: {
    padding: Spacing.six,
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
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorPickerSection: {
    marginBottom: Spacing.five,
  },
  colorLabel: {
    ...Typography.sm,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 0 0 2px #274f73' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 3,
      },
    }),
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  actionBtn: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
