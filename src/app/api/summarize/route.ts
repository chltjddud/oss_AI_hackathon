import { NextRequest, NextResponse } from 'next/server';
import { summarizeItemWithGemini, SummarizeInput } from '@/lib/summarizer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const input: SummarizeInput = {
      id: String(body.id || body.title),
      title: String(body.title),
      source: body.source ? String(body.source) : undefined,
      dept: body.dept ? String(body.dept) : undefined,
      target: body.target ? String(body.target) : undefined,
      description: body.description ? String(body.description) : undefined,
      date: body.date ? String(body.date) : undefined,
      url: body.url ? String(body.url) : undefined,
      type: body.type === 'policy' ? 'policy' : 'notice'
    };

    const summary = await summarizeItemWithGemini(input);

    return NextResponse.json({
      success: true,
      summary
    });
  } catch (err) {
    console.error('API /api/summarize error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error during summarization'
      },
      { status: 500 }
    );
  }
}
