import * as cheerio from 'cheerio';

// Core utility for AI-powered summarization using Google Gemini API

export interface AiSummaryResult {
  headline: string;
  bullets: string[];
  targetAudience: string;
  deadline?: string;
  requiredDocuments?: string[];
  tip: string;
}

export interface SummarizeInput {
  id: string;
  title: string;
  source?: string;
  dept?: string;
  target?: string;
  description?: string;
  date?: string;
  url?: string;
  type?: 'notice' | 'policy';
}

// In-memory cache to store generated summaries and prevent redundant API calls
const summaryCache = new Map<string, { summary: AiSummaryResult; cachedAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// Helper to strip any emojis from text
function stripEmojis(text: string): string {
  if (!text) return '';
  return text.replace(/[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '').trim();
}

/**
 * 해당 복지/공고의 실제 상세 페이지 및 정부24 API에서 구비서류와 신청방법 텍스트를 정밀 크롤링
 */
export async function crawlDocumentDetailsFromPage(url?: string, id?: string): Promise<{ docText: string; applyMethod: string }> {
  let docText = '';
  let applyMethod = '';

  if (!url || url === '#') {
    return { docText, applyMethod };
  }

  // 1. 정부24 서비스ID가 있거나 URL에 포함된 경우 공식 상세 API 호출
  const govIdMatch = (id || url).match(/(\d{12})/);
  const targetGovId = govIdMatch ? govIdMatch[1] : null;

  if (targetGovId && process.env.PUBLIC_DATA_API_KEY) {
    try {
      const apiUrl = `https://api.odcloud.kr/api/gov24/v3/serviceDetail?serviceKey=${process.env.PUBLIC_DATA_API_KEY}&cond%5B%EC%84%9C%EB%B9%84%EC%8A%A4ID%3A%3AEQ%5D=${targetGovId}`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data[0]) {
          const d = json.data[0];
          const rawDocs = [d['구비서류'], d['본인확인필요구비서류']].filter(x => x && x !== '해당없음').join('\n');
          if (rawDocs) docText += `[정부24 공식 구비서류 원문]\n${rawDocs}\n`;
          if (d['신청방법']) applyMethod += `[정부24 공식 신청방법 원문]\n${d['신청방법']}\n`;
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. 실제 상세 페이지 HTML 직접 패치 후 Cheerio 파싱
  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(4500)
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const $ = cheerio.load(html);

      // 구비서류 또는 신청방법/접수방법 섹션 탐색
      $('th, dt, h3, h4, h5, strong, td').each((_, el) => {
        const title = $(el).text().trim();
        if (title === '구비서류' || title.includes('제출서류') || title === '구비 서류') {
          const content = $(el).closest('tr, dl, li, div').text().replace(/\s+/g, ' ').trim();
          if (content.length > title.length + 5 && !docText.includes(content.slice(0, 50))) {
            docText += `\n[페이지 본문 구비서류]\n${content}\n`;
          }
        }
        if (title === '신청방법' || title.includes('접수방법')) {
          const content = $(el).closest('tr, dl, li, div').text().replace(/\s+/g, ' ').trim();
          if (content.length > title.length + 5 && !applyMethod.includes(content.slice(0, 50))) {
            applyMethod += `\n[페이지 본문 신청방법]\n${content}\n`;
          }
        }
      });
    }
  } catch {
    // ignore
  }

  return { docText: docText.trim(), applyMethod: applyMethod.trim() };
}

export async function summarizeItemWithGemini(input: SummarizeInput): Promise<AiSummaryResult> {
  const cacheKey = `${input.type || 'item'}:${input.id || input.title}`;

  // Check cache
  const cached = summaryCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.summary;
  }

  // 실제 상세 페이지의 구비서류 및 신청방법 원문 크롤링
  const { docText: crawledDocs, applyMethod: crawledMethod } = await crawlDocumentDetailsFromPage(input.url, input.id);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY missing, using fallback rule summary');
    return generateFallbackSummary(input, crawledDocs);
  }

  const isPolicy = input.type === 'policy';
  const prompt = `당신은 순천시민을 돕는 친절하고 명쾌한 AI 행정 전문 비서입니다.
아래 순천시 ${isPolicy ? '지원 정책' : '공지사항'} 정보와 해당 상세 페이지에서 직접 크롤링한 신청방법 및 구비서류 원문을 읽고, 순천시민이 빠르고 쉽게 이해할 수 있도록 핵심 정보, 신청 마감기한, 그리고 실제 필수 구비서류를 분석하여 작성해주세요.

[제목]: ${input.title}
[기관/출처]: ${input.source || '순천시'}
[담당부서]: ${input.dept || '해당 기관'}
[지원대상]: ${input.target || '공고 본문 참조'}
[상세내용/사유]: ${input.description || '본문 공고 확인 요망'}
[일정/기간/마감기한]: ${input.date || '상세 공고 일정 참조'}
${crawledDocs ? `\n[상세 페이지에서 직접 크롤링한 구비서류 원문]:\n${crawledDocs}\n` : ''}
${crawledMethod ? `\n[상세 페이지에서 직접 크롤링한 신청방법 원문]:\n${crawledMethod}\n` : ''}

[매우 중요한 지침]:
1. 일체의 이모티콘 및 이모지(예: 💡, 📌, ⏰, ✨, 🎉, 📢 등)를 절대 사용하지 마세요. 오직 깔끔하고 정갈한 한국어 텍스트로만 작성하세요.
2. 신청 마감기한(deadline)을 본문 또는 일정에서 명확하게 파악하여 기록하세요. 기간이 정해지지 않은 경우 '상시접수' 또는 '공고 일정 참조'로 작성하세요.
3. 구비서류(requiredDocuments) 분석:
   - 위 크롤링된 구비서류/신청방법 원문이 있다면, 원문에서 요구하는 실제 필수 서류(예: 보험금청구서, 주민등록등본, 사고사실확인서, 소득금액증명원, 사업자등록증명 등)를 분석하여 2~4개 항목의 명확한 서류명 목록으로 작성하세요.
   - 크롤링 원문이 없는 경우에만 일반적인 공공 행정 필수 제출서류(신분증 사본, 주민등록등본, 소득 증빙 등)를 기재하세요.

반드시 다음 JSON 형식으로만 응답하세요 (마크다운 백틱 없이 순수 JSON):
{
  "headline": "전체 내용을 한 줄로 요약한 명쾌한 핵심 문장",
  "bullets": [
    "1. 공고 및 지원의 핵심 취지 및 내용",
    "2. 주요 혜택 및 지원 자격과 조건",
    "3. 신청 일정 및 신청 방법과 준비사항"
  ],
  "targetAudience": "구체적 추천 대상 (예: 순천시 거주 만 19~39세 청년, 순천 관내 농업인 등)",
  "deadline": "신청 마감일자 또는 접수 기한 (예: 2026.09.30 또는 상시접수)",
  "requiredDocuments": [
    "신분증(주민등록증 또는 운전면허증)",
    "주민등록등본(최근 3개월 이내 발급)",
    "해당 지원 요건 증빙 서류"
  ],
  "tip": "순천시민을 위한 실질적인 신청 팁 또는 유의사항 한 줄"
}`;

  const candidateModels = ['gemini-flash-lite-latest', 'gemini-3.6-flash'];

  for (const model of candidateModels) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        console.warn(`Summarizer: model ${model} returned status ${res.status}`);
        continue;
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      if (parsed.bullets && Array.isArray(parsed.bullets) && parsed.headline) {
        let reqDocs: string[] = [];
        if (Array.isArray(parsed.requiredDocuments) && parsed.requiredDocuments.length > 0) {
          reqDocs = parsed.requiredDocuments.map((d: any) => stripEmojis(String(d))).filter(Boolean);
        } else {
          reqDocs = [
            '신분증(주민등록증 또는 운전면허증)',
            '주민등록등본(최근 3개월 이내 발급)',
            '해당 지원 자격 증빙 서류'
          ];
        }

        const cleanedResult: AiSummaryResult = {
          headline: stripEmojis(parsed.headline),
          bullets: parsed.bullets.map((b: string) => stripEmojis(b)),
          targetAudience: stripEmojis(parsed.targetAudience || input.target || '순천시민 요건 충족자'),
          deadline: stripEmojis(parsed.deadline || input.date || '상시접수 / 공고 참조'),
          requiredDocuments: reqDocs,
          tip: stripEmojis(parsed.tip || '상세 일정 및 제출 서류는 공고 원문을 확인해 주세요.')
        };

        summaryCache.set(cacheKey, { summary: cleanedResult, cachedAt: Date.now() });
        return cleanedResult;
      }
    } catch (err) {
      console.warn(`Summarizer: model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }

  // Fallback if all models fail
  const fallback = generateFallbackSummary(input, crawledDocs);
  summaryCache.set(cacheKey, { summary: fallback, cachedAt: Date.now() });
  return fallback;
}

function generateFallbackSummary(input: SummarizeInput, crawledDocs?: string): AiSummaryResult {
  const isPolicy = input.type === 'policy';
  const org = input.source || input.dept || '순천시';

  let docs = [
    '신분증(주민등록증 또는 운전면허증)',
    '주민등록등본(최근 3개월 이내 발급분)',
    '소득 또는 사업자등록 등 자격 증빙서류'
  ];

  if (crawledDocs) {
    // Extract document-like lines from crawled text
    const lines = crawledDocs
      .split('\n')
      .map(l => l.replace(/^[-*•○\d.]\s*/, '').trim())
      .filter(l => l.length >= 3 && !l.startsWith('[') && !l.includes('해당없음') && !l.includes('민원인이'));
    if (lines.length > 0) {
      docs = lines.slice(0, 4).map(l => stripEmojis(l));
    }
  }

  return {
    headline: stripEmojis(`${org}에서 안내하는 ${input.title} 공고입니다.`),
    bullets: [
      `1. [개요] ${stripEmojis(input.title)}`,
      `2. [대상] ${stripEmojis(input.target || (isPolicy ? '순천시민 및 해당 요건 충족자' : '순천시민 및 관련 이해관계자'))}`,
      `3. [일정] ${stripEmojis(input.date || '상세 공고문 일정 참조')} (${org})`
    ],
    targetAudience: stripEmojis(input.target || '순천시민 및 관련 대상자'),
    deadline: stripEmojis(input.date || '상시접수 / 공고문 확인'),
    requiredDocuments: docs,
    tip: '상세 지원 자격 및 필수 제출 서류는 공고 원문 링크를 통해 반드시 확인하세요.'
  };
}
