import { fetchSuncheonApplicableBenefits, ApplicablePolicy } from './api';
import { getMergedNotices, CrawledItem } from './crawler';
import { searchRagDocuments, RagDocumentChunk } from './rag';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  suggestedPolicies?: Array<{
    id: string;
    title: string;
    org?: string;
    target?: string;
    scope?: string;
    url?: string;
  }>;
  suggestedNotices?: Array<{
    id: string;
    title: string;
    source?: string;
    link?: string;
    dept?: string;
  }>;
}

export interface ChatResponse {
  message: string;
  suggestedPolicies: Array<{
    id: string;
    title: string;
    org?: string;
    target?: string;
    scope?: string;
    url?: string;
  }>;
  suggestedNotices: Array<{
    id: string;
    title: string;
    source?: string;
    link?: string;
    dept?: string;
  }>;
}

function stripEmojis(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}]/gu, '')
    .trim();
}

export async function processChatCounseling(messages: ChatMessage[]): Promise<ChatResponse> {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('대화 메시지가 필요합니다.');
  }

  const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const userQuery = latestUserMessage ? latestUserMessage.content.trim() : '';

  if (!userQuery) {
    throw new Error('질문 내용을 입력해주세요.');
  }

  // 1. 공공 데이터(지원 정책 + 공지사항) 및 고정밀 RAG 벡터 검색 병렬 실행
  const [allPolicies, allNotices, ragDocs] = await Promise.all([
    fetchSuncheonApplicableBenefits(),
    getMergedNotices(false),
    searchRagDocuments(userQuery, { topK: 5, threshold: 0.35 }).catch(() => [] as RagDocumentChunk[])
  ]);

  const apiKey = process.env.GEMINI_API_KEY;

  // 2. 검색어 기반 스마트 후보군 정렬
  const queryTokens = userQuery
    .toLowerCase()
    .split(/[\s,./?~!]+/)
    .filter((t: string) => t.length >= 2);

  const scorePolicy = (p: ApplicablePolicy) => {
    const text = `${p.title} ${p.target} ${p.category} ${p.dept} ${p.description}`.toLowerCase();
    let score = 0;
    queryTokens.forEach(t => {
      if (text.includes(t)) score += 5;
    });
    if (p.scope === 'suncheon') score += 3;
    return score;
  };

  const sortedPolicies = [...allPolicies]
    .sort((a, b) => scorePolicy(b) - scorePolicy(a))
    .slice(0, 25);

  const scoreNotice = (n: CrawledItem) => {
    const text = `${n.title} ${n.source} ${n.dept || ''} ${n.reason || ''}`.toLowerCase();
    let score = 0;
    queryTokens.forEach(t => {
      if (text.includes(t)) score += 5;
    });
    return score;
  };

  const sortedNotices = [...allNotices]
    .sort((a, b) => scoreNotice(b) - scoreNotice(a))
    .slice(0, 15);

  // Policy / Notice Lookup maps
  const policyMap = new Map(allPolicies.map(p => [p.id, p]));
  const noticeMap = new Map(allNotices.map(n => [n.id, n]));

  // Fallback if no API key
  if (!apiKey) {
    return generateFallbackResponse(userQuery, sortedPolicies, sortedNotices, ragDocs);
  }

  // 3. 대화 히스토리 구성 (최근 6개 턴)
  const conversationHistory = messages.slice(-6).map(m => {
    return `${m.role === 'user' ? '사용자' : '상담사'}: ${m.content}`;
  }).join('\n');

  // RAG 컨텍스트 텍스트 빌드
  const ragContextText = ragDocs.length > 0
    ? ragDocs.map((doc, idx) => `[RAG 근거 #${idx + 1} | 제목: ${doc.title} | 분야: ${doc.category} | 유사도: ${Math.round((doc.similarity || 0) * 100)}%]
${doc.content}
- 기관: ${doc.metadata?.org || '순천시'}
- 공식 링크: ${doc.metadata?.url || 'https://www.suncheon.go.kr'}
- 구비서류 안내: ${doc.metadata?.requiredDocs?.join(', ') || '해당 공고문 참조'}`).join('\n\n')
    : '해당 질의에 대한 직접적인 RAG 근거 문서는 없으므로 아래 공공데이터 후보군을 기반으로 답변합니다.';

  const prompt = `당신은 순천시민을 위한 전문 1:1 맞춤 행정·복지 AI 비서 '순천 복지 도우미'입니다.
사용자가 자신의 상황이나 지원 혜택에 대해 1:1 상담 질문을 하고 있습니다.
아래 제공된 [RAG 고정밀 순천시 정책 근거 자료]와 [순천시 지원 정책 및 실시간 공지사항 목록]을 바탕으로, 정확하고 친절하며 신뢰감 있는 상담 답변을 제공해주세요.

[사용자와의 최근 대화 기록]
${conversationHistory}

[RAG 고정밀 순천시 복지 지식베이스 검색 결과]:
${ragContextText}

[순천시 지원 정책 후보]:
${sortedPolicies.map((p, i) => `[P_${i} | ID: ${p.id}] ${p.title} | 기관: ${p.org} | 대상: ${p.target} | 내용: ${p.description.slice(0, 140)}`).join('\n')}

[순천시 실시간 공지사항 후보]:
${sortedNotices.map((n, i) => `[N_${i} | ID: ${n.id}] [${n.source}] ${n.title} (${n.date || '최신'})`).join('\n')}

[답변 작성 지침]:
1. 일체의 이모티콘(이모지)을 절대 사용하지 마세요.
2. [RAG 고정밀 순천시 복지 지식베이스 검색 결과]에 명시된 실제 정책 내용(지원금액, 지원대상 연령/소득요건, 제외대상, 신청처)을 우선적으로 인용하여 사실에 기반해 정확하게 답변하세요.
3. [필수 구비서류 및 정부24 안내]: 사용자가 신청 시 사전에 준비해야 할 구비서류(예: 신분증, 주민등록등본, 가족관계증명서, 임대차계약서, 소득증빙서류 등)를 명확하게 불릿 포인트로 정리해 주고, 주민등록등본·초본, 가족관계증명서, 소득금액증명원 등 주요 민원 서류는 정부24(gov.kr)나 홈택스에서 온라인 무료 발급이 가능하다는 실용적인 안내를 덧붙여주세요.
4. 사용자가 추가로 문의하거나 보충하면 좋을 사항(예: 거주기간 요건, 나이 기준 등)을 덧붙여주세요.
5. 사용자 상황과 가장 밀접한 추천 정책 ID(최대 3개)와 공지사항 ID(최대 2개)를 배열에 담아주세요. (RAG 근거에 있는 정책의 ID나 상기 정책 후보의 ID 활용 가능)

반드시 다음 JSON 형식으로만 응답하세요:
{
  "message": "상담 답변 본문 (문단 구분과 명확한 불릿 포인트 활용 가능)",
  "recommendedPolicyIds": ["추천 정책 ID"],
  "recommendedNoticeIds": ["추천 공지 ID"]
}`;

  // 최상위 추론 모델 gemini-3.7-flash 우선 배치
  const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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
              temperature: 0.25
            }
          }),
          signal: AbortSignal.timeout(15000)
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
      // 다음 모델 재시도
    }
  }

  if (!aiResponseText) {
    return generateFallbackResponse(userQuery, sortedPolicies, sortedNotices, ragDocs);
  }

  try {
    const parsed = JSON.parse(aiResponseText);
    const cleanMessage = stripEmojis(parsed.message) || '문의하신 내용에 부합하는 순천시 지원 정책을 선별해 안내해 드립니다.';

    const suggestedPolicies: ChatResponse['suggestedPolicies'] = [];
    if (Array.isArray(parsed.recommendedPolicyIds)) {
      parsed.recommendedPolicyIds.forEach((id: string) => {
        const policy = policyMap.get(id);
        if (policy) {
          suggestedPolicies.push({
            id: policy.id,
            title: policy.title,
            org: policy.org,
            target: policy.target,
            scope: policy.scope,
            url: policy.url
          });
        }
      });
    }

    const suggestedNotices: ChatResponse['suggestedNotices'] = [];
    if (Array.isArray(parsed.recommendedNoticeIds)) {
      parsed.recommendedNoticeIds.forEach((id: string) => {
        const notice = noticeMap.get(id);
        if (notice) {
          suggestedNotices.push({
            id: notice.id,
            title: notice.title,
            source: notice.source,
            link: notice.link,
            dept: notice.dept
          });
        }
      });
    }

    // RAG 검색 결과로부터 추천 정책 보강
    if (suggestedPolicies.length < 2 && ragDocs.length > 0) {
      for (const doc of ragDocs) {
        if (doc.metadata?.type !== 'notice' && !suggestedPolicies.some(p => p.title === doc.title)) {
          suggestedPolicies.push({
            id: doc.id,
            title: doc.title,
            org: doc.metadata?.org || '순천시',
            target: doc.metadata?.target || '순천시민',
            scope: 'suncheon',
            url: doc.metadata?.url || 'https://www.suncheon.go.kr'
          });
          if (suggestedPolicies.length >= 3) break;
        }
      }
    }

    // 결과가 비어있으면 관련도가 높은 상위 1개 보강
    if (suggestedPolicies.length === 0 && sortedPolicies.length > 0) {
      const topP = sortedPolicies[0];
      suggestedPolicies.push({
        id: topP.id,
        title: topP.title,
        org: topP.org,
        target: topP.target,
        scope: topP.scope,
        url: topP.url
      });
    }

    return {
      message: cleanMessage,
      suggestedPolicies,
      suggestedNotices
    };
  } catch (err) {
    console.error('Failed to parse Gemini chat response:', err);
    return generateFallbackResponse(userQuery, sortedPolicies, sortedNotices, ragDocs);
  }
}

function generateFallbackResponse(
  query: string,
  policies: ApplicablePolicy[],
  notices: CrawledItem[],
  ragDocs: RagDocumentChunk[] = []
): ChatResponse {
  const topPolicies = policies.slice(0, 3).map(p => ({
    id: p.id,
    title: p.title,
    org: p.org,
    target: p.target,
    scope: p.scope,
    url: p.url
  }));

  const topNotices = notices.slice(0, 2).map(n => ({
    id: n.id,
    title: n.title,
    source: n.source,
    link: n.link,
    dept: n.dept
  }));

  let message = '';
  if (ragDocs.length > 0) {
    const topDoc = ragDocs[0];
    message = `문의하신 내용과 가장 관련도가 높은 순천시 정책은 '${topDoc.title}'입니다.\n\n` +
      `[주요 내용]\n${topDoc.content}\n\n` +
      `[안내 및 구비서류]\n` +
      `- 주요 민원 서류(주민등록등본, 가족관계증명서, 소득금액증명원 등)는 정부24(gov.kr) 또는 홈택스에서 온라인 무료 즉시 발급이 가능합니다.\n` +
      `- 세부 지원 요건 및 접수 일정은 하단의 추천 정책을 확인해 주시기 바랍니다.`;
  } else {
    message = `문의하신 '${query}' 관련 순천시 지원 정책 및 최신 공지사항을 선별해 안내해 드립니다.\n\n` +
      `[안내 및 구비서류]\n` +
      `- 신청 전 관할 읍·면·동 행정복지센터나 정부24(gov.kr)를 통해 최신 접수 요건 및 서류를 사전 확인하시는 것을 권장합니다.\n` +
      `- 주민등록등본, 초본, 소득금액증명원 등 주요 구비서류는 정부24에서 온라인 무료 발급이 가능합니다.`;
  }

  return {
    message: stripEmojis(message),
    suggestedPolicies: topPolicies,
    suggestedNotices: topNotices
  };
}
