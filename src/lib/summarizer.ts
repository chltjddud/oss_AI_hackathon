// Core utility for AI-powered summarization using Google Gemini API

export interface AiSummaryResult {
  headline: string;
  bullets: string[];
  targetAudience: string;
  deadline?: string;
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

export async function summarizeItemWithGemini(input: SummarizeInput): Promise<AiSummaryResult> {
  const cacheKey = `${input.type || 'item'}:${input.id || input.title}`;

  // Check cache
  const cached = summaryCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.summary;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY missing, using fallback rule summary');
    return generateFallbackSummary(input);
  }

  const isPolicy = input.type === 'policy';
  const prompt = `당신은 순천시민을 돕는 친절하고 명쾌한 AI 행정 전문 비서입니다.
아래 순천시 ${isPolicy ? '지원 정책' : '공지사항'} 정보를 읽고, 순천시민이 빠르고 쉽게 이해할 수 있도록 핵심 정보와 마감기한을 작성해주세요.

[제목]: ${input.title}
[기관/출처]: ${input.source || '순천시'}
[담당부서]: ${input.dept || '해당 기관'}
[지원대상]: ${input.target || '공고 본문 참조'}
[상세내용/사유]: ${input.description || '본문 공고 확인 요망'}
[일정/기간/마감기한]: ${input.date || '상세 공고 일정 참조'}

[매우 중요한 지침]:
1. 일체의 이모티콘 및 이모지(예: 💡, 📌, ⏰, ✨, 🎉, 📢 등)를 절대 사용하지 마세요. 오직 깔끔하고 정갈한 한국어 텍스트로만 작성하세요.
2. 신청 마감기한(deadline)을 본문 또는 일정에서 명확하게 파악하여 기록하세요. 기간이 정해지지 않은 경우 '상시접수' 또는 '공고 일정 참조'로 작성하세요.

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
        const cleanedResult: AiSummaryResult = {
          headline: stripEmojis(parsed.headline),
          bullets: parsed.bullets.map((b: string) => stripEmojis(b)),
          targetAudience: stripEmojis(parsed.targetAudience || input.target || '순천시민 요건 충족자'),
          deadline: stripEmojis(parsed.deadline || input.date || '상시접수 / 공고 참조'),
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
  const fallback = generateFallbackSummary(input);
  summaryCache.set(cacheKey, { summary: fallback, cachedAt: Date.now() });
  return fallback;
}

function generateFallbackSummary(input: SummarizeInput): AiSummaryResult {
  const isPolicy = input.type === 'policy';
  const org = input.source || input.dept || '순천시';

  return {
    headline: stripEmojis(`${org}에서 안내하는 ${input.title} 공고입니다.`),
    bullets: [
      `1. [개요] ${stripEmojis(input.title)}`,
      `2. [대상] ${stripEmojis(input.target || (isPolicy ? '순천시민 및 해당 요건 충족자' : '순천시민 및 관련 이해관계자'))}`,
      `3. [일정] ${stripEmojis(input.date || '상세 공고문 일정 참조')} (${org})`
    ],
    targetAudience: stripEmojis(input.target || '순천시민 및 관련 대상자'),
    deadline: stripEmojis(input.date || '상시접수 / 공고문 확인'),
    tip: '상세 지원 자격 및 필수 제출 서류는 공고 원문 링크를 통해 반드시 확인하세요.'
  };
}
