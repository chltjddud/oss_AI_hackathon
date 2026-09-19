import * as cheerio from 'cheerio';
import { supabase } from './supabase-server';

export interface CrawledItem {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceUrl: string;
  dept?: string;
  date: string;
  views?: string;
  category: 'welfare' | 'notice';
  reason?: string;
}

export interface CrawlResponse {
  timestamp: string;
  total: number;
  welfareCount: number;
  noticeCount: number;
  welfare: CrawledItem[];
  notice: CrawledItem[];
}

let cachedData: CrawlResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// DB-First In-Memory Cache (Provides instant sub-millisecond responses)
let cachedMergedNotices: CrawledItem[] | null = null;
let cachedMergedWelfare: CrawledItem[] | null = null;
let lastDbFetchTime = 0;
const DB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory cache

// Deduplication promise for in-flight crawling
let inFlightCrawlPromise: Promise<CrawlResponse> | null = null;
let lastBackgroundCrawlTime = 0;
const BACKGROUND_CRAWL_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between auto crawls

/**
 * 공지사항 날짜 문자열을 일관된 밀리초 타임스탬프로 변환
 * 지원 형태: 2026.09.18, 2026-09-18, 2026/09/18, 09-18, 09.18, 2026.09 등
 */
export function parseNoticeDateToTimestamp(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const clean = dateStr.trim();

  // 1. YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD
  const ymdMatch = clean.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    return new Date(y, m, d).getTime();
  }

  // 2. MM-DD, MM.DD (연도 생략 시 현재 연도 기준)
  const mdMatch = clean.match(/^(\d{1,2})[-./](\d{1,2})$/);
  if (mdMatch) {
    const y = new Date().getFullYear();
    const m = parseInt(mdMatch[1], 10) - 1;
    const d = parseInt(mdMatch[2], 10);
    return new Date(y, m, d).getTime();
  }

  // 3. YYYY-MM, YYYY.MM
  const ymMatch = clean.match(/(\d{4})[-./](\d{1,2})/);
  if (ymMatch) {
    const y = parseInt(ymMatch[1], 10);
    const m = parseInt(ymMatch[2], 10) - 1;
    return new Date(y, m, 1).getTime();
  }

  // 4. 숫자 8자리 이상
  const nums = clean.replace(/[^0-9]/g, '');
  if (nums.length >= 8) {
    const y = parseInt(nums.slice(0, 4), 10);
    const m = parseInt(nums.slice(4, 6), 10) - 1;
    const d = parseInt(nums.slice(6, 8), 10);
    return new Date(y, m, d).getTime();
  }

  return 0;
}

// Crawl 1: 순천시청 시정소식 (페이징 지원)
async function crawlSuncheonCity(pages = 1): Promise<Omit<CrawledItem, 'category'>[]> {
  const results: Omit<CrawledItem, 'category'>[] = [];
  const seenLinks = new Set<string>();

  for (let page = 1; page <= pages; page++) {
    try {
      const url = page === 1
        ? 'https://www.suncheon.go.kr/kr/news/0001/0001/'
        : `https://www.suncheon.go.kr/kr/news/0001/0001/?page=${page}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(4500)
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      $('table.bbsList tbody tr').each((idx, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 4) {
          const no = $(tds[0]).text().trim();
          const aTag = $(tds[1]).find('a');
          const title = aTag.text().trim().replace(/\s+/g, ' ');
          const href = aTag.attr('href') || '';
          const dept = $(tds[2]).text().trim();
          const date = $(tds[3]).text().trim();
          const views = tds[4] ? $(tds[4]).text().trim() : '';

          if (title) {
            const fullLink = href.startsWith('http')
              ? href
              : `https://www.suncheon.go.kr/kr/news/0001/0001/${href}`;
            if (!seenLinks.has(fullLink)) {
              seenLinks.add(fullLink);
              const cleanNo = (!no || no === '공지') ? `pinned-${page}-${idx}` : no;
              results.push({
                id: `city-${cleanNo}-${idx}`,
                title,
                link: fullLink,
                source: '순천시청',
                sourceUrl: 'https://www.suncheon.go.kr/kr/news/0001/0001/',
                dept,
                date,
                views,
              });
            }
          }
        }
      });
    } catch (err) {
      console.error(`Error crawling 순천시청 page ${page}:`, err);
    }
  }
  return results;
}

// Crawl 2: 순천 청년정책 (페이징 지원)
async function crawlSuncheonYouth(pages = 1): Promise<Omit<CrawledItem, 'category'>[]> {
  const results: Omit<CrawledItem, 'category'>[] = [];
  const seenLinks = new Set<string>();

  for (let page = 1; page <= pages; page++) {
    try {
      const url = page === 1
        ? 'https://www.suncheon.go.kr/youth/0001/0002/'
        : `https://www.suncheon.go.kr/youth/0001/0002/?page=${page}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(4500)
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      $('table.bbsList tbody tr').each((idx, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 3) {
          const no = $(tds[0]).text().trim();
          const aTag = $(tds[1]).find('a');
          const title = aTag.text().trim().replace(/\s+/g, ' ');
          const href = aTag.attr('href') || '';
          const date = $(tds[2]).text().trim();
          const views = tds[3] ? $(tds[3]).text().trim() : '';

          if (title) {
            const fullLink = href.startsWith('http')
              ? href
              : `https://www.suncheon.go.kr/youth/0001/0002/${href}`;
            if (!seenLinks.has(fullLink)) {
              seenLinks.add(fullLink);
              const cleanNo = (!no || no === '공지') ? `pinned-${page}-${idx}` : no;
              results.push({
                id: `youth-${cleanNo}-${idx}`,
                title,
                link: fullLink,
                source: '순천청년정책',
                sourceUrl: 'https://www.suncheon.go.kr/youth/0001/0002/',
                dept: '청년정책과',
                date,
                views,
              });
            }
          }
        }
      });
    } catch (err) {
      console.error(`Error crawling 순천 청년정책 page ${page}:`, err);
    }
  }
  return results;
}

// Crawl 3: 순천문화재단 (월별 캘린더 소식 + 공지사항 게시판)
async function crawlSuncheonCulture(): Promise<Omit<CrawledItem, 'category'>[]> {
  const results: Omit<CrawledItem, 'category'>[] = [];
  const seenKeys = new Set<string>();

  // 1. 월별 캘린더 소식
  try {
    const res = await fetch('https://www.cfsc.or.kr/contents/news/news0101.asp', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(4500)
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    $('td').each((_, td) => {
      const dayText = $(td).find('u').text().trim();
      $(td).find('.item').each((_, item) => {
        const aTag = $(item).find('a');
        const cardHref = aTag.attr('data-card-href') || aTag.attr('href') || '';
        const cat = $(item).find('small b').text().trim();
        const title = $(item).find('span').text().trim().replace(/\s+/g, ' ');
        const fullLink = cardHref.startsWith('http')
          ? cardHref
          : `https://www.cfsc.or.kr${cardHref}`;

        const key = title + cardHref;
        if (title && !seenKeys.has(key)) {
          seenKeys.add(key);
          results.push({
            id: `cfsc-cal-${seenKeys.size}`,
            title: cat ? `[${cat}] ${title}` : title,
            link: fullLink,
            source: '순천문화재단',
            sourceUrl: 'https://www.cfsc.or.kr/contents/news/news0101.asp',
            dept: cat || '문화예술',
            date: dayText ? `2026.${dayText}` : '2026.09',
            views: '',
          });
        }
      });
    });
  } catch (err) {
    console.error('Error crawling 순천문화재단 캘린더:', err);
  }

  // 2. 공지사항 게시판
  try {
    const res = await fetch('https://www.cfsc.or.kr/contents/news/news0201.asp', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(4500)
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    $('table tbody tr').each((idx, tr) => {
      const tds = $(tr).find('td');
      if (tds.length >= 4) {
        const no = $(tds[0]).text().trim();
        const aTag = $(tds[1]).find('a');
        const title = aTag.text().trim().replace(/\s+/g, ' ');
        const href = aTag.attr('href') || '';
        const dept = $(tds[2]).text().trim();
        const date = $(tds[3]).text().trim();
        const views = tds[4] ? $(tds[4]).text().trim() : '';

        if (title) {
          const fullLink = href.startsWith('http')
            ? href
            : `https://www.cfsc.or.kr/contents/news/${href}`;
          const key = title + href;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            results.push({
              id: `cfsc-board-${no || idx}`,
              title,
              link: fullLink,
              source: '순천문화재단',
              sourceUrl: 'https://www.cfsc.or.kr/contents/news/news0201.asp',
              dept: dept || '문화재단',
              date: date || '2026.09',
              views,
            });
          }
        }
      }
    });
  } catch (err) {
    console.error('Error crawling 순천문화재단 게시판:', err);
  }

  return results;
}

// Crawl 4: 국립순천대학교 (페이징 지원)
async function crawlSuncheonUniv(pages = 1): Promise<Omit<CrawledItem, 'category'>[]> {
  const results: Omit<CrawledItem, 'category'>[] = [];
  const seenLinks = new Set<string>();

  for (let page = 1; page <= pages; page++) {
    try {
      const url = `https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do?mi=1131&bbsId=1040&currPage=${page}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(4500)
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      $('table tbody tr').each((idx, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 4) {
          const no = $(tds[0]).text().trim();
          const aTag = $(tds[1]).find('a');
          const title = aTag.text().trim().replace(/\s+/g, ' ');
          const href = aTag.attr('href') || '';
          const dept = $(tds[2]).text().trim();
          const date = $(tds[3]).text().trim();
          const views = tds[4] ? $(tds[4]).text().trim() : '';

          if (title) {
            const fullLink = href.startsWith('http')
              ? href
              : `https://www.scnu.ac.kr${href}`;
            if (!seenLinks.has(fullLink)) {
              seenLinks.add(fullLink);
              const cleanNo = (!no || no === '공지') ? `pinned-${page}-${idx}` : no;
              results.push({
                id: `scnu-${cleanNo}-${idx}`,
                title,
                link: fullLink,
                source: '순천대학교',
                sourceUrl: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do?mi=1131&bbsId=1040',
                dept,
                date,
                views,
              });
            }
          }
        }
      });
    } catch (err) {
      console.error(`Error crawling 순천대학교 page ${page}:`, err);
    }
  }
  return results;
}

// Quick heuristic rule filter before calling Gemini
function ruleClassify(item: Omit<CrawledItem, 'category'>): { category: 'welfare' | 'notice'; reason: string } | null {
  const title = item.title;

  // High priority notice override: pure operational or result notices
  if (
    title.includes('휴관') || title.includes('휴무') || title.includes('교통 통제') ||
    title.includes('점검') || title.includes('입찰') || title.includes('공람') ||
    title.includes('선정 결과') || title.includes('선정자 안내') || title.includes('선정자 발표')
  ) {
    return { category: 'notice', reason: '휴관/점검/선정결과 등 일반 안내성 공지' };
  }

  // Clear welfare/benefit keywords
  if (
    title.includes('지원사업') || title.includes('결혼축하금') || title.includes('대출이자') ||
    title.includes('장학생') || title.includes('장학금') || title.includes('월세지원') ||
    title.includes('지원금') || title.includes('수당') || title.includes('보조금') ||
    title.includes('바우처') || title.includes('환급')
  ) {
    return { category: 'welfare', reason: '직접적 보조금/지원금/혜택 대상 공고' };
  }

  return null; // Ambiguous, send to Gemini AI
}

// Batch classify using Gemini 3.6 Flash / Flash Lite with fast-path for known items
async function classifyBatchWithGemini(
  items: Omit<CrawledItem, 'category'>[],
  knownMap?: Map<string, { category: 'welfare' | 'notice'; reason?: string }>
): Promise<CrawledItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const pendingItems: { index: number; item: Omit<CrawledItem, 'category'> }[] = [];
  const results: CrawledItem[] = new Array(items.length);

  // 1. Check known DB map first (instant 0ms)
  // 2. Fall back to heuristic rule filter
  // 3. Only genuinely new & ambiguous items need Gemini AI
  items.forEach((item, idx) => {
    if (knownMap && knownMap.has(item.link)) {
      const known = knownMap.get(item.link)!;
      results[idx] = { ...item, category: known.category, reason: known.reason };
      return;
    }

    const rule = ruleClassify(item);
    if (rule) {
      results[idx] = { ...item, category: rule.category, reason: rule.reason };
    } else {
      pendingItems.push({ index: idx, item });
    }
  });

  if (pendingItems.length === 0 || !apiKey) {
    pendingItems.forEach(p => {
      results[p.index] = {
        ...p.item,
        category: 'notice',
        reason: '기본 규칙 분류'
      };
    });
    return results;
  }

  // Process in chunks of 25 items for reliability
  const CHUNK_SIZE = 25;
  for (let c = 0; c < pendingItems.length; c += CHUNK_SIZE) {
    const chunk = pendingItems.slice(c, c + CHUNK_SIZE);
    const promptList = chunk.map((p, i) => `${i + 1}. [${p.item.source}] ${p.item.title}`).join('\n');
    const prompt = `당신은 순천시 공공데이터 분류 전문가입니다.
아래 공지사항 목록을 확인하여 각 항목을 다음 두 가지 중 하나로 분류하세요:
- "welfare": 주민, 청년, 예술인, 학생 대상의 복지, 지원금, 혜택, 교육지원, 보조금, 주거/취업 지원 등 실질적 혜택이 있는 공고
- "notice": 단순 일시휴관, 행정공고, 입찰, 행사안내, 선정결과 발표 등 일반 안내글

목록:
${promptList}

반드시 다음 JSON 배열 형식으로만 응답하세요:
[
  { "id": 1, "category": "welfare" 또는 "notice", "reason": "한 줄 분류 사유" }
]`;

    const candidateModels = ['gemini-flash-lite-latest', 'gemini-3.6-flash'];
    let parsedSuccess = false;

    for (const model of candidateModels) {
      if (parsedSuccess) break;

      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (!res.ok) continue;

        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanText);
          if (Array.isArray(parsed)) {
            parsed.forEach((resItem: { id: number; category: string; reason?: string }) => {
              const pendingItem = chunk[resItem.id - 1];
              if (pendingItem) {
                const isWelfare = resItem.category === 'welfare';
                results[pendingItem.index] = {
                  ...pendingItem.item,
                  category: isWelfare ? 'welfare' : 'notice',
                  reason: resItem.reason || (isWelfare ? 'AI 복지 판단' : 'AI 일반공지 판단')
                };
              }
            });
            parsedSuccess = true;
          }
        }
      } catch {
        // Fallback to next model or rule
      }
    }

    // Fallback for unassigned items in chunk
    chunk.forEach(p => {
      if (!results[p.index]) {
        results[p.index] = {
          ...p.item,
          category: 'notice',
          reason: '기본 분류'
        };
      }
    });
  }

  return results;
}

// Sync notices to Supabase DB
export async function syncNoticesToSupabase(items: CrawledItem[]): Promise<{
  success: boolean;
  insertedCount: number;
  message?: string;
}> {
  if (!items || items.length === 0) {
    return { success: true, insertedCount: 0, message: '동기화할 공지사항이 없습니다.' };
  }

  const rows = items.map(item => ({
    id: item.id,
    title: item.title,
    link: item.link,
    source: item.source,
    source_url: item.sourceUrl,
    dept: item.dept || null,
    date: item.date,
    views: item.views || null,
    category: item.category,
    reason: item.reason || null
  }));

  try {
    const { error } = await supabase
      .from('notices')
      .upsert(rows, { onConflict: 'link' });

    if (error) {
      console.warn('Supabase notices upsert notice:', error.message);
      return {
        success: false,
        insertedCount: 0,
        message: `Supabase 저장 알림: ${error.message} (Supabase SQL Editor에서 supabase_schema.sql을 실행해주세요)`
      };
    }

    console.log(`Successfully synced ${rows.length} notices to Supabase.`);
    return {
      success: true,
      insertedCount: rows.length,
      message: `${rows.length}건의 공지사항이 Supabase에 성공적으로 업데이트되었습니다.`
    };
  } catch (err: any) {
    console.error('syncNoticesToSupabase exception:', err);
    return {
      success: false,
      insertedCount: 0,
      message: err.message
    };
  }
}

/**
 * DB에서 최신 공지사항을 조회하고 메모리 캐시를 즉시 갱신합니다.
 */
async function fetchFromDbAndPopulateCache(force = false): Promise<{ notices: CrawledItem[]; welfare: CrawledItem[] }> {
  const now = Date.now();
  if (!force && cachedMergedNotices && cachedMergedWelfare && (now - lastDbFetchTime < DB_CACHE_TTL_MS)) {
    return { notices: cachedMergedNotices, welfare: cachedMergedWelfare };
  }

  try {
    const { data: dbRows, error } = await supabase
      .from('notices')
      .select('*')
      .order('date', { ascending: false });

    if (error || !dbRows || dbRows.length === 0) {
      return {
        notices: cachedMergedNotices || [],
        welfare: cachedMergedWelfare || []
      };
    }

    const allItems: CrawledItem[] = dbRows.map(row => ({
      id: row.id,
      title: row.title,
      link: row.link,
      source: row.source,
      sourceUrl: row.source_url || row.link,
      dept: row.dept || '',
      date: row.date,
      views: row.views || '',
      category: (row.category as 'welfare' | 'notice') || 'notice',
      reason: row.reason || ''
    }));

    // 최신순 엄격 정렬
    allItems.sort((a, b) => {
      const timeA = parseNoticeDateToTimestamp(a.date);
      const timeB = parseNoticeDateToTimestamp(b.date);
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return (b.id || '').localeCompare(a.id || '');
    });

    cachedMergedNotices = allItems.filter(i => i.category === 'notice');
    cachedMergedWelfare = allItems.filter(i => i.category === 'welfare');
    lastDbFetchTime = now;

    return { notices: cachedMergedNotices, welfare: cachedMergedWelfare };
  } catch (err) {
    console.error('Failed to fetch notices from DB:', err);
    return {
      notices: cachedMergedNotices || [],
      welfare: cachedMergedWelfare || []
    };
  }
}

/**
 * 쿨다운(15분)이 지났을 경우 백그라운드에서 비동기로 크롤링을 트리거 (사용자 요청 차단 X)
 */
function triggerBackgroundCrawlIfNeeded() {
  const now = Date.now();
  if (inFlightCrawlPromise || (now - lastBackgroundCrawlTime < BACKGROUND_CRAWL_COOLDOWN_MS)) {
    return;
  }
  // 비동기 백그라운드 실행
  getCrawledData(false).catch(err => {
    console.warn('Background auto-crawl error:', err?.message);
  });
}

// 1. 최신 크롤링 (기본 1페이지) - 중복 호출 방지 및 기존 DB 캐시 연동
export async function getCrawledData(forceRefresh = false): Promise<CrawlResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedData;
  }

  // 중복 크롤링 방지: 이미 크롤링이 진행 중이면 해당 프로미스를 공유
  if (inFlightCrawlPromise) {
    return inFlightCrawlPromise;
  }

  inFlightCrawlPromise = (async () => {
    try {
      lastBackgroundCrawlTime = Date.now();
      console.log('Crawling all 4 sites in parallel (latest)...');
      const [city, youth, culture, univ] = await Promise.all([
        crawlSuncheonCity(1),
        crawlSuncheonYouth(1),
        crawlSuncheonCulture(),
        crawlSuncheonUniv(1)
      ]);

      const rawItems = [...city, ...youth, ...culture, ...univ];
      console.log(`Crawled total ${rawItems.length} items. Classifying...`);

      // 기존 DB/캐시 항목 맵을 구축하여 이미 분류된 공지는 AI 호출 우회 (초고속화)
      const knownMap = new Map<string, { category: 'welfare' | 'notice'; reason?: string }>();
      if (cachedMergedNotices && cachedMergedWelfare) {
        cachedMergedNotices.forEach(n => knownMap.set(n.link, { category: 'notice', reason: n.reason }));
        cachedMergedWelfare.forEach(w => knownMap.set(w.link, { category: 'welfare', reason: w.reason }));
      } else {
        const { data: dbItems } = await supabase.from('notices').select('link, category, reason');
        if (dbItems) {
          dbItems.forEach(row => knownMap.set(row.link, { category: row.category, reason: row.reason }));
        }
      }

      const classifiedItems = await classifyBatchWithGemini(rawItems, knownMap);

      const welfare = classifiedItems.filter(i => i.category === 'welfare');
      const notice = classifiedItems.filter(i => i.category === 'notice');

      cachedData = {
        timestamp: new Date().toISOString(),
        total: classifiedItems.length,
        welfareCount: welfare.length,
        noticeCount: notice.length,
        welfare,
        notice
      };
      lastFetchTime = Date.now();

      // Supabase 비동기 저장 백그라운드 트리거 및 DB 캐시 갱신
      syncNoticesToSupabase(classifiedItems)
        .then(() => {
          fetchFromDbAndPopulateCache(true).catch(() => {});
        })
        .catch(err => {
          console.warn('Background Supabase sync error:', err.message);
        });

      return cachedData;
    } finally {
      inFlightCrawlPromise = null;
    }
  })();

  return inFlightCrawlPromise;
}

// 2. 전체 과거 누적 공지사항 딥 크롤링 및 Supabase 전수 업데이트
export async function crawlAllHistoricalData(pagesPerSite = 5): Promise<CrawlResponse> {
  console.log(`Starting deep crawl of historical notices (${pagesPerSite} pages per site)...`);
  const [city, youth, culture, univ] = await Promise.all([
    crawlSuncheonCity(pagesPerSite),
    crawlSuncheonYouth(pagesPerSite),
    crawlSuncheonCulture(),
    crawlSuncheonUniv(pagesPerSite)
  ]);

  const rawItems = [...city, ...youth, ...culture, ...univ];
  console.log(`Deep crawled total ${rawItems.length} items across all pages. Classifying...`);

  const { data: dbItems } = await supabase.from('notices').select('link, category, reason');
  const knownMap = new Map<string, { category: 'welfare' | 'notice'; reason?: string }>();
  if (dbItems) {
    dbItems.forEach(row => knownMap.set(row.link, { category: row.category, reason: row.reason }));
  }

  const classifiedItems = await classifyBatchWithGemini(rawItems, knownMap);

  const welfare = classifiedItems.filter(i => i.category === 'welfare');
  const notice = classifiedItems.filter(i => i.category === 'notice');

  cachedData = {
    timestamp: new Date().toISOString(),
    total: classifiedItems.length,
    welfareCount: welfare.length,
    noticeCount: notice.length,
    welfare,
    notice
  };
  lastFetchTime = Date.now();

  // Supabase에 전수 동기화
  await syncNoticesToSupabase(classifiedItems);
  await fetchFromDbAndPopulateCache(true);

  return cachedData;
}

// 3. Supabase에 저장된 기존 공지사항 즉시 반환 (DB-First 초고속 응답)
export async function getMergedNotices(forceRefresh = false): Promise<CrawledItem[]> {
  if (forceRefresh) {
    await getCrawledData(true);
    const refreshed = await fetchFromDbAndPopulateCache(true);
    return refreshed.notices;
  }

  const { notices } = await fetchFromDbAndPopulateCache(false);
  triggerBackgroundCrawlIfNeeded();
  return notices;
}

// 4. Supabase와 크롤링된 복지 혜택 항목 즉시 반환 (DB-First 초고속 응답)
export async function getMergedWelfare(forceRefresh = false): Promise<CrawledItem[]> {
  if (forceRefresh) {
    await getCrawledData(true);
    const refreshed = await fetchFromDbAndPopulateCache(true);
    return refreshed.welfare;
  }

  const { welfare } = await fetchFromDbAndPopulateCache(false);
  triggerBackgroundCrawlIfNeeded();
  return welfare;
}

// 5. 공지사항과 복지 혜택을 한 번의 쿼리로 초고속 반환 (API 라우트용)
export async function getMergedAll(forceRefresh = false): Promise<{
  notices: CrawledItem[];
  welfare: CrawledItem[];
  timestamp: string;
  total: number;
}> {
  if (forceRefresh) {
    await getCrawledData(true);
    const refreshed = await fetchFromDbAndPopulateCache(true);
    return {
      notices: refreshed.notices,
      welfare: refreshed.welfare,
      timestamp: new Date().toISOString(),
      total: refreshed.notices.length + refreshed.welfare.length
    };
  }

  const { notices, welfare } = await fetchFromDbAndPopulateCache(false);
  triggerBackgroundCrawlIfNeeded();
  return {
    notices,
    welfare,
    timestamp: new Date().toISOString(),
    total: notices.length + welfare.length
  };
}


