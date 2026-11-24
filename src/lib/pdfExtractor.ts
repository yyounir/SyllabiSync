/**
 * SyllabiSync - PDF Text Extraction Engine
 * Programmatic extraction of text from PDF documents using:
 * 1. PDF.js (via CDN in browser, or npm package in Node.js)
 * 2. Pure-JavaScript native stream parser fallback using pako decompression
 *
 * Preserves page boundaries, reading order, and detects scanned/image-only PDFs.
 */

import pako from 'pako';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  hasText: boolean;
}

export interface PDFExtractionResult {
  filename: string;
  totalPages: number;
  text: string;
  pages: ExtractedPage[];
  isScanned: boolean;
  message?: string;
}

export interface TextItem {
  str: string;
  dir?: string;
  width?: number;
  height?: number;
  transform?: number[]; // [scaleX, skewY, skewX, scaleY, transX, transY]
  hasEOL?: boolean;
}

/**
 * Convert input into Uint8Array
 */
export function toUint8Array(input: string | Uint8Array | ArrayBuffer | Buffer): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    return new Uint8Array(input);
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (typeof input === 'string') {
    // Could be base64 string or data URL
    const cleanBase64 = input.replace(/^data:application\/pdf;base64,/, '').trim();
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(cleanBase64, 'base64'));
    }
    if (typeof atob !== 'undefined') {
      const binary = atob(cleanBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
  }
  throw new Error('Unsupported input type for PDF extraction.');
}

/**
 * Sort text items geometrically into standard reading order:
 * Top-to-bottom, Left-to-right, grouping items with similar Y into single lines.
 */
function reconstructPageText(items: any[]): string {
  if (!items || items.length === 0) return '';

  const textItems: { text: string; x: number; y: number; height: number }[] = [];

  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    const str = item.str;
    if (!str && !item.hasEOL) continue;

    // transform: [scaleX, skewY, skewX, scaleY, x, y]
    const x = item.transform ? item.transform[4] : 0;
    const y = item.transform ? item.transform[5] : 0;
    const height = item.height || (item.transform ? Math.abs(item.transform[3]) : 10);

    textItems.push({ text: str, x, y, height });
  }

  if (textItems.length === 0) return '';

  const LINE_EPSILON = 3.5;

  textItems.sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > LINE_EPSILON) {
      return yDiff;
    }
    return a.x - b.x;
  });

  const lines: string[] = [];
  let currentLine = '';
  let lastY = textItems[0].y;
  let lastX = textItems[0].x;

  for (const item of textItems) {
    const isNewLine = Math.abs(item.y - lastY) > LINE_EPSILON;

    if (isNewLine) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = item.text;
    } else {
      if (currentLine.length > 0 && !currentLine.endsWith(' ') && !item.text.startsWith(' ')) {
        const gap = item.x - lastX;
        if (gap > 1.5) {
          currentLine += ' ';
        }
      }
      currentLine += item.text;
    }

    lastY = item.y;
    lastX = item.x + (item.text.length * (item.height * 0.5));
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
}

/**
 * Dynamically load PDF.js in the browser via CDN script injection.
 * Works seamlessly without any bundler/Node issues.
 */
async function loadPdfJsInBrowser(): Promise<any> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const win = window as any;
  if (win.pdfjsLib && typeof win.pdfjsLib.getDocument === 'function') {
    return win.pdfjsLib;
  }

  const cdnUrls = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  ];

  for (const url of cdnUrls) {
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('PDF.js script load timeout')), 6000);
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = () => {
          clearTimeout(timeout);
          if (win.pdfjsLib && typeof win.pdfjsLib.getDocument === 'function') {
            try {
              win.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            } catch {
              // ignore worker setting
            }
            resolve();
          } else {
            reject(new Error('pdfjsLib not defined on window'));
          }
        };
        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load ${url}`));
        };
        document.head.appendChild(script);
      });

      if (win.pdfjsLib && typeof win.pdfjsLib.getDocument === 'function') {
        return win.pdfjsLib;
      }
    } catch (e) {
      console.warn(`Could not load PDF.js from ${url}:`, e);
    }
  }

  return null;
}

/**
 * Load PDF.js in Node.js server environments
 */
async function loadPdfJsInNode(): Promise<any> {
  if (typeof window !== 'undefined') return null;
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return pdfjs;
  } catch {
    try {
      const pdfjs = await import('pdfjs-dist');
      return pdfjs;
    } catch {
      return null;
    }
  }
}

/**
 * Helper: Find byte sequence in a Uint8Array
 */
function findSequence(data: Uint8Array, seq: number[], startIndex: number = 0): number {
  const len = data.length;
  const seqLen = seq.length;
  for (let i = startIndex; i <= len - seqLen; i++) {
    let match = true;
    for (let j = 0; j < seqLen; j++) {
      if (data[i + j] !== seq[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Helper: Decode standard PDF string escapes and octals
 */
function decodePdfString(raw: string): string {
  return raw
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Helper: Decode hex string <48656c6c6f>
 */
function decodeHexString(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  let str = '';
  for (let i = 0; i < clean.length; i += 2) {
    const code = parseInt(clean.substring(i, i + 2), 16);
    if (!isNaN(code) && code > 0) {
      str += String.fromCharCode(code);
    }
  }
  return str;
}

/**
 * Helper: Parse PDF text content from decompressed stream operators (BT ... ET)
 */
function parseStreamText(text: string): string {
  const lines: string[] = [];
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;

  while ((match = btEtRegex.exec(text)) !== null) {
    const block = match[1];

    // Array TJ: [(str1) -20 (str2)] TJ or [<hex1> -20 <hex2>] TJ
    const tjRegex = /\[((?:[^[\]]|\\[[\]])*)\]\s*TJ/g;
    let tjMatch: RegExpExecArray | null;

    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const arrayContent = tjMatch[1];
      const strRegex = /\(((?:[^()\\]|\\.)*)\)|<([0-9a-fA-F]+)>/g;
      let sMatch: RegExpExecArray | null;
      let linePart = '';

      while ((sMatch = strRegex.exec(arrayContent)) !== null) {
        if (sMatch[1] !== undefined) {
          linePart += decodePdfString(sMatch[1]);
        } else if (sMatch[2] !== undefined) {
          linePart += decodeHexString(sMatch[2]);
        }
      }

      if (linePart.trim()) {
        lines.push(linePart.trim());
      }
    }

    // Single string operators: (str) Tj or <hex> Tj
    const singleRegex = /(?:\(((?:[^()\\]|\\.)*)\)|<([0-9a-fA-F]+)>)\s*(?:Tj|'|")/g;
    let singleMatch: RegExpExecArray | null;

    while ((singleMatch = singleRegex.exec(block)) !== null) {
      let decoded = '';
      if (singleMatch[1] !== undefined) {
        decoded = decodePdfString(singleMatch[1]);
      } else if (singleMatch[2] !== undefined) {
        decoded = decodeHexString(singleMatch[2]);
      }

      if (decoded.trim()) {
        lines.push(decoded.trim());
      }
    }
  }

  return lines.join('\n');
}

/**
 * Pure-JavaScript native stream extractor using pako.
 * Decompresses Flate streams directly and extracts text operators.
 * Acts as an unbreakable fallback if PDF.js is unavailable in the runtime.
 */
export function extractPdfTextNative(
  data: Uint8Array,
  filename: string = 'syllabus.pdf'
): PDFExtractionResult {
  const STREAM_SEQ = [115, 116, 114, 101, 97, 109]; // 'stream'
  const ENDSTREAM_SEQ = [101, 110, 100, 115, 116, 114, 101, 97, 109]; // 'endstream'

  let pos = 0;
  const pageSections: string[] = [];

  while (pos < data.length) {
    const streamStart = findSequence(data, STREAM_SEQ, pos);
    if (streamStart === -1) break;

    // Check header before stream for /FlateDecode
    const headerStart = Math.max(0, streamStart - 400);
    const headerBytes = data.subarray(headerStart, streamStart);
    let headerStr = '';
    try {
      headerStr = new TextDecoder('latin1').decode(headerBytes);
    } catch {
      for (let i = 0; i < headerBytes.length; i++) {
        headerStr += String.fromCharCode(headerBytes[i]);
      }
    }

    const isFlate = headerStr.includes('FlateDecode');

    let dataStart = streamStart + 6;
    if (data[dataStart] === 13) dataStart++; // \r
    if (data[dataStart] === 10) dataStart++; // \n

    const endStream = findSequence(data, ENDSTREAM_SEQ, dataStart);
    if (endStream === -1) break;

    let dataEnd = endStream;
    while (
      dataEnd > dataStart &&
      (data[dataEnd - 1] === 10 || data[dataEnd - 1] === 13 || data[dataEnd - 1] === 32)
    ) {
      dataEnd--;
    }

    const streamSlice = data.subarray(dataStart, dataEnd);
    let decompressedStr = '';

    if (isFlate) {
      try {
        decompressedStr = pako.inflate(streamSlice, { to: 'string' }) as string;
      } catch {
        try {
          decompressedStr = pako.inflateRaw(streamSlice, { to: 'string' }) as string;
        } catch {
          // Decompression failed; try direct decoding
        }
      }
    }

    if (!decompressedStr) {
      try {
        decompressedStr = new TextDecoder('utf-8').decode(streamSlice);
      } catch {
        for (let i = 0; i < Math.min(streamSlice.length, 5000); i++) {
          decompressedStr += String.fromCharCode(streamSlice[i]);
        }
      }
    }

    if (decompressedStr && decompressedStr.includes('BT')) {
      const parsedText = parseStreamText(decompressedStr);
      if (parsedText.trim().length > 0) {
        pageSections.push(parsedText.trim());
      }
    }

    pos = endStream + 9;
  }

  const combinedText = pageSections.join('\n\n');
  const totalCharacters = combinedText.replace(/\s+/g, '').length;
  const totalPages = Math.max(1, pageSections.length);

  const isScanned = totalCharacters < 40;

  if (isScanned) {
    return {
      filename,
      totalPages,
      text: combinedText,
      pages: pageSections.map((sec, idx) => ({
        pageNumber: idx + 1,
        text: sec,
        hasText: sec.trim().length > 0,
      })),
      isScanned: true,
      message:
        'This PDF appears to be a scanned document or image with no selectable text. Optical Character Recognition (OCR) is required to extract text from scanned documents. Please upload a digital text-based syllabus PDF or Word document (.docx).',
    };
  }

  return {
    filename,
    totalPages,
    text: combinedText,
    pages: pageSections.map((sec, idx) => ({
      pageNumber: idx + 1,
      text: sec,
      hasText: true,
    })),
    isScanned: false,
  };
}

/**
 * Extract text from every page of a PDF document.
 * Tries PDF.js first (via CDN in browser, or npm package in Node).
 * Falls back safely to native stream extraction with pako if PDF.js fails.
 */
export async function extractPdfText(
  pdfInput: string | Uint8Array | ArrayBuffer | Buffer,
  filename: string = 'syllabus.pdf'
): Promise<PDFExtractionResult> {
  const data = toUint8Array(pdfInput);

  if (!data || data.length === 0) {
    throw new Error('PDF document is empty (0 bytes). Please upload a valid PDF.');
  }

  // 1. Try PDF.js
  try {
    let pdfjs: any = null;
    if (typeof window !== 'undefined') {
      pdfjs = await loadPdfJsInBrowser();
    } else {
      pdfjs = await loadPdfJsInNode();
    }

    if (pdfjs && typeof pdfjs.getDocument === 'function') {
      const loadingTask = pdfjs.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
        isEvalSupported: false,
        useWorkerFetch: false,
      });

      const doc = await loadingTask.promise;
      const totalPages = doc.numPages;

      if (totalPages > 0) {
        const pages: ExtractedPage[] = [];
        let combinedText = '';
        let totalCharacters = 0;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await doc.getPage(pageNum);
          const content = await page.getTextContent();
          const pageText = reconstructPageText(content.items);
          const trimmed = pageText.trim();
          const hasText = trimmed.length > 0;

          pages.push({
            pageNumber: pageNum,
            text: pageText,
            hasText,
          });

          if (hasText) {
            totalCharacters += trimmed.length;
            combinedText += (combinedText ? '\n\n' : '') + pageText;
          }
        }

        const isScanned =
          totalCharacters < 40 || (totalPages > 1 && totalCharacters / totalPages < 15);

        if (isScanned) {
          return {
            filename,
            totalPages,
            text: combinedText,
            pages,
            isScanned: true,
            message:
              'This PDF appears to be a scanned document or image with no selectable text. Optical Character Recognition (OCR) is required to extract text from scanned documents. Please upload a digital text-based syllabus PDF or Word document (.docx).',
          };
        }

        return {
          filename,
          totalPages,
          text: combinedText,
          pages,
          isScanned: false,
        };
      }
    }
  } catch (pdfJsErr) {
    console.warn(
      'PDF.js loading/extraction skipped or threw, falling back to native stream extractor:',
      pdfJsErr
    );
  }

  // 2. Native pure-JS stream parser fallback
  return extractPdfTextNative(data, filename);
}
