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

export interface DocumentCrawlResult {
  docText: string;
  applyMethod: string;
  submitDocs: string;
  officerDocs: string;
  applyTerm: string;
}

/**
 * 해당 복지/공고의 실제 상세 페이지 및 정부24 페이지에서 신청방법과 민원인 구비서류 원문을 정밀 크롤링
 */
export async function crawlDocumentDetailsFromPage(url?: string, id?: string): Promise<DocumentCrawlResult> {
  let docText = '';
  let applyMethod = '';
  let submitDocs = '';
  let officerDocs = '';
  let applyTerm = '';

  const govIdMatch = (id || url || '').match(/(\d{12})/);
  const targetGovId = govIdMatch ? govIdMatch[1] : null;

  // 1. 정부24 서비스인 경우 공식 상세 페이지 URL 구성
  const targetUrl = targetGovId
    ? `https://www.gov.kr/portal/rcvfvrSvc/dtlEx/${targetGovId}`
    : (url && url !== '#' ? url : null);

  if (!targetUrl) {
    return { docText, applyMethod, submitDocs, officerDocs, applyTerm };
  }

  // 2. 상세 페이지 HTML 직접 패치 후 Cheerio 정밀 파싱
  try {
    const pageRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const $ = cheerio.load(html);

      // 정부24 공식 탭: <민원인이 제출해야 하는 서류>
      $('div:contains("<민원인이 제출해야 하는 서류>")').each((_, el) => {
        const nextPre = $(el).nextAll('pre.detail-desc').first().text().trim();
        if (nextPre) submitDocs = nextPre;
      });

      // 정부24 공식 탭: <민원인이 제출하지 않아도 되는 서류(담당공무원 확인)>
      $('div:contains("<민원인이 제출하지 않아도 되는 서류(담당공무원 확인)>")').each((_, el) => {
        const nextPre = $(el).nextAll('pre.detail-desc').first().text().trim();
        if (nextPre) officerDocs = nextPre;
      });

      // 정부24 공식 탭: 신청방법
      $('strong.detail-title.method').each((_, el) => {
        const pre = $(el).closest('.detail-wrap').find('pre.detail-desc').text().trim();
        if (pre) applyMethod = pre;
      });

      // 정부24 공식 탭: 신청기간
      $('strong.detail-title.application-term').each((_, el) => {
        const pre = $(el).closest('.detail-wrap').find('pre.detail-desc').text().trim();
        if (pre) applyTerm = pre;
      });

      // 일반 지자체/기관 공고 페이지 fallback 탐색
      if (!submitDocs && !applyMethod) {
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
    }
  } catch {
    // 네트워크 실패 시 graceful degrade
  }

  return {
    docText: docText.trim(),
    applyMethod: applyMethod.trim(),
    submitDocs: submitDocs.trim(),
    officerDocs: officerDocs.trim(),
    applyTerm: applyTerm.trim()
  };
}

export async function summarizeItemWithGemini(input: SummarizeInput): Promise<AiSummaryResult> {
  const cacheKey = `${input.type || 'item'}:${input.id || input.title}`;

  // Check cache
  const cached = summaryCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.summary;
  }

  // 실제 상세 페이지의 신청방법 및 민원인 구비서류 원문 크롤링
  const crawlResult = await crawlDocumentDetailsFromPage(input.url, input.id);
  const { docText: otherDocs, applyMethod, submitDocs, officerDocs, applyTerm } = crawlResult;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY missing, using fallback rule summary');
    return generateFallbackSummary(input, crawlResult);
  }

  const isPolicy = input.type === 'policy';
  const prompt = `당신은 순천시민을 돕는 친절하고 명쾌한 AI 행정 전문 비서입니다.
아래 순천시 ${isPolicy ? '지원 정책' : '공지사항'} 정보와 상세 페이지에서 직접 크롤링한 신청방법 및 민원인 제출 구비서류 원문을 면밀히 분석하여 핵심 요약을 작성해주세요.

[제목]: ${input.title}
[기관/출처]: ${input.source || '순천시'}
[담당부서]: ${input.dept || '해당 기관'}
[지원대상]: ${input.target || '공고 본문 참조'}
[상세내용/사유]: ${input.description || '본문 공고 확인 요망'}
[일정/기간/마감기한]: ${input.date || applyTerm || '상세 공고 일정 참조'}
${applyMethod ? `\n[정부24 공식 신청방법 원문]:\n${applyMethod}\n` : ''}
${applyTerm ? `\n[정부24 공식 신청기간 원문]:\n${applyTerm}\n` : ''}
${submitDocs ? `\n[정부24 민원인이 제출해야 하는 구비서류 원문]:\n${submitDocs}\n` : ''}
${officerDocs ? `\n[정부24 담당공무원 확인 서류 (민원인 제출 불필요)]:\n${officerDocs}\n` : ''}
${otherDocs ? `\n[페이지 본문 구비서류]:\n${otherDocs}\n` : ''}

[매우 중요한 지침]:
1. 일체의 이모티콘 및 이모지(예: 💡, 📌, ⏰, ✨, 🎉, 📢 등)를 절대 사용하지 마세요. 오직 깔끔하고 정갈한 한국어 텍스트로만 작성하세요.
2. 신청 마감기한(deadline)을 본문 또는 일정에서 명확하게 파악하여 기록하세요. 기간이 정해지지 않은 경우 '상시신청' 또는 '공고 일정 참조'로 작성하세요.
3. 구비서류(requiredDocuments) 분석 원칙 (최우선 준수):
   - [정부24 민원인이 제출해야 하는 구비서류 원문]이 '해당없음'이거나 별도 제출 서류가 없다고 명시된 경우:
     반드시 requiredDocuments 배열에 ["해당없음 (온라인 신청 시 자격 자동 확인, 별도 제출 서류 없음)"] 항목 1개만 작성하세요. 절대 자의적으로 신분증 사본이나 주민등록등본 등의 서류를 추가하거나 지어내지 마세요.
   - [정부24 민원인이 제출해야 하는 구비서류 원문]에 실제 필수 제출 서류(예: 보험금 청구서, 사고사실확인서, 주민등록등본 등)가 명시되어 있다면, 원문에 기재된 서류들을 1~4개의 명확하고 간결한 서류명 목록으로 추출하세요.
   - 정부24 정보가 없거나 원문에서 구비서류 정보를 찾을 수 없는 일반 공고/정책인 경우에만: 해당 지원 요건에 통상 필요한 구비서류(신분증 사본, 주민등록등본 등)를 2~3개 기재하세요.
4. 핵심 3줄 요약(bullets) 작성 원칙:
   - bullets[0]: 1. 공고 및 지원의 핵심 취지 및 내용 요약
   - bullets[1]: 2. 주요 혜택 및 신청 자격 조건
   - bullets[2]: 3. 신청 방법 및 구비서류 요건 안내 (신청방법과 함께 민원인 제출 서류 유무/준비사항을 명확히 요약)

반드시 다음 JSON 형식으로만 응답하세요 (마크다운 백틱 없이 순수 JSON):
{
  "headline": "전체 내용을 한 줄로 요약한 명쾌한 핵심 문장",
  "bullets": [
    "1. 공고 및 지원의 핵심 취지 및 내용",
    "2. 주요 혜택 및 지원 자격과 조건",
    "3. 신청 일정 및 신청 방법과 준비사항"
  ],
  "targetAudience": "구체적 추천 대상 (예: 순천시 거주 만 19~34세 청년, 순천 관내 농업인 등)",
  "deadline": "신청 마감일자 또는 접수 기한 (예: 2026.09.30 또는 상시신청)",
  "requiredDocuments": [
    "구비서류 1",
    "구비서류 2"
  ],
  "tip": "순천시민을 위한 실질적인 신청 팁 또는 유의사항 한 줄"
}`;

  const candidateModels = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite'];

  for (const model of candidateModels) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
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
        } else if (submitDocs && (submitDocs.includes('해당없음') || submitDocs.includes('없음'))) {
          reqDocs = ['해당없음 (온라인 신청 시 자격 자동 확인, 별도 제출 서류 없음)'];
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
          deadline: stripEmojis(parsed.deadline || applyTerm || input.date || '상시신청 / 공고 참조'),
          requiredDocuments: reqDocs,
          tip: stripEmojis(parsed.tip || '상세 일정 및 제출 서류는 공고 원문을 확인해 주세요.')
        };

        summaryCache.set(cacheKey, { summary: cleanedResult, cachedAt: Date.now() });
        return cleanedResult;
      }
    } catch {
      // try next model
    }
  }

  // Fallback if all models fail
  const fallback = generateFallbackSummary(input, crawlResult);
  summaryCache.set(cacheKey, { summary: fallback, cachedAt: Date.now() });
  return fallback;
}

function generateFallbackSummary(input: SummarizeInput, crawled?: DocumentCrawlResult): AiSummaryResult {
  const isPolicy = input.type === 'policy';
  const org = input.source || input.dept || '순천시';

  let docs: string[] = [];
  const isNoDoc = crawled?.submitDocs && (crawled.submitDocs.includes('해당없음') || crawled.submitDocs.includes('없음'));

  if (isNoDoc) {
    docs = ['해당없음 (온라인 신청 시 자격 자동 확인, 별도 제출 서류 없음)'];
  } else if (crawled?.submitDocs) {
    const lines = crawled.submitDocs
      .split('\n')
      .map(l => l.replace(/^[-*•○\d.)\s]+/, '').trim())
      .filter(l => l.length >= 2 && !l.startsWith('(') && !l.includes('해당없음') && !l.includes('민원인이'));
    if (lines.length > 0) {
      docs = lines.slice(0, 4).map(l => stripEmojis(l));
    }
  }

  if (docs.length === 0 && crawled?.docText) {
    const lines = crawled.docText
      .split('\n')
      .map(l => l.replace(/^[-*•○\d.)\s]+/, '').trim())
      .filter(l => l.length >= 3 && !l.startsWith('[') && !l.includes('해당없음') && !l.includes('민원인이'));
    if (lines.length > 0) {
      docs = lines.slice(0, 4).map(l => stripEmojis(l));
    }
  }

  if (docs.length === 0) {
    docs = [
      '신분증(주민등록증 또는 운전면허증)',
      '주민등록등본(최근 3개월 이내 발급)',
      '소득 또는 사업자등록 등 자격 증빙서류'
    ];
  }

  const applyMethodText = crawled?.applyMethod 
    ? (isNoDoc ? `${crawled.applyMethod.slice(0, 50)} (민원인 제출 서류: 해당없음)` : crawled.applyMethod.slice(0, 80))
    : (input.date || '상세 공고문 일정 및 신청방법 참조');

  return {
    headline: stripEmojis(`${org}에서 안내하는 ${input.title} 지원 정보입니다.`),
    bullets: [
      `1. [개요] ${stripEmojis(input.title)}`,
      `2. [대상] ${stripEmojis(input.target || (isPolicy ? '순천시민 및 해당 요건 충족자' : '순천시민 및 관련 이해관계자'))}`,
      `3. [신청] ${stripEmojis(applyMethodText)}`
    ],
    targetAudience: stripEmojis(input.target || '순천시민 및 관련 대상자'),
    deadline: stripEmojis(crawled?.applyTerm || input.date || '상시신청 / 공고문 확인'),
    requiredDocuments: docs,
    tip: isNoDoc 
      ? '별도의 오프라인 서류 제출 없이 공식 접수처에서 온라인으로 즉시 신청 가능합니다.' 
      : '상세 지원 자격 및 필수 제출 서류는 공고 원문 링크를 통해 반드시 확인하세요.'
  };
}

