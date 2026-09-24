// src/lib/api.ts

export interface ApplicablePolicy {
  id: string;
  title: string;
  category: string;
  org: string;
  dept: string;
  target: string;
  description: string;
  url: string;
  deadline: string | null;
  scope: 'suncheon' | 'jeonnam' | 'national' | 'youth';
  scopeLabel: string;
  raw?: any;
}

/**
 * 온통청년 API 호출 및 파싱 함수
 * @param pageIndex 페이지 번호
 * @param display 한 페이지에 보여줄 개수
 */
export async function fetchYouthPolicies(pageIndex = 1, display = 30): Promise<ApplicablePolicy[]> {
  const apiKey = process.env.YOUTH_CENTER_API_KEY;
  if (!apiKey) {
    return [];
  }

  // 온통청년 공식 오픈API 엔드포인트
  const url = `https://www.youthcenter.go.kr/opi/youthPlcyList.do?openApiVlak=${apiKey}&display=${display}&pageIndex=${pageIndex}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) return [];
    const xmlText = await response.text();

    // 정규식을 통한 경량 XML 파싱 (youthPolicy 단위)
    const policyBlocks = xmlText.match(/<youthPolicy>([\s\S]*?)<\/youthPolicy>/g) || [];
    const parsedPolicies: ApplicablePolicy[] = [];

    policyBlocks.forEach((block, idx) => {
      const getTag = (tag: string) => {
        const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
        return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
      };

      const title = getTag('polyBizSjnm');
      if (!title) return;

      const org = getTag('cnsgNmor') || getTag('mngtMson') || '온통청년';
      const desc = getTag('polyItcnCn') || getTag('sporCn') || '';
      const target = getTag('ageInfo') || getTag('prcpCn') || '청년 (연령 요건 충족자)';
      const url = getTag('rqutUrla') || 'https://www.youthcenter.go.kr';
      const category = getTag('plcyTpNm') || '청년맞춤지원';

      parsedPolicies.push({
        id: `youthcenter-${idx}`,
        title,
        category,
        org,
        dept: org,
        target,
        description: desc,
        url,
        deadline: null,
        scope: 'youth',
        scopeLabel: '청년 맞춤',
        raw: { block }
      });
    });

    return parsedPolicies;
  } catch (error) {
    // 온통청년 서버 응답 지연/차단 시 graceful degradation
    return [];
  }
}

/**
 * 행정안전부 대한민국 공공서비스(보조금24) 조건별 단일 호출 함수
 */
export async function fetchPublicBenefits(page = 1, perPage = 50, orgFilter = '순천') {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('PUBLIC_DATA_API_KEY is not defined');
  }

  let url = `https://api.odcloud.kr/api/gov24/v3/serviceList?page=${page}&perPage=${perPage}&serviceKey=${apiKey}`;
  if (orgFilter) {
    url += `&cond%5B%EC%86%8C%EA%B4%80%EA%B8%B0%EA%B4%80%EB%AA%85%3A%3ALIKE%5D=${encodeURIComponent(orgFilter)}`;
  }

  try {
    const response = await fetch(url, {
      next: { revalidate: 600 },
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return { data: [] };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Error fetching public benefits:', error);
    return { data: [] };
  }
}

let cachedBenefits: ApplicablePolicy[] | null = null;
let lastBenefitsFetchTime = 0;
const BENEFITS_CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache
let inFlightBenefitsPromise: Promise<ApplicablePolicy[]> | null = null;

/**
 * 순천시민(청년, 일반 시민 포함)이 신청 가능한 모든 정책을 종합 수집하는 통합 함수
 * 1. 순천시 자체 혜택 (소관기관명: 순천)
 * 2. 전남광역 혜택 (소관기관명: 전남광주통합특별시/전라남도)
 * 3. 전국 청년 정책 (서비스명: 청년 키워드)
 * 4. 중앙부처 전국민 지원 혜택 (소관기관유형: 중앙행정기관)
 * 5. 온통청년 API 청년 정책
 */
export async function fetchSuncheonApplicableBenefits(forceRefresh = false): Promise<ApplicablePolicy[]> {
  const now = Date.now();
  if (!forceRefresh && cachedBenefits && now - lastBenefitsFetchTime < BENEFITS_CACHE_TTL_MS) {
    return cachedBenefits;
  }
  if (!forceRefresh && inFlightBenefitsPromise) {
    return inFlightBenefitsPromise;
  }

  const apiKey = process.env.PUBLIC_DATA_API_KEY;
  if (!apiKey) {
    return cachedBenefits || [];
  }

  inFlightBenefitsPromise = (async () => {
    try {

  const fetchParam = async (param: string) => {
    try {
      const url = `https://api.odcloud.kr/api/gov24/v3/serviceList?page=1&perPage=100&serviceKey=${apiKey}&${param}`;
      const res = await fetch(url, {
        next: { revalidate: 600 },
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  };

  // 병렬 수집 (순천시, 전남광역, 청년, 중앙부처, 온통청년)
  const [suncheonItems, jeonnamItems, youthItems, centralItems, youthCenterItems] = await Promise.all([
    fetchParam('cond%5B%EC%86%8C%EA%B4%80%EA%B8%B0%EA%B4%80%EB%AA%85%3A%3ALIKE%5D=' + encodeURIComponent('순천')),
    fetchParam('cond%5B%EC%86%8C%EA%B4%80%EA%B8%B0%EA%B4%80%EB%AA%85%3A%3ALIKE%5D=' + encodeURIComponent('전남광주통합특별시')),
    fetchParam('cond%5B%EC%84%9C%EB%B9%84%EC%8A%A4%EB%AA%85%3A%3ALIKE%5D=' + encodeURIComponent('청년')),
    fetchParam('cond%5B%EC%86%8C%EA%B4%80%EA%B8%B0%EA%B4%80%EC%9C%A0%ED%98%95%3A%3AEQ%5D=' + encodeURIComponent('중앙행정기관')),
    fetchYouthPolicies(1, 30)
  ]);

  // 타 지자체 전용 정책 필터링 및 지역 적격성 검증 (MATCH-01)
  // 순천시민, 전라남도 광역, 검증된 전국민 혜택만 확정 승인하고 불명 항목은 자동 승인하지 않음
  const isEligibleForSuncheon = (org: string, target?: string, desc?: string, title?: string): boolean => {
    const fullText = `${org} ${target || ''} ${desc || ''} ${title || ''}`;

    // 1. 순천 관련(순천시청, 순천의료원, 순천시 등)은 무조건 포함
    if (org.includes('순천') || fullText.includes('순천시') || fullText.includes('순천시민')) {
      return true;
    }

    // 2. 타 시/군/구 (여수, 목포, 북구, 서구, 남구, 동구, 광산구, 나주, 광양 등) 명시된 경우 제외
    const otherDistricts = [
      '여수', '목포', '북구', '서구', '남구', '동구', '광산구', '광산',
      '나주', '광양', '담양', '곡성', '구례', '고흥', '보성', '화순',
      '장흥', '강진', '해남', '영암', '무안', '함평', '영광', '장성',
      '완도', '진도', '신안'
    ];

    const hasOtherDistrict = otherDistricts.some(dist => 
      org.includes(dist) || title?.includes(`${dist}시`) || title?.includes(`${dist}군`) || title?.includes(`${dist}구`)
    );
    if (hasOtherDistrict) {
      return false;
    }

    // 3. 타 광역시/도 제외 (서울, 경기, 부산, 대구, 인천, 대전, 울산, 세종, 강원, 충청, 전북, 경상, 제주 등)
    const otherProvinces = [
      '서울', '부산', '대구', '인천', '대전', '울산', '세종',
      '경기', '경기도', '강원', '강원도', '충북', '충남', '충청',
      '전북', '전라북도', '경북', '경상북도', '경남', '경상남도', '제주'
    ];
    if (otherProvinces.some(prov => org.includes(prov))) {
      return false;
    }

    // 타 지자체 주민 한정 조건 제외
    if (otherDistricts.some(dist => target?.includes(`${dist} 거주`) || target?.includes(`${dist}시민`) || target?.includes(`${dist}구민`))) {
      return false;
    }
    if (otherProvinces.some(prov => target?.includes(`${prov} 거주`) || target?.includes(`${prov}시민`) || target?.includes(`${prov}도민`))) {
      return false;
    }

    // 4. 전라남도 광역 정책: 특정 시군이 붙지 않은 순수 전라남도/전남도청 광역 사업만 포함
    if (org.includes('전남광주통합특별시') || org.includes('전라남도') || org.includes('전남도청') || org.includes('전남')) {
      return true;
    }

    // 5. 중앙부처 및 전국민 정책 근거 검증 (MATCH-01: 불명 항목 자동 승인 금지)
    const centralAgencies = [
      '보건복지부', '고용노동부', '국토교통부', '중소벤처기업부', '여성가족부',
      '행정안전부', '교육부', '과학기술정보통신부', '문화체육관광부', '농림축산식품부',
      '산업통상자원부', '환경부', '해양수산부', '국가보훈부', '국세청', '병무청',
      '국민권익위원회', '금융위원회', '공정거래위원회', '국민건강보험공단', '국민연금공단',
      '근로복지공단', '한국토지주택공사', '서민금융진흥원', '소상공인시장진흥공단'
    ];

    const hasCentralAgency = centralAgencies.some(agency => org.includes(agency));
    const hasNationalKeyword = fullText.includes('전국민') || fullText.includes('전국') || fullText.includes('대한민국 국민') || fullText.includes('중앙행정기관');

    // 명시적인 중앙부처/전국민 근거가 있는 경우에만 전국 적용으로 인정
    if (hasCentralAgency || hasNationalKeyword) {
      return true;
    }

    // 근거가 없는 지역 불명 항목은 순천 적용 대상에서 자동 승인하지 않음
    return false;
  };

  const policyMap = new Map<string, ApplicablePolicy>();

  const processItem = (item: any, defaultScope: 'suncheon' | 'jeonnam' | 'national' | 'youth') => {
    const org = (item.소관기관명 as string) || '';
    const title = (item.서비스명 || item.svcNm || '') as string;
    const target = (item.지원대상 as string) || (item.지원유형 as string) || '';
    const desc = (item.서비스목적요약 as string) || (item.지원내용 as string) || '';

    if (!title) return;

    // 순천시민 및 전라도 전체 대상인지 엄격 필터링
    if (!isEligibleForSuncheon(org, target, desc, title)) {
      return;
    }

    const id = (item.서비스ID as string) || title;
    if (policyMap.has(id)) return;

    let scope = defaultScope;
    let scopeLabel = '전국·중앙정부';

    if (org.includes('순천')) {
      scope = 'suncheon';
      scopeLabel = '순천시';
    } else if (title.includes('청년') || defaultScope === 'youth') {
      scope = 'youth';
      scopeLabel = '청년 맞춤';
    } else if (org.includes('전남광주통합특별시') || org.includes('전라남도')) {
      scope = 'jeonnam';
      scopeLabel = '전남광역';
    }

    // 긴 소관기관명을 읽기 쉽게 정제하여 글자 잘림 방지
    let cleanOrg = org || '대한민국 정부';
    if (org.includes('순천')) {
      cleanOrg = '순천시';
    } else if (org.includes('전남광주통합특별시') || org.includes('전라남도') || org.includes('전남')) {
      cleanOrg = '전라남도';
    }

    policyMap.set(id, {
      id: `gov24-${id}`,
      title,
      category: (item.서비스분야 as string) || (scope === 'youth' ? '청년지원' : '공공복지'),
      org: cleanOrg,
      dept: (item.부서명 as string) || (item.소관기관명 as string) || cleanOrg,
      target: target || '요건 충족 순천시민/국민',
      description: desc,
      url: (item.상세조회URL as string) || '#',
      deadline: (item.신청기한 as string) || null,
      scope,
      scopeLabel,
      raw: item
    });
  };

  // 우선순위 순서대로 추가 (순천시 > 청년정책 > 전남광역 > 중앙정부)
  suncheonItems.forEach((item: any) => processItem(item, 'suncheon'));
  youthItems.forEach((item: any) => processItem(item, 'youth'));
  jeonnamItems.forEach((item: any) => processItem(item, 'jeonnam'));
  centralItems.forEach((item: any) => processItem(item, 'national'));

  // 온통청년 결과 합산 (순천 청년 신청 가능 여부 확인)
  youthCenterItems.forEach(item => {
    if (isEligibleForSuncheon(item.org, item.target, item.description, item.title)) {
      if (!policyMap.has(item.id)) {
        policyMap.set(item.id, item);
      }
    }
  });

    const result = Array.from(policyMap.values());
    cachedBenefits = result;
    lastBenefitsFetchTime = now;
    return result;
  } finally {
    inFlightBenefitsPromise = null;
  }
})();

  return inFlightBenefitsPromise;
}
