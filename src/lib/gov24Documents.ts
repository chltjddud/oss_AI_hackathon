// src/lib/gov24Documents.ts
// Utility to resolve required benefit documents to official Government 24 (정부24) and public issuance portals

export interface GovDocumentInfo {
  name: string;
  source: string; // '정부24' | '대법원 전자가족관계' | '국민건강보험' | '국세청 홈택스' | '모바일 신분증'
  url: string;
  badge?: string;
  isOnlineAvailable: boolean;
}

export function resolveGovDocument(docName: string): GovDocumentInfo {
  const clean = docName.trim();
  const lower = clean.toLowerCase();

  // 1. 주민등록등본 / 주민등록초본
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
      url: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050333',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 2. 가족관계증명서 / 기본증명서 / 혼인관계증명서
  if (
    lower.includes('가족관계') ||
    lower.includes('혼인관계') ||
    lower.includes('기본증명서') ||
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

  // 3. 소득금액증명원 / 원천징수영수증 / 소득 증빙
  if (
    lower.includes('소득금액') ||
    lower.includes('소득증명') ||
    lower.includes('소득 증빙') ||
    lower.includes('원천징수') ||
    lower.includes('소득 및 재산')
  ) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050328',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 4. 건강보험료 납부확인서 / 건강보험 자격득실확인서
  if (
    lower.includes('건강보험') ||
    lower.includes('자격득실') ||
    lower.includes('납부확인서') ||
    lower.includes('보험료 납부')
  ) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/146000000014',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 5. 지방세 납세증명서 / 세금 완납증명
  if (lower.includes('지방세') || lower.includes('납세증명') || lower.includes('완납증명')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050319',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 6. 사업자등록증명 / 휴폐업사실증명
  if (lower.includes('사업자등록') || lower.includes('휴폐업')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050329',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 7. 신분증 사본 / 모바일 신분증
  if (lower.includes('신분증') || lower.includes('주민등록증') || lower.includes('운전면허')) {
    return {
      name: clean,
      source: '모바일 신분증',
      url: 'https://www.mobileid.go.kr',
      badge: '전자증명서/실물',
      isOnlineAvailable: true
    };
  }

  // 8. 전입세대확인서 / 임대차계약 확정일자
  if (lower.includes('임대차') || lower.includes('확정일자') || lower.includes('전입세대')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/131100000042',
      badge: '정부24 신청',
      isOnlineAvailable: true
    };
  }

  // 9. 사고사실확인원 (교통사고/사고사실확인)
  if (lower.includes('사고사실') || lower.includes('교통사고')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/132000000030',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 10. 국민기초생활수급자 증명서
  if (lower.includes('수급자') || lower.includes('기초생활')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050338',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 11. 차상위계층 확인서
  if (lower.includes('차상위')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050339',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 12. 장애인 증명서
  if (lower.includes('장애인') && (lower.includes('증명') || lower.includes('확인'))) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050337',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 13. 재학증명서 / 졸업증명서
  if (lower.includes('재학') || lower.includes('졸업증명') || lower.includes('학적')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/134200000015',
      badge: '정부24 발급',
      isOnlineAvailable: true
    };
  }

  // 14. 병적증명서
  if (lower.includes('병적') || lower.includes('군복무')) {
    return {
      name: clean,
      source: '정부24',
      url: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050332',
      badge: '무료 즉시발급',
      isOnlineAvailable: true
    };
  }

  // 15. 통장 사본 / 계좌개설확인서
  if (lower.includes('통장') || lower.includes('계좌')) {
    return {
      name: clean,
      source: '은행 앱/포털',
      url: 'https://www.gov.kr/search/applySub?searchTxt=%EA%B3%84%EC%A2%8C%EA%B0%9C%EC%84%A4%ED%99%95%EC%9D%B8%EC%84%9C',
      badge: '온라인 출력가능',
      isOnlineAvailable: true
    };
  }

  // 16. 기타 서류: 정부24 공식 민원 신청 검색 연동
  const searchKeyword = clean
    .replace(/사본|등본|초본|확인서|증명원|증명서|제출|서류|신청서|사본|필수/g, '')
    .trim() || clean;

  return {
    name: clean,
    source: '정부24',
    url: `https://www.gov.kr/search/applySub?searchTxt=${encodeURIComponent(searchKeyword || clean)}`,
    badge: '정부24 검색',
    isOnlineAvailable: true
  };
}
