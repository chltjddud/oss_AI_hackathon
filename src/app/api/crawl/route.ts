import { NextRequest, NextResponse } from 'next/server';
import { getMergedAll } from '@/lib/crawler';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'welfare' | 'notice' | 'all'
    const source = searchParams.get('source');     // '순천시청' | '순천청년정책' | '순천문화재단' | '순천대학교'
    const query = searchParams.get('query')?.toLowerCase();
    const refresh = searchParams.get('refresh') === 'true';

    // DB-First 초고속 통합 데이터 조회 (refresh인 경우에만 백그라운드/크롤링 수행)
    const { notices, welfare, timestamp } = await getMergedAll(refresh);

    let filteredWelfare = welfare;
    let filteredNotice = notices;

    if (source) {
      filteredWelfare = filteredWelfare.filter(i => i.source === source);
      filteredNotice = filteredNotice.filter(i => i.source === source);
    }

    if (query) {
      filteredWelfare = filteredWelfare.filter(i =>
        i.title.toLowerCase().includes(query) || (i.reason && i.reason.toLowerCase().includes(query))
      );
      filteredNotice = filteredNotice.filter(i =>
        i.title.toLowerCase().includes(query) || (i.reason && i.reason.toLowerCase().includes(query))
      );
    }

    if (category === 'welfare') {
      return NextResponse.json({
        success: true,
        timestamp: timestamp,
        count: filteredWelfare.length,
        items: filteredWelfare
      });
    }

    if (category === 'notice') {
      return NextResponse.json({
        success: true,
        timestamp: timestamp,
        count: filteredNotice.length,
        items: filteredNotice
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: timestamp,
      total: filteredWelfare.length + filteredNotice.length,
      welfareCount: filteredWelfare.length,
      noticeCount: filteredNotice.length,
      welfare: filteredWelfare,
      notice: filteredNotice
    });
  } catch (error: unknown) {
    console.error('API /api/crawl error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
