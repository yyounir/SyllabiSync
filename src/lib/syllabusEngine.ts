/**
 * SyllabiSync - Programmatic Syllabus Extraction Engine
 * Fully independent, deterministic syllabus extraction without any AI API calls.
 * Orchestrates PDF extraction, text preprocessing, section dividing,
 * course information extraction, and deadline recognition with Zod validation.
 */

import mammoth from 'mammoth';
import { ExtractedSyllabus, ExtractedSyllabusSchema } from '../types/academic';
import { extractPdfText, PDFExtractionResult } from './pdfExtractor';
import { preprocessSyllabusText } from './textProcessor';
import { divideIntoSections } from './sectionDivider';
import { extractCourseInformation } from './courseInfoExtractor';
import { extractDeadlines } from './deadlinesExtractor';

export interface SyllabusEngineInput {
  pdfBase64?: string | null;
  pdfBuffer?: Uint8Array | Buffer | null;
  textContent?: string | null;
  filename?: string;
  fileType?: string;
}

export interface SyllabusEngineResult {
  success: boolean;
  data: ExtractedSyllabus;
  totalPages?: number;
  isScanned?: boolean;
  message?: string;
}

export class SyllabusExtractionError extends Error {
  isScanned: boolean;
  constructor(message: string, isScanned: boolean = false) {
    super(message);
    this.name = 'SyllabusExtractionError';
    this.isScanned = isScanned;
  }
}

/**
 * Extracts raw text from the provided document input (PDF, DOCX, or plain text).
 */
async function extractRawTextFromInput(
  input: SyllabusEngineInput
): Promise<{ text: string; totalPages: number; isScanned: boolean; message?: string }> {
  const { pdfBase64, pdfBuffer, textContent, filename = 'syllabus.pdf', fileType } = input;

  const isDocx =
    fileType === 'docx' ||
    filename.toLowerCase().endsWith('.docx') ||
    filename.toLowerCase().endsWith('.doc');

  // Case 1: Plain text already provided
  if (textContent && textContent.trim().length > 0) {
    return {
      text: textContent,
      totalPages: 1,
      isScanned: false,
    };
  }

  // Case 2: Word document (.docx / .doc)
  if (isDocx && pdfBase64) {
    try {
      const buffer = Buffer.from(pdfBase64, 'base64');
      const extracted = await mammoth.extractRawText({ buffer });
      const docText = extracted.value?.trim() || '';

      if (!docText) {
        throw new SyllabusExtractionError(
          'Could not extract text from the Word document. The file may be empty or corrupted.'
        );
      }

      return {
        text: docText,
        totalPages: 1,
        isScanned: false,
      };
    } catch (docxErr: any) {
      if (docxErr instanceof SyllabusExtractionError) throw docxErr;
      throw new SyllabusExtractionError(
        `Failed to parse Word document: ${docxErr.message || docxErr}`
      );
    }
  }

  // Case 3: PDF document (buffer or base64)
  const pdfData = pdfBuffer || pdfBase64;
  if (!pdfData) {
    throw new SyllabusExtractionError(
      'No document content was provided for analysis. Please select a PDF or Word document.'
    );
  }

  const pdfResult: PDFExtractionResult = await extractPdfText(pdfData, filename);

  if (pdfResult.isScanned) {
    throw new SyllabusExtractionError(
      pdfResult.message ||
        'This PDF appears to be a scanned document with no selectable text. OCR is required.',
      true
    );
  }

  if (!pdfResult.text || pdfResult.text.trim().length === 0) {
    throw new SyllabusExtractionError(
      'No extractable text was found in the PDF. Please verify the document has selectable text.'
    );
  }

  return {
    text: pdfResult.text,
    totalPages: pdfResult.totalPages,
    isScanned: false,
  };
}

/**
 * Main engine entry point.
 * Programmatically extracts structured syllabus information and validates it with Zod.
 */
export async function analyzeSyllabusProgrammatic(
  input: SyllabusEngineInput
): Promise<SyllabusEngineResult> {
  // 1. Extract raw text from document
  const { text: rawText, totalPages } = await extractRawTextFromInput(input);

  // 2. Normalize and preprocess text
  const preprocessedText = preprocessSyllabusText(rawText);

  // 3. Divide text into semantic sections
  const sections = divideIntoSections(preprocessedText);

  // 4. Extract course metadata (title, code, instructor, policies, grading)
  const courseInfo = extractCourseInformation(preprocessedText, sections);

  // 5. Extract academic deadlines (assignments, exams, quizzes, projects)
  const items = extractDeadlines(preprocessedText, sections, courseInfo.semester);

  // 6. Assemble complete syllabus object
  const unvalidatedSyllabus = {
    course_name: courseInfo.course_name,
    course_code: courseInfo.course_code,
    professor_name: courseInfo.professor_name,
    professor_email: courseInfo.professor_email,
    description: courseInfo.description,
    semester: courseInfo.semester,
    office_hours: courseInfo.office_hours,
    attendance_policy: courseInfo.attendance_policy,
    late_policy: courseInfo.late_policy,
    grading_breakdown: courseInfo.grading_breakdown,
    required_textbooks: courseInfo.required_textbooks,
    items,
  };

  // 7. Validate with Zod
  const validationResult = ExtractedSyllabusSchema.safeParse(unvalidatedSyllabus);

  let finalData: ExtractedSyllabus;

  if (validationResult.success) {
    finalData = validationResult.data;
  } else {
    console.warn(
      'Syllabus validation issues, normalizing defaults:',
      validationResult.error.format()
    );
    // Graceful fallback normalization
    finalData = {
      course_name: courseInfo.course_name || 'Academic Course',
      course_code: courseInfo.course_code || 'COURSE 101',
      professor_name: courseInfo.professor_name || 'Instructor',
      professor_email: courseInfo.professor_email || '',
      description: courseInfo.description || '',
      semester: courseInfo.semester || 'Fall 2026',
      office_hours: courseInfo.office_hours || null,
      attendance_policy: courseInfo.attendance_policy || null,
      late_policy: courseInfo.late_policy || null,
      grading_breakdown: courseInfo.grading_breakdown || [],
      required_textbooks: courseInfo.required_textbooks || [],
      items: items || [],
    };
  }

  return {
    success: true,
    data: finalData,
    totalPages,
    isScanned: false,
  };
}
