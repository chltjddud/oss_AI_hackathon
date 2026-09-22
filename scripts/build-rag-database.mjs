// scripts/build-rag-database.mjs
// 순천시 실제 공공 복지 정책 및 공지사항 RAG 벡터 데이터베이스 구축 스크립트

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 1. .env.local 환경 변수 로드
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const GEMINI_API_KEY = env.GEMINI_API_KEY;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PUBLIC_DATA_API_KEY = env.PUBLIC_DATA_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('[오류] GEMINI_API_KEY가 .env.local에 설정되어 있지 않습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. 순천시 핵심 지자체 정책 정밀 가이드 (실제 조례 및 고시 기준)
const SUNCHEON_CORE_GUIDES = [
  {
    id: 'suncheon-guide-marriage',
    title: '순천시 청년 부부 결혼축하금 지원사업',
    category: '청년·결혼',
    content: `[정책명]: 순천시 청년 부부 결혼축하금 지원사업
[소관기관]: 전라남도 순천시 청년정책과
[지원내용]: 신혼부부당 총 200만원 지급 (순천사랑상품권 및 현금 계좌 입금, 생애 1회)
[지원대상 및 자격요건]:
- 혼인신고일 기준 남녀 부부 모두 만 49세 이하
- 혼인신고 이후 부부 모두 신청일 기준 6개월 이상 순천시에 계속하여 주민등록을 두고 거주 중인 자
- 부부 중 최소 1명 이상은 초혼이어야 함
[제외대상]: 타 지자체에서 동일 또는 유사한 결혼축하금/결혼장려금을 기 수령한 가구
[필수 구비서류]:
1. 혼인관계증명서(상세) 1부 (정부24 또는 전자가족관계등록시스템 무료 발급)
2. 부부 각자의 주민등록초본(주소이력 포함) 각 1부 (정부24 무료 발급)
3. 신청인 신분증 사본 및 입금 통장 사본
4. 결혼축하금 지급 신청서 (행정복지센터 비치)
[신청방법]: 주소지 관할 읍·면·동 행정복지센터 방문 신청`,
    metadata: {
      type: 'guide',
      org: '순천시 청년정책과',
      target: '만 49세 이하 순천시 거주 신혼부부',
      amount: '200만원',
      requiredDocs: ['혼인관계증명서(상세)', '주민등록초본', '통장사본', '신분증'],
      url: 'https://www.suncheon.go.kr'
    }
  },
  {
    id: 'suncheon-guide-youth-rent',
    title: '순천시 청년 월세 특별지원 (국토부 연계 및 순천 청년 주거비)',
    category: '주거·청년',
    content: `[정책명]: 순천시 청년 월세 특별지원
[소관기관]: 국토교통부 및 전라남도 순천시 건축과 / 청년정책과
[지원내용]: 실제 납부하는 월세 중 최대 월 10만원~20만원, 최대 12개월(총 120만~240만원) 분할 지원
[지원대상 및 자격요건]:
- 연령: 만 19세 ~ 34세 청년 무주택자 (순천시 주민등록 거주)
- 소득요건: 청년가구 기준중위소득 60% 이하 및 부모를 포함한 원가구 기준중위소득 100% 이하
- 주택요건: 임차보증금 5,000만원 이하 및 월세 70만원 이하 주택 (보증금 월세 환산액 적용 시 최대 90만원)
[제외대상]: 주택 소유자, 직계존속 주택 임차, 공공임대주택 거주자, 지자체 유사 주거지원 기수혜자
[필수 구비서류]:
1. 확정일자 날인된 임대차계약서 사본
2. 최근 3개월간 월세 이체 내역서(계좌이체 영수증)
3. 통장 사본 및 신분증
4. 가족관계증명서(상세) (정부24 온라인 무료 발급 가능)
[신청방법]: 복지로(bokjiro.go.kr) 온라인 신청 또는 주소지 읍면동 행정복지센터 방문 접수`,
    metadata: {
      type: 'guide',
      org: '순천시 건축과 / 국토교통부',
      target: '만 19~34세 순천시 무주택 청년',
      amount: '월 최대 10만~20만원 (최대 12개월)',
      requiredDocs: ['임대차계약서', '월세이체영수증', '통장사본', '가족관계증명서'],
      url: 'https://www.bokjiro.go.kr'
    }
  },
  {
    id: 'suncheon-guide-citizen-insurance',
    title: '순천시 시민안전보험 (전 시민 자동 무료가입 혜택)',
    category: '복지·안전',
    content: `[정책명]: 순천시 시민안전보험
[소관기관]: 전라남도 순천시 안전총괄과
[지원내용]: 일상생활 중 예상치 못한 재난·재해 및 안전사고 발생 시 최대 2,000만원 한도 보험금 지급
[보장내용]:
- 자연재해(태풍, 홍수, 지진 등) 사망
- 폭발·화재·붕괴 상해사망 및 후유장해 (최대 2,000만원)
- 대중교통 이용 중 상해사망 및 후유장해
- 농기계 사고 상해사망 및 후유장해
- 스쿨존 교통사고 부상치료비 (만 12세 이하)
- 개물림 사고 응급실 내원 진료비 등
[지원대상]: 순천시에 주민등록을 두고 거주하는 모든 시민 (등록외국인 포함), 별도 가입 절차 없이 자동 무료 가입
[타 보험 중복 여부]: 개인 실손보험 등 타 보험 가입 여부와 상관없이 중복 보장 가능
[필수 구비서류]: 보험금청구서, 신분증 사본, 주민등록등본(정부24 발급), 사고사실확인서, 진단서 및 진료비영수증
[청구방법]: 사고 발생일로부터 3년 이내 한국지방재정공제회 시민안전보험 통합콜센터(1577-5939) 또는 순천시 안전총괄과 청구`,
    metadata: {
      type: 'guide',
      org: '순천시 안전총괄과',
      target: '순천시에 주민등록을 둔 모든 시민 (등록외국인 포함)',
      amount: '최대 2,000만원 한도',
      requiredDocs: ['보험금청구서', '주민등록등본', '진단서', '영수증'],
      url: 'https://www.suncheon.go.kr'
    }
  },
  {
    id: 'suncheon-guide-voucher',
    title: '순천사랑상품권 (모바일 chak 및 지류형 10% 특별할인)',
    category: '일자리·소상공인',
    content: `[정책명]: 순천사랑상품권 할인 판매 및 발행
[소관기관]: 전라남도 순천시 경제진흥과
[지원내용]: 권면금액 대비 상시 10% 선할인 구매 지원 (월 개인 구매한도 50만~100만원)
[사용처]: 순천시 관내 등록 가맹점 (전통시장, 음식점, 병원, 약국, 학원, 미용실, 주유소 등 1만여 개소)
[제외대상]: 대형마트, 기업형 슈퍼마켓(SSM), 유흥업소, 연매출 30억원 초과 가맹점
[구매방법]:
- 모바일형: '지역상품권 chak' 스마트폰 앱 설치 후 회원가입 및 계좌 연결 구매
- 지류(종이)형: 순천시 관내 농·축협, 광주은행, 새마을금고, 신협 등 49개 금융기관 신분증 지참 방문 구매
[소득공제]: 연말정산 시 30%(전통시장 40%) 소득공제 혜택`,
    metadata: {
      type: 'guide',
      org: '순천시 경제진흥과',
      target: '순천시민 및 순천 방문 소비자',
      amount: '10% 선할인 혜택',
      requiredDocs: ['신분증(지류 구매 시)', '스마트폰 지역상품권 chak 앱'],
      url: 'https://www.suncheon.go.kr'
    }
  },
  {
    id: 'suncheon-guide-exam-fee',
    title: '순천시 청년 취업 자격증 시험 응시료 지원',
    category: '청년·일자리',
    content: `[정책명]: 순천시 청년 구직 역량강화 자격증 응시료 지원
[소관기관]: 전라남도 순천시 청년정책과
[지원내용]: 어학 및 국가자격증 시험 응시료 실비 1인당 연 최대 10만~20만원 지원 (1회당 최대 5만원 내외)
[지원대상 및 자격요건]:
- 신청일 기준 순천시에 거주하는 만 18세 이상 ~ 39세 이하 미취업 청년
- 취업 여부: 고용보험 미가입자 (단, 단기 아르바이트 주 30시간 미만 가입자는 인정 가능)
[지원대상 시험]:
- 어학시험: TOEIC, TOEFL, TEPS, OPIc, JPT, HSK 등
- 국가기술자격법 및 국가공인 민간자격시험, 한국사능력검정시험 등
[필수 구비서류]:
1. 응시확인서 또는 성적표 사본
2. 응시료 결제 영수증
3. 주민등록초본 (정부24 온라인 발급)
4. 건강보험 자격득실확인서 (국민건강보험공단 발급)
5. 본인 명의 통장 사본
[신청방법]: 순천시청 청년정책포털 온라인 접수 또는 읍면동 행정복지센터 방문 접수`,
    metadata: {
      type: 'guide',
      org: '순천시 청년정책과',
      target: '순천시 만 18~39세 미취업 청년',
      amount: '연 최대 10만~20만원',
      requiredDocs: ['응시확인서', '결제영수증', '주민등록초본', '건강보험자격득실확인서', '통장사본'],
      url: 'https://www.suncheon.go.kr'
    }
  },
  {
    id: 'suncheon-guide-birth-support',
    title: '순천시 출산장려금 및 첫만남이용권 지원',
    category: '육아·교육',
    content: `[정책명]: 순천시 출산장려금 및 첫만남이용권 바우처
[소관기관]: 전라남도 순천시 모자보건팀 및 보건복지부
[지원내용]:
1. 첫만남이용권 (정부): 출생아 1명당 200만원, 둘째 이상 300만원 국민행복카드 바우처 지급 (사용기간 1년)
2. 순천시 출산장려금: 첫째아 100만원, 둘째아 200만원, 셋째아 이상 300만~500만원 연차별 분할 지급
[지원대상]:
- 출생일 기준 부 또는 모가 순천시에 6개월 이상 주민등록을 두고 계속 거주하는 가정
- 6개월 미만 거주 시 거주기간 충족 시점부터 신청 및 지급 가능
[필수 구비서류]:
1. 출생신고서 및 가족관계증명서 (정부24)
2. 부 또는 모 신분증 및 통장 사본
3. 주민등록등본
[신청방법]: 정부24 '행복출산 원스톱 서비스' 온라인 신청 또는 출생신고 시 주소지 읍면동 행정복지센터 동시 신청`,
    metadata: {
      type: 'guide',
      org: '순천시 보건소',
      target: '순천시 출산 가정',
      amount: '첫만남이용권 200만~300만원 + 순천시 장려금 100만~500만원',
      requiredDocs: ['출생신고서', '가족관계증명서', '주민등록등본', '통장사본'],
      url: 'https://www.gov.kr'
    }
  },
  {
    id: 'suncheon-guide-senior-transport',
    title: '순천시 70세 이상 어르신 시내버스 무임교통 및 백세장수수당',
    category: '어르신·복지',
    content: `[정책명]: 순천시 어르신 시내버스 무료이용 지원 및 장수수당
[소관기관]: 전라남도 순천시 교통과 / 노인복지과
[지원내용]:
1. 어르신 무료 교통카드: 관내 시내버스 무제한 무료 탑승 지원 (탑승 시 전용 카드 태그)
2. 백세장수수당: 순천시 거주 만 80세 또는 만 85세 이상 어르신 대상 월별 장수수당 계좌 입금
[지원대상]:
- 시내버스 무료이용: 순천시에 주민등록을 둔 만 70세 이상 어르신 (생일 도래자)
- 장수수당: 순천시에 1년 이상 계속 거주 중인 고령 어르신
[필수 구비서류]: 신분증(주민등록증 또는 운전면허증), 본인 명의 통장 사본, 증명사진 1매 (교통카드 발급용)
[신청방법]: 주소지 관할 읍·면·동 행정복지센터 방문 신청 및 카드 즉시 발급`,
    metadata: {
      type: 'guide',
      org: '순천시 교통과 / 노인복지과',
      target: '순천시 거주 만 70세 이상 어르신',
      amount: '시내버스 전액 무료 + 장수수당',
      requiredDocs: ['신분증', '통장사본', '증명사진 1매'],
      url: 'https://www.suncheon.go.kr'
    }
  }
];

// 3. 공공데이터 API 보조금24 순천시 적용 정책 수집
async function fetchPublicPolicies() {
  if (!PUBLIC_DATA_API_KEY) {
    console.warn('[알림] PUBLIC_DATA_API_KEY가 없어 공공데이터 수집을 건너뜁니다.');
    return [];
  }

  const fetchParam = async (param) => {
    try {
      const url = `https://api.odcloud.kr/api/gov24/v3/serviceList?page=1&perPage=100&serviceKey=${PUBLIC_DATA_API_KEY}&${param}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      console.warn(`[알림] API 조회 실패 (${param}):`, e.message);
      return [];
    }
  };

  const [suncheonItems, jeonnamItems, youthItems, centralItems] = await Promise.all([
    fetchParam('cond%5B%EC%86%8C%EA%B4%80%EA%B8%B0%EA%B4%80%EB%AA%85%3A%3ALIKE%5D=' + encodeURIComponent('순천')),
    fetchParam('cond%5B%EC%86%8C%EA%B4%80%EA%B8%B0%EA%B4%80%EB%AA%85%3A%3ALIKE%5D=' + encodeURIComponent('전남광주통합특별시')),
    fetchParam('cond%5B%EC%84%9C%EB%B9%84%EC%8A%A4%EB%AA%85%3A%3ALIKE%5D=' + encodeURIComponent('청년')),
    fetchParam('cond%5B%EC%86%8C%EA%B4%80%EA%B8%B0%EA%B4%80%EC%9C%A0%ED%98%95%3A%3AEQ%5D=' + encodeURIComponent('중앙행정기관'))
  ]);

  const rawList = [...suncheonItems, ...jeonnamItems, ...youthItems, ...centralItems];
  const uniqueMap = new Map();

  const otherDistricts = [
    '여수', '목포', '북구', '서구', '남구', '동구', '광산구', '광산',
    '나주', '광양', '담양', '곡성', '구례', '고흥', '보성', '화순',
    '장흥', '강진', '해남', '영암', '무안', '함평', '영광', '장성',
    '완도', '진도', '신안'
  ];

  const otherProvinces = [
    '서울', '부산', '대구', '인천', '대전', '울산', '세종',
    '경기', '경기도', '강원', '강원도', '충북', '충남', '충청',
    '전북', '전라북도', '경북', '경상북도', '경남', '경상남도', '제주',
    '파주', '관악', '영도', '수원', '용인', '성남', '고양'
  ];

  const isEligibleForSuncheon = (org, target = '', desc = '', title = '') => {
    const fullText = `${org} ${target} ${desc} ${title}`;
    if (org.includes('순천') || fullText.includes('순천시') || fullText.includes('순천시민')) {
      return true;
    }
    if (otherDistricts.some(dist => org.includes(dist) || title.includes(`${dist}시`) || title.includes(`${dist}군`) || title.includes(`${dist}구`))) {
      return false;
    }
    if (otherProvinces.some(prov => org.includes(prov) || title.includes(prov))) {
      return false;
    }
    if (otherDistricts.some(dist => target.includes(`${dist} 거주`) || target.includes(`${dist}시민`) || target.includes(`${dist}구민`))) {
      return false;
    }
    if (otherProvinces.some(prov => target.includes(`${prov} 거주`) || target.includes(`${prov}시민`) || target.includes(`${prov}도민`))) {
      return false;
    }
    if (org.includes('전남광주통합특별시') || org.includes('전라남도') || org.includes('전남도청')) {
      return true;
    }
    return true;
  };

  for (const item of rawList) {
    const id = item['서비스ID'] || item['서비스아이디'];
    const title = item['서비스명'] || item['서비스명칭'] || '';
    const org = item['소관기관명'] || '';
    const desc = item['서비스목적'] || item['지원내용'] || '';
    const target = item['지원대상'] || item['선정기준'] || '';

    if (!id || !title) continue;
    if (uniqueMap.has(id)) continue;

    // 순천시민 대상 정책 여부 엄격 검증
    if (!isEligibleForSuncheon(org, target, desc, title)) continue;

    uniqueMap.set(id, {
      id: `gov24-${id}`,
      title,
      category: item['소관기관유형'] || '공공복지',
      content: `[정책명]: ${title}
[소관기관]: ${org}
[지원대상]: ${target || '순천시민 및 적격 요건 충족 가구'}
[지원내용]: ${desc || '상세 공고 참조'}
[신청방법]: ${item['신청방법'] || '정부24(gov.kr) 또는 주민센터 접수'}
[문의처]: ${item['문의처전화번호'] || '정부24 콜센터 1588-2188'}`,
      metadata: {
        type: 'policy',
        sourceId: id,
        org,
        target: target.slice(0, 200),
        url: item['상세조회URL'] || 'https://www.gov.kr'
      }
    });
  }


  return Array.from(uniqueMap.values());
}

// 4. Supabase notices 테이블 공지사항 수집
async function fetchSupabaseNotices() {
  try {
    const { data, error } = await supabase
      .from('notices')
      .select('id, title, source, dept, date, link, reason')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      console.warn('[알림] Supabase notices 조회 실패:', error?.message);
      return [];
    }

    return data.map(n => ({
      id: `notice-${n.id}`,
      title: n.title,
      category: '순천시공지',
      content: `[공지제목]: ${n.title}
[출처]: ${n.source}
[담당부서]: ${n.dept || '순천시청'}
[공고일자]: ${n.date || '최신'}
[주요내용 요약]: ${n.reason || n.title}
[원문링크]: ${n.link}`,
      metadata: {
        type: 'notice',
        sourceId: n.id,
        org: n.dept || n.source,
        date: n.date,
        url: n.link
      }
    }));
  } catch (e) {
    console.warn('[알림] Supabase notices 에러:', e.message);
    return [];
  }
}

// 5. Gemini Embedding 일괄 생성 (기존 캐시 재사용 및 429 지수 백오프 지원)
async function generateEmbeddingsInBatches(documents, batchSize = 10) {
  console.log(`[RAG] 총 ${documents.length}개 문서의 768차원 임베딩 검사 및 생성을 시작합니다.`);

  // 기존 캐시 로드하여 이미 임베딩된 문서는 재사용
  const dataDir = path.join(process.cwd(), 'data');
  const cachePath = path.join(dataDir, 'rag_embeddings.json');
  const existingMap = new Map();
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (Array.isArray(cached)) {
        for (const item of cached) {
          if (item.id && item.embedding && item.embedding.length === 768) {
            existingMap.set(item.id, item.embedding);
          }
        }
      }
    } catch (e) {
      console.warn('[RAG] 기존 캐시 파싱 에러:', e.message);
    }
  }

  console.log(`[RAG] 기존 재사용 가능한 유효 임베딩 캐시: ${existingMap.size}개 발견`);

  const results = [];
  const needEmbedding = [];

  for (const doc of documents) {
    if (existingMap.has(doc.id)) {
      results.push({ ...doc, embedding: existingMap.get(doc.id) });
    } else {
      needEmbedding.push(doc);
    }
  }

  console.log(`[RAG] 새로 임베딩을 생성해야 하는 문서: ${needEmbedding.length}개`);

  for (let i = 0; i < needEmbedding.length; i += batchSize) {
    const batch = needEmbedding.slice(i, i + batchSize);
    const requests = batch.map(doc => ({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text: `${doc.title}\n${doc.content}`.slice(0, 2000) }] },
      outputDimensionality: 768
    }));

    let success = false;
    let attempts = 0;

    while (!success && attempts < 3) {
      attempts++;
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests })
          }
        );

        if (res.status === 429) {
          console.warn(`\n[RAG] 429 Quota Rate Limit 감지. ${attempts * 6}초 대기 후 재시도...`);
          await new Promise(r => setTimeout(r, attempts * 6000));
          continue;
        }

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`\n[RAG] 배치 오류 (${res.status}): ${errText.slice(0, 100)}`);
          break;
        }

        const data = await res.json();
        const embeddings = data.embeddings || [];
        for (let j = 0; j < batch.length; j++) {
          results.push({
            ...batch[j],
            embedding: embeddings[j]?.values || null
          });
        }
        success = true;
      } catch (err) {
        console.warn(`\n[RAG] 배치 요청 예외:`, err.message);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (!success) {
      for (const doc of batch) {
        results.push({ ...doc, embedding: null });
      }
    }

    process.stdout.write(`진행률: ${Math.min(i + batchSize, needEmbedding.length)} / ${needEmbedding.length}\r`);
    // Rate limit 방지를 위한 1초 대기
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n[RAG] 임베딩 생성 및 통합 완료.');
  return results;
}


// 6. 메인 실행 함수
async function main() {
  console.log('=== 순천시 복지 RAG 벡터 데이터베이스 구축 시작 ===');

  console.log('[1/4] 순천시 핵심 조례 및 맞춤형 가이드 로드...');
  console.log(`- 핵심 가이드: ${SUNCHEON_CORE_GUIDES.length}개`);

  console.log('[2/4] 공공데이터(보조금24) 순천시 적용 정책 수집...');
  const publicPolicies = await fetchPublicPolicies();
  console.log(`- 공공데이터 정책: ${publicPolicies.length}개`);

  console.log('[3/4] Supabase 실시간 순천시 공지사항 수집...');
  const notices = await fetchSupabaseNotices();
  console.log(`- 순천시 공지사항: ${notices.length}개`);

  const allDocuments = [...SUNCHEON_CORE_GUIDES, ...publicPolicies, ...notices];
  console.log(`=> 총 통합 지식 문서 수: ${allDocuments.length}개`);

  console.log('[4/4] Gemini gemini-embedding-001 (768차원) 벡터화 실행...');
  const embeddedDocs = await generateEmbeddingsInBatches(allDocuments, 20);

  // 로컬 data 디렉토리에 저장
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outFilePath = path.join(dataDir, 'rag_embeddings.json');
  fs.writeFileSync(outFilePath, JSON.stringify(embeddedDocs, null, 2), 'utf8');
  console.log(`[성공] 로컬 벡터 캐시 저장 완료: ${outFilePath} (문서 수: ${embeddedDocs.length})`);

  // Supabase rag_knowledge_documents 테이블에 업서트 시도
  const validEmbeddings = embeddedDocs.filter(d => d.embedding && d.embedding.length === 768);
  console.log(`[Supabase] 유효 임베딩 문서 ${validEmbeddings.length}개 Supabase 동기화 시도...`);

  let supabaseSuccessCount = 0;
  for (let i = 0; i < validEmbeddings.length; i += 25) {
    const batch = validEmbeddings.slice(i, i + 25).map(d => ({
      title: d.title,
      category: d.category,
      content: d.content,
      metadata: d.metadata,
      embedding: d.embedding
    }));

    const { error } = await supabase.from('rag_knowledge_documents').insert(batch);
    if (error) {
      console.warn(`[Supabase] RLS 또는 권한 정책으로 클라우드 직접 삽입 건너뜀 (${error.message}).`);
      console.log('[안내] 로컬 하이브리드 벡터 캐시가 구축되어 즉시 실시간 RAG가 작동합니다.');
      break;
    } else {
      supabaseSuccessCount += batch.length;
    }
  }

  if (supabaseSuccessCount > 0) {
    console.log(`[성공] Supabase rag_knowledge_documents ${supabaseSuccessCount}건 업로드 완료!`);
  }

  console.log('=== 순천시 복지 RAG 데이터베이스 구축 완료 ===');
}

main().catch(err => {
  console.error('[오류]', err);
  process.exit(1);
});
