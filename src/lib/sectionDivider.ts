/**
 * SyllabiSync - Section Divider Module
 * Divides preprocessed syllabus text into semantically distinct sections:
 * Header/Course Info, Instructor Details, Description, Textbooks,
 * Grading Breakdown, Policies, and Schedule/Deadlines.
 */

export type SectionType =
  | 'header'
  | 'instructor'
  | 'description'
  | 'textbooks'
  | 'grading'
  | 'policies'
  | 'schedule'
  | 'other';

export interface SectionBlock {
  type: SectionType;
  title: string;
  content: string;
}

export interface SyllabusSections {
  header: string;
  instructor: string;
  description: string;
  textbooks: string;
  grading: string;
  policies: string;
  schedule: string;
  rawBlocks: SectionBlock[];
}

interface SectionHeaderPattern {
  type: SectionType;
  regex: RegExp;
}

const SECTION_PATTERNS: SectionHeaderPattern[] = [
  {
    type: 'schedule',
    regex:
      /^(?:#+\s*)?(?:(?:\d+|[IVXLCDM]+)[\.\)]\s*)?(?:course\s+|tentative\s+|class\s+|weekly\s+|semester\s+)?(?:schedule|calendar|timeline|course\s+outline|important\s+dates|deadlines|assignments\s*(?:and|&)\s*(?:schedule|deadlines)|lecture\s+schedule|syllabus\s+schedule)\b.*$/i,
  },
  {
    type: 'grading',
    regex:
      /^(?:#+\s*)?(?:(?:\d+|[IVXLCDM]+)[\.\)]\s*)?(?:grading(?:\s+(?:policy|breakdown|criteria|scheme|scale|distribution|system))?|evaluation(?:\s+criteria)?|assessment(?:s|\s+and\s+grading)?|grade\s+determination|grade\s+breakdown)\b.*$/i,
  },
  {
    type: 'textbooks',
    regex:
      /^(?:#+\s*)?(?:(?:\d+|[IVXLCDM]+)[\.\)]\s*)?(?:required\s+)?(?:textbooks?|texts?|course\s+materials?|readings?|required\s+readings?|books?|recommended\s+text(?:s|books)?)\b.*$/i,
  },
  {
    type: 'description',
    regex:
      /^(?:#+\s*)?(?:(?:\d+|[IVXLCDM]+)[\.\)]\s*)?(?:course\s+)?(?:description|overview|summary|objectives|learning\s+outcomes|goals|catalog\s+description)\b.*$/i,
  },
  {
    type: 'policies',
    regex:
      /^(?:#+\s*)?(?:(?:\d+|[IVXLCDM]+)[\.\)]\s*)?(?:course\s+policies|policies(?:\s+and\s+expectations)?|attendance(?:\s+policy)?|late\s+(?:work|policy|submission)|academic\s+integrity|honor\s+code|class\s+expectations)\b.*$/i,
  },
  {
    type: 'instructor',
    regex:
      /^(?:#+\s*)?(?:(?:\d+|[IVXLCDM]+)[\.\)]\s*)?(?:instructor(?:\s+information)?|professor(?:\s+info)?|faculty(?:\s+information)?|contact\s+information|teaching\s+team|office\s+hours|teaching\s+assistants?|ta\s+information)\b.*$/i,
  },
];

/**
 * Checks whether a single line looks like a section header.
 */
function matchSectionHeader(line: string): { type: SectionType; title: string } | null {
  const trimmed = line.trim();

  // Headers are usually concise (rarely longer than 75 characters)
  if (trimmed.length > 75 || trimmed.length < 3) return null;

  // Don't treat bullet points or assignment items as section headers
  if (/^[-*•]\s+/i.test(trimmed)) return null;

  // Don't treat due dates or assignment lines as section headers
  if (/\b(?:due|pts?|points?)\b/i.test(trimmed) && /\d/.test(trimmed)) return null;

  for (const pattern of SECTION_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return {
        type: pattern.type,
        title: trimmed.replace(/^#+\s*/, '').replace(/:$/, '').trim(),
      };
    }
  }

  return null;
}

/**
 * Divides preprocessed text into structured sections.
 */
export function divideIntoSections(preprocessedText: string): SyllabusSections {
  const lines = preprocessedText.split('\n');
  const blocks: SectionBlock[] = [];

  let currentType: SectionType = 'header';
  let currentTitle: string = 'Course Header';
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = matchSectionHeader(line);

    if (headerMatch) {
      // Save existing block if it has content
      if (currentLines.length > 0) {
        blocks.push({
          type: currentType,
          title: currentTitle,
          content: currentLines.join('\n').trim(),
        });
      }

      currentType = headerMatch.type;
      currentTitle = headerMatch.title;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Push remaining lines
  if (currentLines.length > 0) {
    blocks.push({
      type: currentType,
      title: currentTitle,
      content: currentLines.join('\n').trim(),
    });
  }

  // Aggregate content by section type
  const sections: SyllabusSections = {
    header: '',
    instructor: '',
    description: '',
    textbooks: '',
    grading: '',
    policies: '',
    schedule: '',
    rawBlocks: blocks,
  };

  for (const block of blocks) {
    if (block.type === 'header') {
      sections.header += (sections.header ? '\n\n' : '') + block.content;
    } else if (block.type === 'instructor') {
      sections.instructor += (sections.instructor ? '\n\n' : '') + block.content;
    } else if (block.type === 'description') {
      sections.description += (sections.description ? '\n\n' : '') + block.content;
    } else if (block.type === 'textbooks') {
      sections.textbooks += (sections.textbooks ? '\n\n' : '') + block.content;
    } else if (block.type === 'grading') {
      sections.grading += (sections.grading ? '\n\n' : '') + block.content;
    } else if (block.type === 'policies') {
      sections.policies += (sections.policies ? '\n\n' : '') + block.content;
    } else if (block.type === 'schedule') {
      sections.schedule += (sections.schedule ? '\n\n' : '') + block.content;
    }
  }

  return sections;
}
