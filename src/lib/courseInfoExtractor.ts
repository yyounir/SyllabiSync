/**
 * SyllabiSync - Course Info Extractor Module
 * Programmatically extracts course metadata (code, name, professor, semester,
 * office hours, description, grading breakdown, textbooks, policies).
 */

import { SyllabusSections } from './sectionDivider';

export interface GradingCategory {
  category: string;
  weight: number;
}

export interface ExtractedCourseInfo {
  course_name: string;
  course_code: string;
  professor_name: string;
  professor_email: string;
  semester: string;
  description: string;
  office_hours: string | null;
  attendance_policy: string | null;
  late_policy: string | null;
  grading_breakdown: GradingCategory[];
  required_textbooks: string[];
}

/**
 * Extracts course code (e.g. "CS 350", "ECON 201", "MATH-241", "PHYS 1010")
 */
export function extractCourseCode(text: string, sections: SyllabusSections): string {
  // Check the header lines first as course code almost always appears at the very beginning
  const searchSpace = `${sections.header}\n${text.slice(0, 1500)}`;

  // Matches codes like "CS 350", "CS-350", "CS350", "ECON 201", "BIOL 101L", "CHEM 1210"
  const codeRegexes = [
    /\b([A-Z]{2,6})\s*[-_]?\s*([0-9]{3,4}[A-Z]?)\b/,
    /\b([A-Z]{2,4})\s+([0-9]{2,4})\b/,
  ];

  for (const regex of codeRegexes) {
    const match = searchSpace.match(regex);
    if (match) {
      const prefix = match[1].toUpperCase();
      const num = match[2].toUpperCase();
      return `${prefix} ${num}`;
    }
  }

  return 'COURSE 101';
}

/**
 * Extracts course name/title (e.g. "Operating Systems & Systems Programming")
 */
export function extractCourseName(
  text: string,
  sections: SyllabusSections,
  courseCode: string
): string {
  const searchSpace = `${sections.header}\n${text.slice(0, 1500)}`;
  const lines = searchSpace.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // Pattern 1: Explicit labels like "Course Name:", "Course Title:"
  for (const line of lines) {
    const labelMatch = line.match(/^(?:course\s+(?:title|name)|subject):\s*(.+)$/i);
    if (labelMatch && labelMatch[1]) {
      const clean = cleanCourseTitle(labelMatch[1]);
      if (clean) return clean;
    }
  }

  // Pattern 2: Line containing courseCode followed by colon or hyphen and title
  // e.g. "CS 350: Operating Systems & Systems Programming"
  const escapedCode = courseCode.replace(/\s+/g, '\\s*');
  const codePattern = new RegExp(`(?:${escapedCode})\\s*[:\\-–—|]\\s*([^\\n]+)`, 'i');
  const codeMatch = searchSpace.match(codePattern);
  if (codeMatch && codeMatch[1]) {
    const clean = cleanCourseTitle(codeMatch[1]);
    if (clean) return clean;
  }

  // Pattern 3: Top prominent line in header that isn't a university name, professor name, or syllabus title
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    if (
      !/university|college|department|syllabus|fall|spring|summer|winter|semester|instructor|professor|dr\./i.test(
        line
      ) &&
      line.length > 5 &&
      line.length < 90
    ) {
      // Remove any leading code if embedded
      const withoutCode = line.replace(/^[A-Z]{2,5}\s*\d{3,4}[:\-]?\s*/i, '').trim();
      if (withoutCode.length > 5) {
        return cleanCourseTitle(withoutCode);
      }
    }
  }

  return 'Academic Course';
}

function cleanCourseTitle(raw: string): string {
  return raw
    .replace(/\b(?:syllabus|fall|spring|summer|winter|semester|section\s*\d+)\b.*$/i, '')
    .replace(/[:\-–—|]$/, '')
    .trim();
}

/**
 * Extracts professor / instructor name
 */
export function extractProfessorName(text: string, sections: SyllabusSections): string {
  const searchSpace = `${sections.instructor}\n${sections.header}\n${text.slice(0, 2000)}`;

  // Matches "Instructor: Dr. Sarah Chen", "Professor: Marcus Vance"
  const instructorPrefixMatch = searchSpace.match(
    /(?:instructor|professor|faculty|lecturer|taught\s+by|teacher):\s*([^\n,;(]+)/i
  );
  if (instructorPrefixMatch && instructorPrefixMatch[1]) {
    const name = instructorPrefixMatch[1].trim();
    const clean = name.replace(/^(?:dr\.|prof\.|mr\.|ms\.|mrs\.)\s*/i, '').trim();
    if (clean.length > 2 && clean.length < 60 && !/@/.test(clean)) {
      return name;
    }
  }

  // Check for "Dr. First Last" or "Prof. First Last"
  const titleMatch = searchSpace.match(/\b(?:Dr\.|Prof\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[0].trim();
  }

  return 'Instructor';
}

/**
 * Extracts professor email
 */
export function extractProfessorEmail(text: string, sections: SyllabusSections): string {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  // Search instructor section first
  const instructorEmails = sections.instructor.match(emailRegex);
  if (instructorEmails && instructorEmails.length > 0) {
    return instructorEmails[0].toLowerCase();
  }

  // Search header
  const headerEmails = sections.header.match(emailRegex);
  if (headerEmails && headerEmails.length > 0) {
    return headerEmails[0].toLowerCase();
  }

  // Search full document
  const anyEmail = text.match(emailRegex);
  if (anyEmail && anyEmail.length > 0) {
    return anyEmail[0].toLowerCase();
  }

  return '';
}

/**
 * Extracts semester (e.g. "Fall 2026", "Spring 2027")
 */
export function extractSemester(text: string, sections: SyllabusSections): string {
  const searchSpace = `${sections.header}\n${text.slice(0, 2000)}`;
  const semesterMatch = searchSpace.match(
    /\b(Fall|Spring|Summer|Winter|Autumn)\s+(20\d\d)\b/i
  );

  if (semesterMatch) {
    const term =
      semesterMatch[1].charAt(0).toUpperCase() + semesterMatch[1].slice(1).toLowerCase();
    const year = semesterMatch[2];
    return `${term} ${year}`;
  }

  return 'Fall 2026';
}

/**
 * Extracts office hours
 */
export function extractOfficeHours(text: string, sections: SyllabusSections): string | null {
  const searchSpace = `${sections.instructor}\n${sections.header}\n${text}`;
  const lines = searchSpace.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:office\s+hours|student\s+hours|consultation):/i.test(line)) {
      // Collect this line and up to 2 continuation lines
      const parts = [line.replace(/^.*(?:office\s+hours|student\s+hours|consultation):\s*/i, '').trim()];
      for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (!nextLine || /^[A-Z][A-Za-z\s]+:/.test(nextLine)) break;
        parts.push(nextLine);
      }
      const combined = parts.filter(Boolean).join(', ');
      if (combined.length > 3) return combined;
    }
  }

  return null;
}

/**
 * Extracts course description
 */
export function extractCourseDescription(text: string, sections: SyllabusSections): string {
  if (sections.description && sections.description.length > 20) {
    // Truncate to reasonable summary if overly verbose
    return sections.description.slice(0, 1000).trim();
  }

  // Search for description label in full text
  const match = text.match(
    /(?:course\s+)?(?:description|overview|summary):\s*\n*([^#\n]+(?:\n[^\n#]+){0,4})/i
  );
  if (match && match[1]) {
    return match[1].trim();
  }

  return '';
}

/**
 * Extracts attendance policy
 */
export function extractAttendancePolicy(text: string, sections: SyllabusSections): string | null {
  const searchSpace = `${sections.policies}\n${text}`;
  const match = searchSpace.match(
    /(?:attendance(?:\s+policy)?|class\s+attendance):\s*\n*([^#\n]+(?:\n[^\n#]+){0,3})/i
  );
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * Extracts late work / submission policy
 */
export function extractLatePolicy(text: string, sections: SyllabusSections): string | null {
  const searchSpace = `${sections.policies}\n${text}`;
  const match = searchSpace.match(
    /(?:late\s+(?:work|policy|submission|assignments?)|slip\s+days):\s*\n*([^#\n]+(?:\n[^\n#]+){0,3})/i
  );
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * Extracts grading breakdown categories & percentages
 * e.g. "Programming Projects: 40%", "Midterm: 25%", "Final: 30%", "Homework: 5%"
 */
export function extractGradingBreakdown(
  text: string,
  sections: SyllabusSections
): GradingCategory[] {
  const searchSpace = sections.grading || text;
  const lines = searchSpace.split('\n');
  const results: GradingCategory[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Matches:
    // "- Programming Projects: 40%"
    // "Midterm Exam - 25%"
    // "Homework: 20%"
    // "Final Exam ... 35%"
    const match = trimmed.match(
      /^(?:[-*•]\s*)?([A-Za-z\s&/]{3,40})\s*[:\-–—\.]+\s*(\d+(?:\.\d+)?)\s*%/i
    );

    if (match && match[1] && match[2]) {
      const category = match[1].trim();
      const weight = parseFloat(match[2]);

      // Skip lines where category is an excluded word
      if (!/total|grade|scale|minimum|maximum|average|letter/i.test(category)) {
        if (weight > 0 && weight <= 100) {
          results.push({ category, weight });
        }
      }
    }
  }

  return results;
}

/**
 * Extracts required textbooks / materials
 */
export function extractRequiredTextbooks(
  text: string,
  sections: SyllabusSections
): string[] {
  const searchSpace = sections.textbooks || '';
  if (!searchSpace) return [];

  const lines = searchSpace.split('\n');
  const books: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Bullet lines or quoted lines
    if (/^[-*•]\s+/.test(trimmed) || /^"[^"]+"/.test(trimmed)) {
      const clean = trimmed.replace(/^[-*•]\s*/, '').trim();
      if (clean.length > 5 && clean.length < 200) {
        books.push(clean);
      }
    }
  }

  return books;
}

/**
 * Main coordinator for extracting all course metadata.
 */
export function extractCourseInformation(
  fullText: string,
  sections: SyllabusSections
): ExtractedCourseInfo {
  const course_code = extractCourseCode(fullText, sections);
  const course_name = extractCourseName(fullText, sections, course_code);
  const professor_name = extractProfessorName(fullText, sections);
  const professor_email = extractProfessorEmail(fullText, sections);
  const semester = extractSemester(fullText, sections);
  const description = extractCourseDescription(fullText, sections);
  const office_hours = extractOfficeHours(fullText, sections);
  const attendance_policy = extractAttendancePolicy(fullText, sections);
  const late_policy = extractLatePolicy(fullText, sections);
  const grading_breakdown = extractGradingBreakdown(fullText, sections);
  const required_textbooks = extractRequiredTextbooks(fullText, sections);

  return {
    course_name,
    course_code,
    professor_name,
    professor_email,
    semester,
    description,
    office_hours,
    attendance_policy,
    late_policy,
    grading_breakdown,
    required_textbooks,
  };
}
