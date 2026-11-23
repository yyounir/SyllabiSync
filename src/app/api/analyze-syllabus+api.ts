import { GoogleGenAI } from '@google/genai';
import { ExtractedSyllabusSchema } from '@/types/academic';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'Server GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { pdfBase64, textContent, filename } = body;

    if (!pdfBase64 && !textContent) {
      return Response.json(
        { error: 'No syllabus content (pdfBase64 or textContent) provided' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are an expert academic syllabus parser for SyllabiSync.
Extract structured academic information from the provided syllabus document.

CRITICAL RULES:
1. NEVER invent or guess information. If a date, time, or detail is not explicitly stated in the syllabus, return null.
2. Distinguish clearly between:
   - Explicitly stated deadlines (e.g. "October 14 at 11:59 PM") -> parse to ISO 8601 YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss if time is given.
   - Tentative or ambiguous dates -> set is_tentative = true and put original text in original_date_text.
   - Recurring class lecture times -> do NOT mark recurring lectures as assignments or exams.
3. For every academic item (assignments, exams, quizzes, projects, readings):
   - Extract the title, category/type ('assignment' | 'exam' | 'quiz' | 'project' | 'reading' | 'other').
   - Include the exact source_excerpt from the syllabus text where this deadline was found.
   - Assign a confidence score from 0.0 to 1.0.
   - Extract points or weight if specified.
4. Extract course details:
   - course_name (e.g. "Computer Networks")
   - course_code (e.g. "CS 356")
   - professor_name
   - professor_email
   - semester (e.g. "Fall 2026")
   - description (brief summary of course objectives)
   - office_hours (hours, location, or virtual link)
   - attendance_policy
   - late_policy
   - grading_breakdown: array of { category: string, weight: number } (weights should sum close to 100)
   - required_textbooks: array of textbook titles

Output MUST strictly be valid JSON matching this schema:
{
  "course_name": string,
  "course_code": string,
  "professor_name": string,
  "professor_email": string,
  "description": string,
  "semester": string,
  "office_hours": string | null,
  "attendance_policy": string | null,
  "late_policy": string | null,
  "grading_breakdown": [{ "category": string, "weight": number }],
  "required_textbooks": [string],
  "items": [
    {
      "title": string,
      "description": string,
      "type": "assignment" | "exam" | "quiz" | "project" | "reading" | "other",
      "due_date": string | null,
      "original_date_text": string | null,
      "points": number | null,
      "confidence": number,
      "source_excerpt": string | null,
      "is_tentative": boolean
    }
  ]
}`;

    const contents: any[] = [];

    if (pdfBase64) {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
      contents.push({
        text: `Please analyze this course syllabus PDF (${filename || 'syllabus.pdf'}) and extract all course details, grading criteria, and deadlines according to the instructions.`,
      });
    } else {
      contents.push({
        text: `Please analyze this course syllabus text (${filename || 'syllabus'}):\n\n${textContent}`,
      });
    }

    // Call Gemini with structured output
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';
    let parsedJson: any;

    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Gemini response JSON:', responseText);
      return Response.json(
        { error: 'AI response was not valid JSON', raw: responseText },
        { status: 502 }
      );
    }

    // Validate with Zod
    const validationResult = ExtractedSyllabusSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.warn('Zod validation issues:', validationResult.error.format());
      // Graceful normalization for common schema slips
      const normalized = {
        course_name: parsedJson.course_name || 'Course Name',
        course_code: parsedJson.course_code || 'COURSE 101',
        professor_name: parsedJson.professor_name || 'Instructor',
        professor_email: parsedJson.professor_email || '',
        description: parsedJson.description || '',
        semester: parsedJson.semester || 'Fall 2026',
        office_hours: parsedJson.office_hours || null,
        attendance_policy: parsedJson.attendance_policy || null,
        late_policy: parsedJson.late_policy || null,
        grading_breakdown: Array.isArray(parsedJson.grading_breakdown)
          ? parsedJson.grading_breakdown
          : [],
        required_textbooks: Array.isArray(parsedJson.required_textbooks)
          ? parsedJson.required_textbooks
          : [],
        items: Array.isArray(parsedJson.items) ? parsedJson.items : [],
      };
      return Response.json({ success: true, data: normalized });
    }

    return Response.json({ success: true, data: validationResult.data });
  } catch (error: any) {
    console.error('Error analyzing syllabus:', error);
    return Response.json(
      { error: error?.message || 'Internal server error processing syllabus' },
      { status: 500 }
    );
  }
}
