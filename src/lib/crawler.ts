import * as cheerio from 'cheerio';

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

// Crawl 1: 순천시청 시정소식
async function crawlSuncheonCity(): Promise<Omit<CrawledItem, 'category'>[]> {
  const results: Omit<CrawledItem, 'category'>[] = [];
  try {
    const res = await fetch('https://www.suncheon.go.kr/kr/news/0001/0001/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      next: { revalidate: 600 }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    $('table.bbsList tbody tr').each((_, tr) => {
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
          results.push({
            id: `city-${no || Math.random().toString(36).substring(7)}`,
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
    });
  } catch (err) {
    console.error('Error crawling 순천시청:', err);
  }
  return results;
}

// Crawl 2: 순천 청년정책
async function crawlSuncheonYouth(): Promise<Omit<CrawledItem, 'category'>[]> {
  const results: Omit<CrawledItem, 'category'>[] = [];
  try {
    const res = await fetch('https://www.suncheon.go.kr/youth/0001/0002/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      next: { revalidate: 600 }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    $('table.bbsList tbody tr').each((_, tr) => {
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
          results.push({
            id: `youth-${no || Math.random().toString(36).substring(7)}`,
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
    });
  } catch (err) {
    console.error('Error crawling 순천 청년정책:', err);
  }
  return results;
}

// Crawl 3: 순천문화재단
async function crawlSuncheonCulture(): Promise<Omit<CrawledItem, 'category'>[]> {
  const results: Omit<CrawledItem, 'category'>[] = [];
  try {
    const res = await fetch('https://www.cfsc.or.kr/contents/news/news0101.asp', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      next: { revalidate: 600 }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const seenKeys = new Set<string>();
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
            id: `cfsc-${seenKeys.size}`,
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
    console.error('Error crawling 순천문화재단:', err);
  }
  return results;
}

// Crawl 4: 국립순천대학교
async function crawlSuncheonUniv(): Promise<Omit<CrawledItem, 'category'>[]> {
  const results: Omit<CrawledItem, 'category'>[] = [];
  try {
    const res = await fetch('https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do?mi=1131&bbsId=1040', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      next: { revalidate: 600 }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    $('table tbody tr').each((_, tr) => {
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
          results.push({
            id: `scnu-${no || Math.random().toString(36).substring(7)}`,
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
    });
  } catch (err) {
    console.error('Error crawling 순천대학교:', err);
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

// Batch classify using Gemini 3.6 Flash
async function classifyBatchWithGemini(items: Omit<CrawledItem, 'category'>[]): Promise<CrawledItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY missing, using rule-based fallback.');
    return items.map(item => {
      const rule = ruleClassify(item);
      return {
        ...item,
        category: rule ? rule.category : 'notice',
        reason: rule ? rule.reason : '기본 규칙 분류'
      };
    });
  }

  // First pass: resolve easy cases with ruleClassify
  const pendingItems: { index: number; item: Omit<CrawledItem, 'category'> }[] = [];
  const results: CrawledItem[] = new Array(items.length);

  items.forEach((item, idx) => {
    const rule = ruleClassify(item);
    if (rule) {
      results[idx] = { ...item, category: rule.category, reason: rule.reason };
    } else {
      pendingItems.push({ index: idx, item });
    }
  });

  if (pendingItems.length === 0) {
    return results;
  }

  // Call Gemini for remaining items
  try {
    const promptList = pendingItems.map((p, i) => `${i + 1}. [${p.item.source}] ${p.item.title}`).join('\n');
    const prompt = `당신은 순천시 공공데이터 분류 전문가입니다.
아래 공지사항 목록을 확인하여 각 항목을 다음 두 가지 중 하나로 분류하세요:
- "welfare": 주민, 청년, 예술인, 학생 대상의 복지, 지원금, 혜택, 교육지원, 보조금, 주거/취업 지원 등 실질적 혜택이 있는 공고
- "notice": 단순 일시휴관, 행정공고, 입찰, 행사안내, 선정결과 발표 등 일반 안내글

목록:
${promptList}

반드시 다음 JSON 배열 형식으로만 응답하세요:
[
  { "id": 1, "category": "welfare" 또는 "notice", "reason": "한 줄 분류 사유" },
  ...
]`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (res.ok) {
      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
          parsed.forEach((resItem: { id: number; category: string; reason?: string }) => {
            const pendingIndex = resItem.id - 1;
            if (pendingItems[pendingIndex]) {
              const target = pendingItems[pendingIndex];
              const isWelfare = resItem.category === 'welfare';
              results[target.index] = {
                ...target.item,
                category: isWelfare ? 'welfare' : 'notice',
                reason: resItem.reason || (isWelfare ? 'AI 복지 판단' : 'AI 일반공지 판단')
              };
            }
          });
        }
      }
    }
  } catch (err) {
    console.error('Gemini API call failed, falling back to default:', err);
  }

  // Fallback for any unassigned pending items
  pendingItems.forEach(p => {
    if (!results[p.index]) {
      results[p.index] = {
        ...p.item,
        category: 'notice',
        reason: '기본 분류'
      };
    }
  });

  return results;
}

export async function getCrawledData(forceRefresh = false): Promise<CrawlResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedData;
  }

  console.log('Crawling all 4 sites in parallel...');
  const [city, youth, culture, univ] = await Promise.all([
    crawlSuncheonCity(),
    crawlSuncheonYouth(),
    crawlSuncheonCulture(),
    crawlSuncheonUniv()
  ]);

  const rawItems = [...city, ...youth, ...culture, ...univ];
  console.log(`Crawled total ${rawItems.length} items. Classifying...`);

  const classifiedItems = await classifyBatchWithGemini(rawItems);

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
  lastFetchTime = now;

  return cachedData;
}
