/**
 * SyllabiSync - Deadlines & Academic Items Extractor Module
 * Programmatically extracts assignments, exams, quizzes, projects, and readings.
 * Uses chrono-node for date recognition, compromise for NLP, and date-fns for normalization.
 * Strictly avoids non-deadline dates (holidays, drops, recurring lectures).
 */

import * as chrono from 'chrono-node';
import { format, isValid } from 'date-fns';
import nlp from 'compromise';
import { ExtractedItem } from '../types/academic';
import { SyllabusSections } from './sectionDivider';

/**
 * Filter list of non-deadline triggers (holidays, drops, recurring events)
 */
const NON_DEADLINE_KEYWORDS = [
  /\b(?:thanksgiving|labor\s+day|memorial\s+day|mlk|martin\s+luther\s+king|columbus\s+day|presidents?\s+day)\b/i,
  /\b(?:spring\s+break|fall\s+break|winter\s+break|summer\s+break|recess|holiday|vacation)\b/i,
  /\b(?:no\s+class(?:es)?|university\s+closed|campus\s+closed|reading\s+day|reading\s+period)\b/i,
  /\b(?:add\s*\/\s*drop|last\s+day\s+to\s+drop|last\s+day\s+to\s+withdraw|withdrawal\s+deadline)\b/i,
  /\b(?:first\s+day\s+of\s+class(?:es)?|classes\s+begin|last\s+day\s+of\s+class(?:es)?|classes\s+end)\b/i,
  /\b(?:final\s+grades\s+due|tuition\s+due|registration|commencement|graduation)\b/i,
];

/**
 * Checks if a line is an administrative event or holiday rather than a student deadline.
 */
function isNonDeadline(line: string): boolean {
  for (const pattern of NON_DEADLINE_KEYWORDS) {
    if (pattern.test(line)) {
      // Exception: If line also explicitly says "due" or "assignment due", it might be an assignment due before break
      if (!/\b(?:assignment|homework|hw|project|exam|quiz)\b.*?\bdue\b/i.test(line)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Classifies the academic item type based on keywords in title/line.
 */
function determineItemType(
  line: string
): 'assignment' | 'exam' | 'quiz' | 'project' | 'reading' | 'other' {
  if (/\b(?:exam|midterm|final(?:\s+exam)?|test|examination)\b/i.test(line)) {
    return 'exam';
  }
  if (/\b(?:quiz|knowledge\s+check|pop\s+quiz)\b/i.test(line)) {
    return 'quiz';
  }
  if (
    /\b(?:project|milestone|term\s+paper|capstone|case\s+study|presentation|portfolio)\b/i.test(
      line
    )
  ) {
    return 'project';
  }
  if (
    /\b(?:reading|read\s+chapter|read\s+pages?|assigned\s+reading|article\s+review)\b/i.test(line)
  ) {
    return 'reading';
  }
  if (
    /\b(?:assignment|homework|hw|problem\s+set|pset|exercise|lab|worksheet|task|submission)\b/i.test(
      line
    )
  ) {
    return 'assignment';
  }
  return 'other';
}

/**
 * Extracts point value if present (e.g. "(50 pts)", "100 points", "20 pts")
 */
function extractPoints(line: string): number | null {
  const pointsMatch = line.match(
    /(?:\(|\b)(\d+(?:\.\d+)?)\s*(?:pts?|points?)(?:\)|\b)/i
  );
  if (pointsMatch && pointsMatch[1]) {
    const val = parseFloat(pointsMatch[1]);
    if (!isNaN(val) && val > 0 && val < 5000) {
      return val;
    }
  }
  return null;
}

/**
 * Generates an appropriate reference date from the semester string
 * to prevent chrono from misinterpreting month/day into the wrong year.
 */
function getReferenceDate(semester: string): Date {
  const yearMatch = semester.match(/20\d\d/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();

  if (/spring/i.test(semester)) {
    return new Date(year, 0, 15); // Jan 15
  }
  if (/summer/i.test(semester)) {
    return new Date(year, 4, 15); // May 15
  }
  // Default to Fall
  return new Date(year, 7, 25); // Aug 25
}

/**
 * Cleans the raw line into a concise and meaningful item title.
 */
function cleanItemTitle(rawLine: string, originalDateText?: string | null): string {
  let title = rawLine;

  // Remove leading numbers or bullets (e.g. "1.", "2)", "-", "*")
  title = title.replace(/^(?:[-*•]|\d+[\.\)])\s*/, '');

  // Remove points annotations like "(50 pts)" or "100 points"
  title = title.replace(/\(?\b\d+(?:\.\d+)?\s*(?:pts?|points?)\)?/gi, '');

  // Remove explicit "Due: ..." or "Date: ..." clauses
  title = title.replace(/[-–—|]?\s*(?:due(?:\s+date)?|date):\s*.*$/i, '');

  // Remove original date text if still at the end
  if (originalDateText) {
    title = title.replace(new RegExp(`[-–—|]?\\s*${escapeRegex(originalDateText)}.*$`, 'i'), '');
  }

  // Remove trailing colons, hyphens, or commas
  title = title.replace(/[:\-–—,\s]+$/, '').trim();

  // If title became too short or empty, fallback
  if (title.length < 3) {
    title = rawLine.replace(/^(?:[-*•]|\d+[\.\)])\s*/, '').slice(0, 50).trim();
  }

  // Refine text casing with compromise NLP
  try {
    const doc = nlp(title);
    const normalized = doc.text().trim();
    if (normalized.length >= 3) {
      title = normalized;
    }
  } catch {
    // ignore
  }

  return title;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determines whether a line contains an academic item.
 */
function isAcademicItemLine(line: string): boolean {
  // Line must not be a holiday or drop deadline
  if (isNonDeadline(line)) return false;

  // Must contain an academic category or explicit deadline marker
  const hasAcademicKeyword =
    /\b(?:assignment|homework|hw|problem\s+set|pset|project|exam|midterm|final|quiz|lab|reading|milestone|presentation|task|deliverable)\b/i.test(
      line
    );
  const hasDeadlineMarker = /\b(?:due(?:\s+date)?|submit(?:\s+by)?|deadline|date:)\b/i.test(line);

  return hasAcademicKeyword || hasDeadlineMarker;
}

/**
 * Main extractor for all academic deadlines in a syllabus.
 */
export function extractDeadlines(
  fullText: string,
  sections: SyllabusSections,
  semester: string = 'Fall 2026'
): ExtractedItem[] {
  const refDate = getReferenceDate(semester);

  // Focus primarily on the schedule section, and secondary lines in full document
  const scheduleLines = (sections.schedule || '').split('\n');
  const allLines = fullText.split('\n');

  // Collect candidate lines prioritizing the schedule section
  const candidateLines: { text: string; inSchedule: boolean }[] = [];
  const seenLines = new Set<string>();

  for (const line of scheduleLines) {
    const trimmed = line.trim();
    if (trimmed && !seenLines.has(trimmed)) {
      seenLines.add(trimmed);
      candidateLines.push({ text: trimmed, inSchedule: true });
    }
  }

  for (const line of allLines) {
    const trimmed = line.trim();
    if (trimmed && !seenLines.has(trimmed)) {
      seenLines.add(trimmed);
      // Only include if it explicitly mentions assignment or due
      if (isAcademicItemLine(trimmed)) {
        candidateLines.push({ text: trimmed, inSchedule: false });
      }
    }
  }

  const items: ExtractedItem[] = [];

  for (const candidate of candidateLines) {
    const line = candidate.text;

    if (!isAcademicItemLine(line)) {
      continue;
    }

    // Parse dates with chrono
    const parsedResults = chrono.parse(line, refDate);
    if (!parsedResults || parsedResults.length === 0) {
      // If line is strongly an assignment (e.g. "Assignment 3: File System") without a date,
      // we can still capture it with due_date = null if it has clear assignment naming
      if (
        /\b(?:assignment|project|exam|quiz|midterm|final)\s+\d+\b/i.test(line) &&
        candidate.inSchedule
      ) {
        const itemType = determineItemType(line);
        const points = extractPoints(line);
        const title = cleanItemTitle(line);

        items.push({
          title,
          description: '',
          type: itemType,
          due_date: null,
          original_date_text: null,
          points,
          confidence: 0.75,
          source_excerpt: line,
          is_tentative: true,
        });
      }
      continue;
    }

    const firstDate = parsedResults[0];
    const jsDate = firstDate.start.date();

    if (!isValid(jsDate)) continue;

    // Check if time components were specified
    const hasCertainHour = firstDate.start.isCertain('hour');
    let isoDate: string;

    if (hasCertainHour) {
      isoDate = format(jsDate, "yyyy-MM-dd'T'HH:mm:ss");
    } else {
      isoDate = format(jsDate, 'yyyy-MM-dd');
    }

    const originalDateText = firstDate.text;
    const itemType = determineItemType(line);
    const points = extractPoints(line);
    const title = cleanItemTitle(line, originalDateText);

    // Tentative detection
    const is_tentative = /\b(?:tentative|subject\s+to\s+change|tbd|approx|estimated)\b/i.test(
      line
    );

    // Confidence scoring
    let confidence = 0.85;
    if (/\bdue\b/i.test(line)) confidence += 0.08;
    if (points !== null) confidence += 0.04;
    if (/\b(?:assignment|project|quiz|exam|midterm)\s+\d+\b/i.test(line)) confidence += 0.04;
    if (candidate.inSchedule) confidence += 0.04;
    if (is_tentative) confidence -= 0.15;

    confidence = Math.min(0.98, Math.max(0.5, Math.round(confidence * 100) / 100));

    items.push({
      title,
      description: '',
      type: itemType,
      due_date: isoDate,
      original_date_text: originalDateText,
      points,
      confidence,
      source_excerpt: line,
      is_tentative,
    });
  }

  // Deduplicate items with matching title or identical date/type
  const uniqueItems: ExtractedItem[] = [];
  const seenKeys = new Set<string>();

  for (const item of items) {
    const key = `${item.title.toLowerCase()}_${item.due_date || 'nodate'}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueItems.push(item);
    }
  }

  // Sort chronologically
  uniqueItems.sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return uniqueItems;
}
