import { NextRequest, NextResponse } from 'next/server';
import { processChatCounseling, ChatMessage } from '@/lib/chatbot';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    let messages: ChatMessage[] = [];
    if (Array.isArray(body.messages)) {
      messages = body.messages;
    } else if (typeof body.message === 'string' && body.message.trim()) {
      messages = [{
        id: `msg-${Date.now()}`,
        role: 'user',
        content: body.message.trim()
      }];
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: '상담 메시지를 입력해주세요.' },
        { status: 400 }
      );
    }

    const response = await processChatCounseling(messages);
    return NextResponse.json({
      success: true,
      ...response
    });
  } catch (error: any) {
    console.error('API /api/chat error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '상담 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
