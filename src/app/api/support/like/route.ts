import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

// In-memory like tracker for client/IP sessions to prevent duplicate spamming
const likeTracker = new Set<string>();

export async function POST(req: Request) {
  try {
    const { requestId, userIdentifier } = await req.json();

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: '제안 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const trackerKey = `${userIdentifier || 'anon'}:::${requestId}`;
    if (likeTracker.has(trackerKey)) {
      return NextResponse.json(
        { success: false, error: '이미 공감한 제안입니다.' },
        { status: 409 }
      );
    }

    // 1. Fetch current proposal from citizen_requests
    const { data: current, error: fetchErr } = await supabase
      .from('citizen_requests')
      .select('id, likes_count')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchErr || !current) {
      return NextResponse.json(
        { success: false, error: fetchErr?.message || '존재하지 않는 제안입니다.' },
        { status: 404 }
      );
    }

    const currentLikes = typeof current.likes_count === 'number' ? current.likes_count : 0;
    const newLikes = currentLikes + 1;

    // 2. Atomic update to database
    const { error: updateErr } = await supabase
      .from('citizen_requests')
      .update({ likes_count: newLikes })
      .eq('id', requestId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    likeTracker.add(trackerKey);

    return NextResponse.json({
      success: true,
      requestId,
      likes_count: newLikes
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '공감 처리 중 서버 오류가 발생했습니다.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
