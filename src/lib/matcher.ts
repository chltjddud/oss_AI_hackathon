import { fetchSuncheonApplicableBenefits, ApplicablePolicy } from './api';
import { getMergedNotices, CrawledItem } from './crawler';

export interface MatchedPolicyItem extends ApplicablePolicy {
  matchReason: string;
  relevanceScore: number;
}

export interface MatchedNoticeItem extends CrawledItem {
  matchReason: string;
  relevanceScore: number;
}

export interface MatchResult {
  userSituationSummary: string;
  aiAdvice: string;
  actionTips: string[];
  matchedPolicies: MatchedPolicyItem[];
  matchedNotices: MatchedNoticeItem[];
}

function stripEmojis(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}]/gu, '')
    .trim();
}

export async function matchSituation(situation: string): Promise<MatchResult> {
  const cleanSituation = situation.trim();
  if (!cleanSituation) {
    throw new Error('상황이나 검색어를 입력해주세요.');
  }

  // 1. 공공 데이터(지원 정책 + 공지사항) 로드
  const [allPolicies, allNotices] = await Promise.all([
    fetchSuncheonApplicableBenefits(),
    getMergedNotices(false)
  ]);

  const apiKey = process.env.GEMINI_API_KEY;

  // 2. 검색어 기반 스마트 후보군 사전 정렬
  const queryTokens: string[] = cleanSituation
    .toLowerCase()
    .split(/[\s,./?~!]+/)
    .filter((t: string) => t.length >= 2);

  const scorePolicyCandidate = (p: ApplicablePolicy) => {
    const text = `${p.title} ${p.target} ${p.category} ${p.dept} ${p.description}`.toLowerCase();
    let score = 0;
    queryTokens.forEach((token: string) => {
      if (text.includes(token)) score += 5;
    });
    if (p.scope === 'suncheon') score += 3;
    return score;
  };

  const sortedCandidatePolicies = [...allPolicies]
    .sort((a, b) => scorePolicyCandidate(b) - scorePolicyCandidate(a))
    .slice(0, 45);

  const candidatePolicies = sortedCandidatePolicies.map((p, idx) => ({
    indexId: `P_${idx}`,
    id: p.id,
    title: p.title,
    target: p.target,
    description: p.description.slice(0, 150),
    category: p.category
  }));

  const scoreNoticeCandidate = (n: CrawledItem) => {
    const text = `${n.title} ${n.source} ${n.dept || ''} ${n.reason || ''}`.toLowerCase();
    let score = 0;
    queryTokens.forEach((token: string) => {
      if (text.includes(token)) score += 5;
    });
    return score;
  };

  const sortedCandidateNotices = [...allNotices]
    .sort((a, b) => scoreNoticeCandidate(b) - scoreNoticeCandidate(a))
    .slice(0, 35);

  const candidateNotices = sortedCandidateNotices.map((n, idx) => ({
    indexId: `N_${idx}`,
    id: n.id,
    title: n.title,
    source: n.source,
    dept: n.dept || '',
    date: n.date
  }));

  if (!apiKey) {
    return ruleBasedMatch(cleanSituation, allPolicies, allNotices);
  }

  const prompt = `당신은 순천시민을 위한 공공 혜택 및 공지사항 전문 AI 맞춤 상담사입니다.
사용자가 자신의 현재 상황, 고민, 또는 필요한 지원을 입력했습니다.
아래 제공된 [순천시 지원 정책 목록]과 [최신 공지사항 목록]을 면밀히 분석하여, 사용자의 상황에 가장 적합한 혜택과 공지사항을 추천해주세요.

[사용자 상황 입력]
"${cleanSituation}"

[순천시 지원 정책 후보 (P_0 ~ P_${candidatePolicies.length - 1})]
${candidatePolicies.map(p => `[${p.indexId}] ${p.title} | 대상: ${p.target} | 내용: ${p.description}`).join('\n')}

[순천시 최신 공지사항 후보 (N_0 ~ N_${candidateNotices.length - 1})]
${candidateNotices.map(n => `[${n.indexId}] [${n.source}] ${n.title} (${n.date})`).join('\n')}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "userSituationSummary": "입력된 사용자의 핵심 상황 및 자격 요건 1줄 요약",
  "aiAdvice": "사용자에게 전하는 따뜻하고 실질적인 종합 안내 코멘트 (2~3문장)",
  "actionTips": [
    "신청 시 꼭 챙겨야 할 서류나 자격 유지 꿀팁 1",
    "놓치기 쉬운 신청 기한 또는 주의사항 꿀팁 2"
  ],
  "matchedPolicies": [
    {
      "indexId": "P_0",
      "matchReason": "이 정책이 사용자 상황에 왜 최적인지 구체적 설명 (1문장)",
      "relevanceScore": 95
    }
  ],
  "matchedNotices": [
    {
      "indexId": "N_0",
      "matchReason": "이 공지가 사용자에게 왜 유용한지 구체적 설명 (1문장)",
      "relevanceScore": 90
    }
  ]
}

주의:
- matchedPolicies는 가장 관련성이 높은 항목 2개 ~ 5개만 엄선하세요.
- matchedNotices는 가장 관련성이 높은 항목 1개 ~ 4개만 엄선하세요.
- relevanceScore는 70 ~ 99 사이의 정수로 부여하세요.
- 이모티콘(이모지)은 일체 사용하지 마세요.`;

  const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-lite-latest'];
  let aiResponseText = '';

  for (const model of candidateModels) {
    try {
      const aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
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
        }
      );

      if (!aiRes.ok) continue;

      const resJson = await aiRes.json();
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        aiResponseText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        break;
      }
    } catch {
      // 다음 모델 시도
    }
  }

  if (!aiResponseText) {
    return ruleBasedMatch(cleanSituation, allPolicies, allNotices);
  }

  try {
    const parsed = JSON.parse(aiResponseText);

    const matchedPolicies: MatchedPolicyItem[] = [];
    const policyIndexMap = new Map(candidatePolicies.map(c => [c.indexId, c.id]));
    const policyMap = new Map(allPolicies.map(p => [p.id, p]));

    if (Array.isArray(parsed.matchedPolicies)) {
      parsed.matchedPolicies.forEach((m: any) => {
        const originalId = policyIndexMap.get(m.indexId) || m.id;
        const policy = policyMap.get(originalId);
        if (policy) {
          matchedPolicies.push({
            ...policy,
            matchReason: stripEmojis(m.matchReason) || '상황에 부합하는 순천시 지원 정책입니다.',
            relevanceScore: typeof m.relevanceScore === 'number' ? m.relevanceScore : 85
          });
        }
      });
    }

    const matchedNotices: MatchedNoticeItem[] = [];
    const noticeIndexMap = new Map(candidateNotices.map(c => [c.indexId, c.id]));
    const noticeMap = new Map(allNotices.map(n => [n.id, n]));

    if (Array.isArray(parsed.matchedNotices)) {
      parsed.matchedNotices.forEach((m: any) => {
        const originalId = noticeIndexMap.get(m.indexId) || m.id;
        const notice = noticeMap.get(originalId);
        if (notice) {
          matchedNotices.push({
            ...notice,
            matchReason: stripEmojis(m.matchReason) || '상황과 연관된 최신 공지사항입니다.',
            relevanceScore: typeof m.relevanceScore === 'number' ? m.relevanceScore : 80
          });
        }
      });
    }

    matchedPolicies.sort((a, b) => b.relevanceScore - a.relevanceScore);
    matchedNotices.sort((a, b) => b.relevanceScore - a.relevanceScore);

    if (matchedPolicies.length === 0 && matchedNotices.length === 0) {
      return ruleBasedMatch(cleanSituation, allPolicies, allNotices);
    }

    const rawTips = Array.isArray(parsed.actionTips) ? parsed.actionTips : ['신청 자격 요건을 먼저 확인하세요.'];
    const cleanTips = rawTips.map((t: string) => stripEmojis(t)).filter((t: string) => t.length > 0);

    return {
      userSituationSummary: stripEmojis(parsed.userSituationSummary) || '순천시 맞춤 지원 대상자',
      aiAdvice: stripEmojis(parsed.aiAdvice) || '입력하신 상황에 적합한 순천시 혜택과 실시간 공지를 안내해 드립니다.',
      actionTips: cleanTips.length > 0 ? cleanTips : ['신청 자격 요건을 먼저 확인하세요.'],
      matchedPolicies,
      matchedNotices
    };
  } catch (parseErr) {
    console.error('Failed to parse Gemini match response:', parseErr);
    return ruleBasedMatch(cleanSituation, allPolicies, allNotices);
  }
}

function ruleBasedMatch(
  situation: string,
  policies: ApplicablePolicy[],
  notices: CrawledItem[]
): MatchResult {
  const lowerSit = situation.toLowerCase();
  const keywords = lowerSit
    .split(/[\s,./?~!]+/)
    .filter(w => w.length >= 2 && !['순천', '지원', '혜택', '있는', '있나요', '궁금해요', '알려줘'].includes(w));

  const scoreItem = (text: string) => {
    let score = 70;
    const lower = text.toLowerCase();
    keywords.forEach(kw => {
      if (lower.includes(kw)) score += 8;
    });
    return Math.min(score, 98);
  };

  const scoredPolicies = policies
    .map(p => ({
      ...p,
      matchReason: '입력하신 키워드와 관련된 순천시 공공 정책입니다.',
      relevanceScore: scoreItem(`${p.title} ${p.target} ${p.description}`)
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 4);

  const scoredNotices = notices
    .map(n => ({
      ...n,
      matchReason: '입력하신 상황과 관련된 실시간 주요 공지사항입니다.',
      relevanceScore: scoreItem(`${n.title} ${n.dept || ''} ${n.reason || ''}`)
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);

  return {
    userSituationSummary: `순천시 지원 희망 시민 (${keywords.slice(0, 3).join(', ') || '종합 지원'})`,
    aiAdvice: '순천시에서 제공하는 다양한 복지, 주거, 일자리, 문화 지원 사업 중 입력하신 상황에 부합하는 항목들을 선별하였습니다.',
    actionTips: [
      '신청 전 거주지 요건(순천시 주민등록 여부)과 연령 기준을 반드시 확인하세요.',
      '예산 소진 시 조기 마감될 수 있으므로 접수 일정을 유의하시기 바랍니다.'
    ],
    matchedPolicies: scoredPolicies,
    matchedNotices: scoredNotices
  };
}
