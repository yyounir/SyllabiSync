import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/hooks/useAuth';
import { aiSyllabusService, SelectedFile } from '@/services/ai-syllabus.service';
import { reviewStore } from '@/hooks/useReviewData';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  BookOpen,
  FileUp,
  Sparkles,
  Upload,
  AlertCircle,
  FileText,
} from 'lucide-react-native';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];

export default function UploadSyllabusScreen() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stepMessage, setStepMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handlePickDocument = async () => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'text/plain',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const lowerName = asset.name.toLowerCase();
        const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

        if (!hasValidExt) {
          setError(
            'Please select a supported document: PDF (.pdf) or Word document (.docx, .doc).'
          );
          return;
        }

        // Size check (15MB limit)
        if (asset.size && asset.size > 15 * 1024 * 1024) {
          setError('File size exceeds 15MB limit. Please upload a smaller document.');
          return;
        }

        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType || (lowerName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'),
          file: asset.file,
        });
      }
    } catch (err: any) {
      console.error('Error selecting syllabus:', err);
      setError('Could not access selected file.');
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      setError('Please select a syllabus document first.');
      return;
    }

    const currentUserId = user?.id || 'guest_student';

    setError(null);
    setProcessing(true);
    setProgress(15);
    setStepMessage('Reading document structure...');

    try {
      const isWord = aiSyllabusService.isDocxFile(selectedFile.name, selectedFile.mimeType);

      setProgress(35);
      setStepMessage(
        isWord
          ? 'Extracting Word (.docx) document content...'
          : 'Uploading syllabus to secure storage...'
      );

      setProgress(60);
      setStepMessage('Sending syllabus to Google Gemini AI (gemini-3.8-flash)...');

      const result = await aiSyllabusService.analyzeSyllabus(currentUserId, selectedFile);

      if (result.error) {
        throw new Error(result.error.message || 'Gemini syllabus analysis failed');
      }

      if (!result.data) {
        throw new Error('No structured course data could be extracted');
      }

      setProgress(85);
      setStepMessage('Validating extracted assignments, policies, and dates...');

      // Save to store for the review screen
      reviewStore.setPendingData({
        extractedData: result.data,
        originalFilename: selectedFile.name,
        storagePath: result.storagePath,
      });

      setProgress(100);
      setStepMessage('Complete! Opening review editor...');

      setTimeout(() => {
        router.push('/classes/review-syllabus');
      }, 400);
    } catch (err: any) {
      console.error('Syllabus analysis failed:', err);
      setError(
        err?.message ||
          'Failed to analyze syllabus. Please verify your document or try one of the sample syllabi.'
      );
      setProcessing(false);
    }
  };

  const handleUseDemo = async (demo: { name: string; courseCode: string; text: string }) => {
    setError(null);
    setProcessing(true);
    setProgress(30);
    setStepMessage(`Analyzing sample syllabus: ${demo.courseCode}...`);

    try {
      const response = await fetch('/api/analyze-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent: demo.text,
          filename: `${demo.courseCode}_Syllabus.txt`,
        }),
      });

      if (!response.ok) {
        throw new Error('Demo analysis request failed');
      }

      const res = await response.json();
      if (!res.success || !res.data) {
        throw new Error('Failed to parse demo syllabus');
      }

      setProgress(100);
      setStepMessage('Complete! Opening review editor...');

      reviewStore.setPendingData({
        extractedData: res.data,
        originalFilename: `${demo.courseCode}_Syllabus.pdf`,
        storagePath: null,
      });

      setTimeout(() => {
        router.push('/classes/review-syllabus');
      }, 400);
    } catch (err: any) {
      console.error('Demo syllabus failed:', err);
      setError(err?.message || 'Error running demo syllabus.');
      setProcessing(false);
    }
  };

  const demoSyllabi = aiSyllabusService.getDemoSyllabi();
  const isWordDoc = selectedFile
    ? aiSyllabusService.isDocxFile(selectedFile.name, selectedFile.mimeType)
    : false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {/* Back navigation */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <ArrowLeft size={18} color={Colors.light.text} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>

        {/* Title */}
        <View style={styles.titleSection}>
          <View style={styles.taglineBadge}>
            <Sparkles size={14} color={Colors.light.primary} />
            <Text style={styles.taglineText}>Powered by Google Gemini 3.8 Flash</Text>
          </View>
          <Text style={styles.pageTitle}>Upload Course Syllabus</Text>
          <Text style={styles.pageSubtitle}>
            Upload a syllabus PDF or Word document (.docx) and let Gemini extract your
            assignments, exams, grading weights, and semester schedule automatically.
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color={Colors.light.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Upload Drop Zone Card */}
        <Card variant="elevated" style={styles.uploadCard}>
          {!processing ? (
            <View style={styles.uploadZone}>
              <View
                style={[
                  styles.uploadIconCircle,
                  isWordDoc && { backgroundColor: '#EFF6FF' },
                ]}>
                {isWordDoc ? (
                  <FileText size={34} color="#2563EB" />
                ) : (
                  <FileUp size={34} color={Colors.light.primary} />
                )}
              </View>

              {selectedFile ? (
                <View style={styles.selectedFileInfo}>
                  <Text style={styles.selectedFileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.selectedFileSize}>
                    {isWordDoc
                      ? 'Word Document (.docx) Ready'
                      : selectedFile.size
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document`
                      : 'PDF Document Ready'}
                  </Text>
                  <Button
                    title="Change Document"
                    variant="outline"
                    size="sm"
                    onPress={handlePickDocument}
                    style={{ marginTop: Spacing.two }}
                  />
                </View>
              ) : (
                <View style={styles.pickPrompt}>
                  <Text style={styles.pickTitle}>Select your syllabus file</Text>
                  <Text style={styles.pickSubtitle}>
                    Supports PDF and Word (.docx, .doc) files up to 15MB
                  </Text>
                  <Button
                    title="Browse PDF or Word Document"
                    icon={<Upload size={16} color="#FFFFFF" />}
                    onPress={handlePickDocument}
                    style={styles.browseButton}
                  />
                </View>
              )}

              {selectedFile && (
                <Button
                  title="Extract with Gemini AI"
                  icon={<Sparkles size={16} color="#FFFFFF" />}
                  onPress={handleStartAnalysis}
                  style={styles.analyzeButton}
                />
              )}
            </View>
          ) : (
            /* Live Processing Status View */
            <View style={styles.processingView}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
              <Text style={styles.processingTitle}>Analyzing Syllabus</Text>
              <Text style={styles.processingSubtitle}>{stepMessage}</Text>
              <ProgressBar progress={progress} height={10} style={{ width: '85%' }} />
              <View style={styles.extractionNotes}>
                <Text style={styles.extractionNoteItem}>
                  ✓ Parsing {isWordDoc ? 'Word document' : 'PDF'} content
                </Text>
                <Text style={styles.extractionNoteItem}>
                  ✓ Calculating assignment dates & points
                </Text>
                <Text style={styles.extractionNoteItem}>
                  ✓ Formatting grading breakdown
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Instant Demo Syllabi Section */}
        {!processing && (
          <View style={styles.demoSection}>
            <View style={styles.demoHeader}>
              <BookOpen size={16} color={Colors.light.textSecondary} />
              <Text style={styles.demoHeaderText}>
                Or try a sample syllabus for instant demo
              </Text>
            </View>

            <View style={styles.demoList}>
              {demoSyllabi.map((demo, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleUseDemo(demo)}
                  style={({ pressed }) => [styles.demoCard, pressed && styles.pressed]}>
                  <View style={styles.demoIcon}>
                    <FileText size={18} color={Colors.light.primary} />
                  </View>
                  <View style={styles.demoInfo}>
                    <Text style={styles.demoCourseCode}>{demo.courseCode}</Text>
                    <Text style={styles.demoCourseName} numberOfLines={1}>
                      {demo.name}
                    </Text>
                  </View>
                  <Sparkles size={14} color={Colors.light.primary} />
                </Pressable>
              ))}
            </View>
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
  scrollContent: {
    padding: Spacing.four,
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 620,
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
    alignSelf: 'flex-start',
    marginBottom: Spacing.four,
  },
  backBtnText: {
    ...Typography.sm,
    fontWeight: '600',
    color: Colors.light.text,
  },
  titleSection: {
    marginBottom: Spacing.five,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.two,
  },
  taglineText: {
    ...Typography.xs,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  pageTitle: {
    ...Typography['2xl'],
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
    flex: 1,
  },
  uploadCard: {
    padding: Spacing.six,
    marginBottom: Spacing.five,
  },
  uploadZone: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  uploadIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  pickPrompt: {
    alignItems: 'center',
    width: '100%',
  },
  pickTitle: {
    ...Typography.lg,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  pickSubtitle: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.four,
  },
  browseButton: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.six,
  },
  selectedFileInfo: {
    alignItems: 'center',
    marginBottom: Spacing.four,
    width: '100%',
  },
  selectedFileName: {
    ...Typography.md,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
  },
  selectedFileSize: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  analyzeButton: {
    width: '100%',
    marginTop: Spacing.three,
  },
  processingView: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.three,
  },
  processingTitle: {
    ...Typography.xl,
    fontWeight: '800',
    color: Colors.light.text,
  },
  processingSubtitle: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  extractionNotes: {
    marginTop: Spacing.four,
    gap: 4,
  },
  extractionNoteItem: {
    ...Typography.xs,
    color: Colors.light.textMuted,
  },
  demoSection: {
    marginTop: Spacing.two,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.three,
  },
  demoHeaderText: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoList: {
    gap: Spacing.two,
  },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: Spacing.three,
  },
  demoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoInfo: {
    flex: 1,
  },
  demoCourseCode: {
    ...Typography.xs,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  demoCourseName: {
    ...Typography.sm,
    fontWeight: '600',
    color: Colors.light.text,
  },
  pressed: {
    opacity: 0.85,
  },
});
