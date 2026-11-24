import { Platform } from 'react-native';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { File as ModernFile } from 'expo-file-system';
import { ExtractedSyllabus } from '@/types/academic';
import { analyzeSyllabusProgrammatic } from '@/lib/syllabusEngine';
import { syllabusService } from './syllabus.service';

export interface SelectedFile {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  file?: File;
  base64?: string | null;
}

export const syllabusExtractionService = {
  isDocxFile(filename: string, mimeType?: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.endsWith('.docx') ||
      lower.endsWith('.doc') ||
      (mimeType ? mimeType.includes('word') || mimeType.includes('document') : false)
    );
  },

  async convertFileToBase64(file: SelectedFile): Promise<string> {
    if (file.base64) return file.base64;

    // Method 1: Web File API with FileReader
    if (Platform.OS === 'web' && file.file && typeof FileReader !== 'undefined') {
      try {
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            const base64 = res.split(',')[1] || res;
            resolve(base64);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file.file!);
        });
      } catch (e) {
        console.warn('FileReader on file.file failed, trying next method:', e);
      }
    }

    // Method 2: expo-file-system/legacy
    if (file.uri) {
      try {
        if (typeof LegacyFileSystem.readAsStringAsync === 'function') {
          const base64 = await LegacyFileSystem.readAsStringAsync(file.uri, {
            encoding: LegacyFileSystem.EncodingType.Base64,
          });
          if (base64) return base64;
        }
      } catch (legacyErr) {
        console.warn('LegacyFileSystem.readAsStringAsync attempt:', legacyErr);
      }
    }

    // Method 3: Modern expo-file-system File API
    if (file.uri) {
      try {
        if (typeof ModernFile === 'function') {
          const modernFile = new ModernFile(file.uri);
          if (typeof modernFile.arrayBuffer === 'function') {
            const buffer = await modernFile.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
          }
        }
      } catch (modernErr) {
        console.warn('ModernFile arrayBuffer attempt:', modernErr);
      }
    }

    // Method 4: Universal fetch(uri) -> blob -> FileReader
    if (file.uri && typeof FileReader !== 'undefined') {
      try {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            const base64 = res.split(',')[1] || res;
            resolve(base64);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(blob);
        });
      } catch (blobErr) {
        console.warn('fetch blob reader attempt:', blobErr);
      }
    }

    throw new Error('Unable to read document file. Please select another file.');
  },

  async analyzeSyllabus(
    userId: string,
    file: SelectedFile
  ): Promise<{ data: ExtractedSyllabus | null; storagePath: string | null; error: any }> {
    try {
      const isDocx = this.isDocxFile(file.name, file.mimeType);

      // 1. Convert to base64
      const base64 = await this.convertFileToBase64(file);

      // 2. Upload file to Supabase storage (non-blocking if storage bucket not configured)
      let storagePath: string | null = null;
      try {
        if (userId && userId !== 'guest_student') {
          const { path } = await syllabusService.uploadSyllabusFile(userId, {
            ...file,
            base64,
          });
          storagePath = path;
        }
      } catch (uploadErr) {
        console.warn('Storage upload optional step skipped:', uploadErr);
      }

      // 3. Try server API route /api/analyze-syllabus
      try {
        const response = await fetch('/api/analyze-syllabus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdfBase64: base64,
            filename: file.name,
            fileType: isDocx ? 'docx' : 'pdf',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            return { data: result.data, storagePath, error: null };
          }
        } else {
          const errData = await response.json().catch(() => null);
          if (errData?.isScanned) {
            throw new Error(errData.error || 'Scanned document detected. OCR is required.');
          }
          console.warn(
            `Server API route returned ${response.status}, using in-app extraction engine...`
          );
        }
      } catch (netErr: any) {
        if (netErr?.message && (netErr.message.includes('OCR') || netErr.message.includes('scanned'))) {
          throw netErr;
        }
        console.warn(
          'Network to /api/analyze-syllabus unavailable, using in-app extraction engine:',
          netErr?.message || netErr
        );
      }

      // 4. In-App Programmatic Extraction Engine Fallback
      // Completely programmatic: uses pdfjs-dist, chrono-node, compromise, date-fns, and Zod
      const programmaticResult = await analyzeSyllabusProgrammatic({
        pdfBase64: base64,
        filename: file.name,
        fileType: isDocx ? 'docx' : 'pdf',
      });

      return {
        data: programmaticResult.data,
        storagePath,
        error: null,
      };
    } catch (error: any) {
      console.error('syllabusExtractionService.analyzeSyllabus error:', error);
      return { data: null, storagePath: null, error };
    }
  },

  // Sample syllabi for instant testing and demonstration
  getDemoSyllabi(): { name: string; courseCode: string; text: string }[] {
    return [
      {
        name: 'CS 350: Operating Systems & Systems Programming',
        courseCode: 'CS 350',
        text: `CS 350: Operating Systems & Systems Programming
Instructor: Dr. Sarah Chen (schen@university.edu)
Office Hours: Tuesdays & Thursdays 2:00 PM - 4:00 PM, Turing Hall Room 402
Semester: Fall 2026

Course Description:
Comprehensive study of fundamental operating systems concepts: concurrency, memory virtualization, file systems, and scheduling.

Grading Policy:
- Programming Projects: 40%
- Midterm Exam: 25%
- Final Exam: 30%
- Homework & Quizzes: 5%

Required Textbooks:
- "Operating Systems: Three Easy Pieces" by Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau

Late Policy:
Each student receives 3 slip days. Subsequent late submissions will be penalized 10% per day up to 3 days.

Attendance Policy:
Attendance is strongly encouraged. Class discussions and live code demos will not all be recorded.

Course Schedule & Deadlines:
1. Assignment 1: Thread Concurrency & Locks - Due: 2026-09-18 (50 pts)
2. Quiz 1: Concurrency Primitives - Date: 2026-09-25 (20 pts)
3. Project 1: User-Level Thread Scheduler - Due: 2026-10-09 (100 pts)
4. Midterm Examination: Virtual Memory & CPU Scheduling - Date: 2026-10-22 (150 pts)
5. Assignment 2: Page Replacement Algorithms - Due: 2026-11-06 (50 pts)
6. Project 2: Ext2 File System Driver - Due: 2026-11-20 (120 pts)
7. Final Examination: Cumulative Exam - Date: 2026-12-14 (200 pts)`,
      },
      {
        name: 'ECON 201: Principles of Macroeconomics',
        courseCode: 'ECON 201',
        text: `ECON 201: Principles of Macroeconomics
Instructor: Prof. Marcus Vance (mvance@university.edu)
Semester: Fall 2026
Office Hours: Wednesdays 10:00 AM - 12:00 PM, Smith Hall 210

Description:
Analysis of aggregate economic activity, GDP, inflation, unemployment, fiscal policy, monetary policy, and international trade.

Grading Breakdown:
- Problem Sets: 20%
- Midterm 1: 20%
- Midterm 2: 25%
- Final Exam: 35%

Late Submission Policy:
No late assignments accepted without dean's excuse.

Schedule:
1. Problem Set 1: GDP Measurement & National Accounts - Due: 2026-09-22
2. Midterm 1: Supply, Demand & Inflation - Date: 2026-10-08
3. Problem Set 2: Aggregate Demand and IS-LM - Due: 2026-10-29
4. Midterm 2: Monetary Policy and Banking - Date: 2026-11-12
5. Policy Paper: Federal Reserve Analysis - Due: 2026-12-01
6. Final Comprehensive Exam - Date: 2026-12-16`,
      },
    ];
  },
};

// Backwards-compatible alias for existing imports
export const aiSyllabusService = syllabusExtractionService;
