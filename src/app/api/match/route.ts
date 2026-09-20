import { NextRequest, NextResponse } from 'next/server';
import { matchSituation } from '@/lib/matcher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const situation = typeof body.situation === 'string' ? body.situation.trim() : '';

    if (!situation) {
      return NextResponse.json(
        { success: false, error: '상황이나 검색어를 입력해주세요.' },
        { status: 400 }
      );
    }

    const result = await matchSituation(situation);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('API /api/match error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '맞춤 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
