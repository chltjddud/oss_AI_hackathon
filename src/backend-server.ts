import http from 'http';
import { URL } from 'url';
import { getCrawledData, crawlAllHistoricalData, syncNoticesToSupabase, getMergedNotices, getMergedWelfare, getMergedAll } from './lib/crawler';
import { summarizeItemWithGemini, SummarizeInput } from './lib/summarizer';
import { supabase } from './lib/supabase-server';
import { fetchSuncheonApplicableBenefits } from './lib/api';
import { matchSituation } from './lib/matcher';

const PORT = process.env.PORT || 3102;

function setCorsHeaders(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// ==========================================
// KST 매일 아침 8:00 자동 스케줄러 (내장)
// ==========================================
let lastScheduledRunDate = '';

function checkAndRunDailyScheduler() {
  const now = new Date();
  // 한국 시간 계산 (UTC + 9시간)
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const kstHours = kstTime.getUTCHours();
  const kstMinutes = kstTime.getUTCMinutes();
  const kstDateString = kstTime.toISOString().split('T')[0];

  // 매일 KST 08:00 (08:00 ~ 08:02 사이에 1회 실행)
  if (kstHours === 8 && kstMinutes <= 2 && lastScheduledRunDate !== kstDateString) {
    lastScheduledRunDate = kstDateString;
    console.log(`[SCHEDULE] KST 08:00 reached on ${kstDateString}. Running daily notice update & Supabase sync...`);
    crawlAllHistoricalData(5)
      .then(res => {
        console.log(`[SCHEDULE SUCCESS] Daily sync complete. Total items: ${res.total} (Welfare: ${res.welfareCount}, Notice: ${res.noticeCount})`);
      })
      .catch(err => {
        console.error('[SCHEDULE ERROR] Failed daily notice update:', err);
      });
  }
}

// 1분마다 스케줄 검사
setInterval(checkAndRunDailyScheduler, 60 * 1000);

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = req.url || '/';
  const parsedUrl = new URL(reqUrl, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // Normalize path (handle both /crawl and /api/crawl)
  if (pathname.startsWith('/api/')) {
    pathname = pathname.substring(4);
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  try {
    // Health check
    if (pathname === '/' || pathname === '/health') {
      return sendJson(res, 200, {
        status: 'ok',
        service: 'Suncheon Welfare & Notice Backend API',
        port: PORT,
        scheduler: 'KST 08:00 Daily Notice Sync Active',
        time: new Date().toISOString()
      });
    }

    // Crawl API (실시간 크롤링 + Supabase 기존 누적 공지사항 통합 조회)
    if (pathname === '/crawl' && req.method === 'GET') {
      const category = parsedUrl.searchParams.get('category');
      const source = parsedUrl.searchParams.get('source');
      const query = parsedUrl.searchParams.get('query')?.toLowerCase();
      const refresh = parsedUrl.searchParams.get('refresh') === 'true';

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
        return sendJson(res, 200, {
          success: true,
          timestamp: timestamp,
          count: filteredWelfare.length,
          items: filteredWelfare
        });
      }

      if (category === 'notice') {
        return sendJson(res, 200, {
          success: true,
          timestamp: timestamp,
          count: filteredNotice.length,
          items: filteredNotice
        });
      }

      return sendJson(res, 200, {
        success: true,
        timestamp: timestamp,
        total: filteredWelfare.length + filteredNotice.length,
        welfareCount: filteredWelfare.length,
        noticeCount: filteredNotice.length,
        welfare: filteredWelfare,
        notice: filteredNotice
      });
    }

    // Notices Historical & Supabase Sync API
    if (pathname === '/notices/sync' && (req.method === 'POST' || req.method === 'GET')) {
      const pagesParam = parsedUrl.searchParams.get('pages');
      const pagesPerSite = pagesParam ? Math.min(Math.max(parseInt(pagesParam, 10) || 5, 1), 10) : 5;

      console.log(`[API /notices/sync] Initiating deep crawl (${pagesPerSite} pages per site)...`);
      const deepData = await crawlAllHistoricalData(pagesPerSite);
      const syncResult = await syncNoticesToSupabase([...deepData.welfare, ...deepData.notice]);

      return sendJson(res, 200, {
        success: true,
        message: `${deepData.total}건의 과거 및 최신 공지사항을 수집했습니다.`,
        crawledTotal: deepData.total,
        welfareCount: deepData.welfareCount,
        noticeCount: deepData.noticeCount,
        supabaseSync: syncResult,
        timestamp: deepData.timestamp
      });
    }

    // Summarize API (Gemini)
    if (pathname === '/summarize' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body || !body.title) {
        return sendJson(res, 400, { success: false, error: 'Title is required' });
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
      return sendJson(res, 200, {
        success: true,
        summary
      });
    }

    // Match API (Gemini 상황별 맞춤 추천)
    if (pathname === '/match' && req.method === 'POST') {
      const body = await parseBody(req);
      const situation = typeof body.situation === 'string' ? body.situation.trim() : '';

      if (!situation) {
        return sendJson(res, 400, { success: false, error: '상황이나 검색어를 입력해주세요.' });
      }

      try {
        const result = await matchSituation(situation);
        return sendJson(res, 200, {
          success: true,
          ...result
        });
      } catch (matchErr: any) {
        console.error('Error in /match endpoint:', matchErr);
        return sendJson(res, 500, {
          success: false,
          error: matchErr?.message || '맞춤 추천 처리 중 오류가 발생했습니다.'
        });
      }
    }

    // Policies Sync API
    if (pathname === '/policies/sync' && (req.method === 'POST' || req.method === 'GET')) {
      const [crawled, applicable] = await Promise.all([
        getCrawledData(false),
        fetchSuncheonApplicableBenefits()
      ]);

      const policiesToInsert: Array<{
        title: string;
        category: string;
        org: string;
        dept: string;
        target: string;
        description: string;
        url: string;
        deadline: string | null;
        region: string;
      }> = [];

      (crawled.welfare || []).forEach(item => {
        policiesToInsert.push({
          title: item.title,
          category: '순천맞춤복지',
          org: item.source || '순천시',
          dept: item.dept || '',
          target: item.dept ? `${item.dept} 대상자` : '순천시민',
          description: item.reason || '',
          url: item.link || '',
          deadline: null,
          region: 'suncheon'
        });
      });

      applicable.forEach(item => {
        policiesToInsert.push({
          title: item.title,
          category: item.category || '공공복지',
          org: item.org || '정부/지자체',
          dept: item.dept || '',
          target: item.target || '요건 충족 순천시민/국민',
          description: item.description || '',
          url: item.url || '',
          deadline: item.deadline,
          region: item.scope
        });
      });

      const { data, error } = await supabase
        .from('policies')
        .insert(policiesToInsert);

      if (error) {
        return sendJson(res, 400, {
          success: false,
          message: error.message,
          hint: 'Supabase SQL 에디터에서 supabase_schema.sql을 먼저 실행해 주세요.'
        });
      }

      return sendJson(res, 200, {
        success: true,
        insertedCount: policiesToInsert.length,
        data
      });
    }

    // Fallback 404
    sendJson(res, 404, { success: false, error: `Route not found: ${pathname}` });
  } catch (err: any) {
    console.error('Server error:', err);
    sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`Suncheon Backend Server running on port ${PORT}`);
  console.log(`Scheduler active: KST 08:00 (UTC 23:00) Daily Notice Update & Sync`);
});
