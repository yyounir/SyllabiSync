import { ClassItem, AcademicItem } from '@/types/database';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface CourseContext {
  activeClasses?: ClassItem[];
  upcomingItems?: AcademicItem[];
  selectedClass?: ClassItem | null;
}

const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  '';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=`;

/**
 * Constructs an academic tutor system instruction, injected with real course
 * and deadline metadata so the chatbot understands the student's exact syllabus workload.
 */
function buildSystemInstruction(context?: CourseContext): string {
  let contextDescription = '';

  if (context?.selectedClass) {
    const c = context.selectedClass;
    contextDescription += `\nCurrently Selected Course:\n- Name: ${c.course_name} (${c.course_code})\n- Professor: ${c.professor_name || 'N/A'} (${c.professor_email || 'N/A'})\n- Semester: ${c.semester}\n- Description: ${c.description || 'N/A'}\n`;
    if (c.office_hours) contextDescription += `- Office Hours: ${c.office_hours}\n`;
    if (c.late_policy) contextDescription += `- Late Policy: ${c.late_policy}\n`;
    if (c.grading_breakdown && c.grading_breakdown.length > 0) {
      contextDescription += `- Grading Breakdown: ${c.grading_breakdown.map((g) => `${g.category}: ${g.weight}%`).join(', ')}\n`;
    }
  }

  if (context?.activeClasses && context.activeClasses.length > 0 && !context.selectedClass) {
    contextDescription += `\nStudent's Enrolled Courses:\n`;
    context.activeClasses.forEach((c) => {
      contextDescription += `- ${c.course_code}: ${c.course_name} (Instructor: ${c.professor_name || 'N/A'})\n`;
    });
  }

  if (context?.upcomingItems && context.upcomingItems.length > 0) {
    contextDescription += `\nUpcoming Academic Deadlines & Exams:\n`;
    context.upcomingItems.slice(0, 10).forEach((item) => {
      const due = item.due_date ? new Date(item.due_date).toLocaleDateString() : 'TBD';
      contextDescription += `- [${item.type.toUpperCase()}] "${item.title}" for ${item.course_code || 'Course'} - Due: ${due} (Status: ${item.status}, Points: ${item.points ?? 'N/A'})\n`;
    });
  }

  return `You are SyllabiSync AI Study Assistant, an expert academic tutor, study planner, and exam coach built into the SyllabiSync college coursework application.

Your core mission is to help students succeed in their courses, understand complex homework assignments, and prepare rigorously for quizzes, midterms, and final exams.

STUDENT CONTEXT:
${contextDescription || 'No active course context specified yet.'}

TUTORING GUIDELINES:
1. EXAM PREPARATION:
   - Provide high-yield summaries, key formulas, active-recall quiz questions, flashcard-style concepts, and common pitfalls to avoid.
   - When asked to quiz the student, ask 1 to 2 targeted questions at a time and wait for their response before explaining the answer.
2. HOMEWORK & PROBLEM-SOLVING ASSISTANCE:
   - Provide pedagogical guidance: explain underlying theorems, principles, algorithms, and step-by-step methodologies rather than simply spitting out unearned answers.
   - If writing code or math derivations, annotate key lines with clear explanations.
3. STUDY PLANNING:
   - Help the student break down large assignments or upcoming exams into realistic daily study chunks based on their due dates.
4. TONE & STYLE:
   - Enthusiastic, supportive, rigorous, and concise.
   - Format answers cleanly with markdown headings (###), bold text, bullet points, and code formatting where appropriate.
   - Avoid fluffy opening or closing disclaimers; jump straight into helpful, high-yield academic assistance.`;
}

export const geminiChatService = {
  /**
   * Sends user conversation history to Gemini and retrieves the assistant's academic response.
   */
  async sendMessage(
    messages: ChatMessage[],
    context?: CourseContext
  ): Promise<{ text: string; error?: string | null }> {
    if (!GEMINI_API_KEY) {
      return {
        text: '',
        error:
          'Gemini API key is not configured. Please ensure EXPO_PUBLIC_GEMINI_API_KEY is defined in your environment (.env file).',
      };
    }

    try {
      const systemInstruction = buildSystemInstruction(context);

      // Convert conversation history into Gemini contents format
      const contents = messages.map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

      const payload = {
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200,
        },
      };

      const response = await fetch(`${GEMINI_ENDPOINT}${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData?.error?.message || `Gemini API returned status ${response.status}`;
        console.error('Gemini API Error:', errorData);
        return { text: '', error: message };
      }

      const data = await response.json();
      const generatedText =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'I was unable to generate a response. Please try rephrasing your question.';

      return { text: generatedText, error: null };
    } catch (err: any) {
      console.error('Network error calling Gemini:', err);
      return {
        text: '',
        error: err?.message || 'Network connection failed while contacting the AI assistant.',
      };
    }
  },

  /**
   * Generates tailored starter prompts based on active courses and deadlines.
   */
  getQuickPrompts(context?: CourseContext): { label: string; prompt: string }[] {
    const prompts = [];

    const examItem = context?.upcomingItems?.find(
      (i) => (i.type === 'exam' || i.type === 'quiz') && i.status !== 'completed'
    );
    if (examItem) {
      prompts.push({
        label: `🎯 Quiz me for ${examItem.title}`,
        prompt: `Can you quiz me with 3 high-yield practice questions to prepare for my upcoming exam "${examItem.title}"?`,
      });
    }

    const assignmentItem = context?.upcomingItems?.find(
      (i) => (i.type === 'assignment' || i.type === 'project') && i.status !== 'completed'
    );
    if (assignmentItem) {
      prompts.push({
        label: `📝 Plan "${assignmentItem.title.slice(0, 24)}..."`,
        prompt: `Help me break down and plan my work for the upcoming assignment "${assignmentItem.title}". What steps should I take each day?`,
      });
    }

    if (context?.selectedClass) {
      prompts.push({
        label: `💡 Key concepts in ${context.selectedClass.course_code}`,
        prompt: `What are the most challenging core concepts students typically struggle with in ${context.selectedClass.course_name} (${context.selectedClass.course_code}), and how can I master them?`,
      });
    } else if (context?.activeClasses && context.activeClasses.length > 0) {
      const firstClass = context.activeClasses[0];
      prompts.push({
        label: `📚 Study tips for ${firstClass.course_code}`,
        prompt: `Give me effective study techniques and review strategies for ${firstClass.course_name} (${firstClass.course_code}).`,
      });
    }

    prompts.push({
      label: '🧠 Explain a tough concept',
      prompt: 'Can you explain a difficult concept to me using simple analogies and a step-by-step breakdown?',
    });

    return prompts.slice(0, 4);
  },
};
