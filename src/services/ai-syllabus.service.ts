import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ExtractedSyllabus } from '@/types/academic';
import { syllabusService } from './syllabus.service';

export interface SelectedFile {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  file?: File;
  base64?: string | null;
}

export const aiSyllabusService = {
  async convertFileToBase64(file: SelectedFile): Promise<string> {
    if (file.base64) return file.base64;

    if (Platform.OS === 'web' && file.file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          // Strip data:application/pdf;base64, prefix
          const base64 = res.split(',')[1] || res;
          resolve(base64);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file.file!);
      });
    }

    if (Platform.OS !== 'web' && file.uri) {
      const fsAny = FileSystem as any;
      if (typeof fsAny.readAsStringAsync === 'function') {
        const base64 = await fsAny.readAsStringAsync(file.uri, {
          encoding: fsAny.EncodingType?.Base64 || 'base64',
        });
        return base64;
      }
    }

    throw new Error('Unable to read syllabus file as base64');
  },

  async analyzeSyllabus(
    userId: string,
    file: SelectedFile
  ): Promise<{ data: ExtractedSyllabus | null; storagePath: string | null; error: any }> {
    try {
      // 1. Convert to base64
      const base64 = await this.convertFileToBase64(file);

      // 2. Upload file to Supabase storage
      const { path: storagePath, error: uploadError } =
        await syllabusService.uploadSyllabusFile(userId, {
          ...file,
          base64,
        });

      if (uploadError) {
        console.warn('Storage upload error (continuing analysis):', uploadError);
      }

      // 3. Call server-side API route /api/analyze-syllabus
      const response = await fetch('/api/analyze-syllabus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64: base64,
          filename: file.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const result = await response.json();
      return { data: result.data, storagePath, error: null };
    } catch (error) {
      console.error('aiSyllabusService.analyzeSyllabus error:', error);
      return { data: null, storagePath: null, error };
    }
  },

  // Fallback demo syllabi for testing and instant hackathon demonstration
  getDemoSyllabi(): { name: string; courseCode: string; text: string }[] {
    return [
      {
        name: 'CS 350: Operating Systems & Systems Programming',
        courseCode: 'CS 350',
        text: `CS 350: Operating Systems
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
