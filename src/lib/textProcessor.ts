/**
 * SyllabiSync - Text Preprocessing Module
 * Preprocesses and normalizes extracted syllabus text for downstream
 * section dividing, course information extraction, and deadline recognition.
 */

/**
 * Normalizes unicode special characters to standard ASCII:
 * - Smart quotes, curly apostrophes
 * - En-dash, em-dash, minus signs
 * - Bullet characters and weird whitespace (non-breaking spaces, zero-width spaces)
 */
export function normalizeCharacters(text: string): string {
  if (!text) return '';

  return (
    text
      // Non-breaking spaces and zero-width spaces
      .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
      // Smart single quotes & backticks
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035`´]/g, "'")
      // Smart double quotes
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036«»]/g, '"')
      // Em-dashes, en-dashes, horizontal bars, minus
      .replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '-')
      // Common bullet point characters
      .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25CF\u25CB\u25A0\u25BA]/g, '- ')
      // Fractions
      .replace(/\u00BD/g, ' 1/2')
      .replace(/\u00BC/g, ' 1/4')
      .replace(/\u00BE/g, ' 3/4')
  );
}

/**
 * Normalizes whitespace:
 * - Replaces tabs and multiple horizontal spaces with single spaces
 * - Trims trailing whitespace from each line
 * - Collapses 3 or more consecutive empty lines into a maximum of 2
 */
export function normalizeWhitespace(text: string): string {
  if (!text) return '';

  return (
    text
      // Split into lines
      .split(/\r?\n/)
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      // Join back
      .join('\n')
      // Collapse 3 or more consecutive newlines into 2
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Reconstructs wrapped lines where a sentence or list item was arbitrarily broken
 * by PDF layout engines across multiple lines.
 */
export function reconstructWrappedLines(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  const reconstructed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line) {
      reconstructed.push('');
      continue;
    }

    // Check if the next line should be merged into current line:
    // Conditions for merging:
    // 1. Current line does NOT end with sentence-ending punctuation (., :, ?, !)
    // 2. Current line is not a standalone section title or bullet
    // 3. Next line starts with a lowercase letter or continuation word
    // 4. Next line is not a new bullet point, number, or table row
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const isNextLineItem =
        /^(?:[-*•]|\d+[\.)]|week\s*\d+|lecture\s*\d+|assignment\s*\d+|project\s*\d+|quiz\s*\d+|exam\b)/i.test(
          nextLine.trim()
        );
      const isNextLineDate =
        /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})/i.test(
          nextLine.trim()
        );

      const endsWithPunctuation = /[:.?!;]$/.test(line.trim());
      const nextStartsWithLower = /^[a-z]/.test(nextLine.trim());

      if (
        !endsWithPunctuation &&
        nextStartsWithLower &&
        !isNextLineItem &&
        !isNextLineDate &&
        line.length > 20
      ) {
        // Merge lines
        lines[i + 1] = `${line.trim()} ${nextLine.trim()}`;
        continue;
      }
    }

    reconstructed.push(line);
  }

  return reconstructed.join('\n');
}

/**
 * Strips cosmetic decoration borders frequently found in syllabi
 * (e.g. "============", "-------------", "****************")
 */
export function stripDecorativeLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (/^[=\-_*#~]{4,}$/.test(trimmed)) {
        return false;
      }
      return true;
    })
    .join('\n');
}

/**
 * Complete preprocessing pipeline for raw extracted syllabus text.
 */
export function preprocessSyllabusText(rawText: string): string {
  if (!rawText) return '';

  const charsNormalized = normalizeCharacters(rawText);
  const withoutDecorations = stripDecorativeLines(charsNormalized);
  const whitespaceNormalized = normalizeWhitespace(withoutDecorations);
  const linesReconstructed = reconstructWrappedLines(whitespaceNormalized);

  return linesReconstructed;
}

/**
 * Splits text into individual non-empty lines with original indices.
 */
export function getLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}
