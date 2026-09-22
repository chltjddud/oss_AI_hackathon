// src/lib/gov24Documents.ts
// 대한민국 행정안전부 정부24 및 대법원, 국세청, 국민건강보험공단 등 실제 공식 민원 발급 포털 연동 유틸리티

export interface GovDocumentInfo {
  name: string;
  source: string;
  url: string;
  badge?: string;
  isOnlineAvailable: boolean;
}

/**
 * 복지 정책 및 공고에서 요구하는 구비서류명을 분석하여 실제 공식 발급 및 신청 웹사이트로 100% 매핑
 */
export function resolveGovDocument(docName: string): GovDocumentInfo {
  const clean = docName.trim();
  const lower = clean.toLowerCase();

  // 0. 민원인 제출 구비서류 해당없음 (온라인 신청 시 자동 확인/선지원)
  if (
    lower.includes('해당없음') ||
    lower.includes('별도 제출') ||
    lower.includes('서류 불필요') ||
    lower.includes('서류 없음')
  ) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr',
      badge: '서류 제출 불필요',
      isOnlineAvailable: true
    };
  }

  // 1. 주민등록등본 / 주민등록초본 (정부24 공식 발급 서비스)
  if (
    lower.includes('주민등록등본') ||
    lower.includes('주민등록표등본') ||
    lower.includes('주민등록초본') ||
    lower.includes('등본') ||
    lower.includes('초본')
  ) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000015',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 2. 가족관계증명서 / 혼인관계증명서 / 기본증명서 (대법원 전자가족관계등록시스템)
  if (
    lower.includes('가족관계') ||
    lower.includes('혼인관계') ||
    lower.includes('기본증명서') ||
    lower.includes('혼인증명') ||
    lower.includes('가족관계증명')
  ) {
    return {
      name: clean,
      source: '대법원 전자가족관계',
      url: 'https://efamily.scourt.go.kr',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 3. 소득금액증명원 / 원천징수영수증 / 소득 증빙 (정부24 소득금액증명 발급)
  if (
    lower.includes('소득금액') ||
    lower.includes('소득증명') ||
    lower.includes('소득 증빙') ||
    lower.includes('원천징수') ||
    lower.includes('소득 및 재산') ||
    lower.includes('소득확인')
  ) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12100000021',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 4. 건강보험 자격득실확인서 (정부24 / 국민건강보험공단)
  if (
    lower.includes('자격득실') ||
    (lower.includes('건강보험') && lower.includes('자격'))
  ) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050333',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 5. 건강보험료 납부확인서 (국민건강보험공단 통합민원 포털)
  if (
    lower.includes('건강보험료') ||
    lower.includes('보험료 납부') ||
    lower.includes('납부확인서')
  ) {
    return {
      name: clean,
      source: '국민건강보험공단',
      url: 'https://www.nhis.or.kr',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 6. 국세 완납증명서 / 납세증명서 (정부24 국세 납부내역증명)
  if (
    (lower.includes('국세') && lower.includes('납세')) ||
    lower.includes('국세완납') ||
    lower.includes('세금완납')
  ) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12100000018',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 7. 지방세 납세증명서 / 세목별 과세증명 (위택스 WeTax)
  if (
    lower.includes('지방세') ||
    lower.includes('세목별') ||
    lower.includes('과세증명')
  ) {
    return {
      name: clean,
      source: '위택스(WeTax)',
      url: 'https://www.wetax.go.kr/main/',
      badge: '온라인 무료발급',
      isOnlineAvailable: true
    };
  }

  // 8. 사업자등록증명 / 휴폐업사실증명 (정부24 사업자등록증명)
  if (lower.includes('사업자등록') || lower.includes('휴폐업')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12100000016',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 9. 신분증 (주민등록증 / 운전면허증 / 모바일 신분증)
  if (lower.includes('신분증') || lower.includes('주민등록증') || lower.includes('운전면허')) {
    return {
      name: clean,
      source: '모바일 신분증',
      url: 'https://www.mobileid.go.kr',
      badge: '정부 공식 발급',
      isOnlineAvailable: true
    };
  }

  // 10. 통장 사본 / 계좌 개설 확인서 (금융결제원 어카운트인포)
  if (lower.includes('통장') || lower.includes('계좌')) {
    return {
      name: clean,
      source: '어카운트인포',
      url: 'https://www.payinfo.or.kr',
      badge: '전 은행 통합조회',
      isOnlineAvailable: true
    };
  }

  // 11. 임대차계약서 확정일자 / 부동산 등기사항증명서 (대법원 인터넷등기소)
  if (lower.includes('임대차') || lower.includes('확정일자') || lower.includes('등기부')) {
    return {
      name: clean,
      source: '대법원 인터넷등기소',
      url: 'http://www.iros.go.kr',
      badge: '온라인 열람·신청',
      isOnlineAvailable: true
    };
  }

  // 12. 병적증명서 (군 복무 증명)
  if (lower.includes('병적') || lower.includes('군복무')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13000000016',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 13. 전입신고 / 전입세대확인서
  if (lower.includes('전입')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000016',
      badge: '정부24 온라인신청',
      isOnlineAvailable: true
    };
  }

  // 14. 국민기초생활수급자 증명서 / 차상위계층 확인서 / 복지 수급 (보건복지부 복지로)
  if (lower.includes('수급자') || lower.includes('기초생활') || lower.includes('차상위')) {
    return {
      name: clean,
      source: '복지로',
      url: 'https://www.bokjiro.go.kr',
      badge: '복지로 온라인발급',
      isOnlineAvailable: true
    };
  }

  // 15. 장애인 증명서 / 등록확인
  if (lower.includes('장애인')) {
    return {
      name: clean,
      source: '복지로',
      url: 'https://www.bokjiro.go.kr',
      badge: '복지로 온라인발급',
      isOnlineAvailable: true
    };
  }

  // 16. 인감증명서 안내
  if (lower.includes('인감')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000025',
      badge: '정부24 안내',
      isOnlineAvailable: true
    };
  }

  // 17. 토지대장 / 건축물대장
  if (lower.includes('토지대장') || lower.includes('건축물대장')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000026',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 18. 기타 공공 민원 및 행정 서류 (정부24 통합 민원 검색 포털)
  return {
    name: clean,
    source: '정부24',
    url: 'https://plus.gov.kr/minwon/',
    badge: '정부24 민원신청',
    isOnlineAvailable: true
  };
}
