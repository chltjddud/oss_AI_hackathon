// src/lib/api.ts

/**
 * 온통청년 API 호출 함수
 * @param pageIndex 페이지 번호
 * @param display 한 페이지에 보여줄 개수
 */
export async function fetchYouthPolicies(pageIndex = 1, display = 10) {
  const apiKey = process.env.YOUTH_CENTER_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTH_CENTER_API_KEY is not defined');
  }

  // 온통청년 API 엔드포인트
  const url = `https://www.youthcenter.go.kr/opi/empList.do?openApiVlak=${apiKey}&display=${display}&pageIndex=${pageIndex}`;
  
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to fetch youth policies');
    }
    const data = await response.text();
    // 온통청년 API는 기본적으로 XML을 반환하므로 추후 XML -> JSON 파싱 로직 추가 필요
    return data;
  } catch (error) {
    console.log('Error fetching youth policies:', error);
    return null;
  }
}

/**
 * 행정안전부_대한민국 공공서비스(혜택) 정보 호출 함수 (보조금24)
 * @param page 페이지 번호
 * @param perPage 한 페이지에 보여줄 개수
 */
export async function fetchPublicBenefits(page = 1, perPage = 10) {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('PUBLIC_DATA_API_KEY is not defined');
  }

  // 행정안전부 대한민국 공공서비스(보조금24) v3 엔드포인트
  const url = `https://api.odcloud.kr/api/gov24/v3/serviceList?page=${page}&perPage=${perPage}&serviceKey=${apiKey}`;

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`API Error (${response.status}):`, errorText);
      // 에러를 던지지 않고 안전하게 빈 데이터를 반환하여 화면이 깨지지 않도록 함
      return { data: [] };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Error fetching public benefits:', error);
    return { data: [] };
  }
}
