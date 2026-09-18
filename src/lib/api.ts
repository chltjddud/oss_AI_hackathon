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

/**
 * 순천시민(청년, 일반 시민 포함)이 신청 가능한 모든 정책을 종합 수집하는 통합 함수
 * 1. 순천시 자체 혜택 (소관기관명: 순천)
 * 2. 전남광역 혜택 (소관기관명: 전남광주통합특별시/전라남도)
 * 3. 전국 청년 정책 (서비스명: 청년 키워드)
 * 4. 중앙부처 전국민 지원 혜택 (소관기관유형: 중앙행정기관)
 * 5. 온통청년 API 청년 정책
 */
export async function fetchSuncheonApplicableBenefits(): Promise<ApplicablePolicy[]> {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;
  if (!apiKey) {
    return [];
  }

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

  // 타 지자체 전용 정책 필터링 목록 (순천시민은 대상이 아닌 개별 시/군/구 전용 혜택 제외)
  const nonSuncheonDistricts = [
    '목포시', '여수시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군',
    '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군',
    '영광군', '장성군', '완도군', '진도군', '신안군', '동구', '서구', '남구', '북구', '광산구'
  ];

  const policyMap = new Map<string, ApplicablePolicy>();

  const processItem = (item: any, defaultScope: 'suncheon' | 'jeonnam' | 'national' | 'youth') => {
    const org = (item.소관기관명 as string) || '';
    const title = (item.서비스명 || item.svcNm || '') as string;
    if (!title) return;

    // 타 지자체 전용 필터링 (순천 포함 시 제외하지 않음)
    const isOtherDistrict = nonSuncheonDistricts.some(
      dist => org.includes(dist) && !org.includes('순천')
    );
    if (isOtherDistrict) return;

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

    const cleanOrg = org.includes('순천')
      ? '순천시'
      : (org || '대한민국 정부');

    policyMap.set(id, {
      id: `gov24-${id}`,
      title,
      category: (item.서비스분야 as string) || (scope === 'youth' ? '청년지원' : '공공복지'),
      org: cleanOrg,
      dept: (item.부서명 as string) || (item.소관기관명 as string) || cleanOrg,
      target: (item.지원대상 as string) || (item.지원유형 as string) || '요건 충족 순천시민/국민',
      description: (item.서비스목적요약 as string) || (item.지원내용 as string) || '',
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

  // 온통청년 결과 합산
  youthCenterItems.forEach(item => {
    if (!policyMap.has(item.id)) {
      policyMap.set(item.id, item);
    }
  });

  return Array.from(policyMap.values());
}
