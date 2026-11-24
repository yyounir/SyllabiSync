import { analyzeSyllabusProgrammatic, SyllabusExtractionError } from '@/lib/syllabusEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pdfBase64, textContent, filename = 'syllabus.pdf', fileType } = body;

    if (!pdfBase64 && !textContent) {
      return Response.json(
        { error: 'No syllabus content (pdfBase64 or textContent) provided' },
        { status: 400 }
      );
    }

    const result = await analyzeSyllabusProgrammatic({
      pdfBase64,
      textContent,
      filename,
      fileType,
    });

    return Response.json({
      success: true,
      data: result.data,
      totalPages: result.totalPages,
      isScanned: result.isScanned,
    });
  } catch (error: any) {
    console.error('Error analyzing syllabus programmatically:', error);

    if (error instanceof SyllabusExtractionError && error.isScanned) {
      return Response.json(
        {
          error: error.message,
          isScanned: true,
          requiresOcr: true,
        },
        { status: 422 }
      );
    }

    return Response.json(
      { error: error?.message || 'Internal server error processing syllabus' },
      { status: 500 }
    );
  }
}
