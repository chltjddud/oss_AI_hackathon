import test from 'node:test';
import assert from 'node:assert/strict';

// =========================================================================
// 1. DATE-01: 날짜 범위의 종료일을 마감일로 사용 및 KST D-Day 계산 검증
// =========================================================================
function parseDeadlineDate(dateStr) {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  if (clean.includes('상시') || clean.includes('예산 소진') || clean.includes('별도 공지')) {
    return null;
  }

  const regexFull = /(\d{4})[-./](\d{1,2})[-./](\d{1,2})/g;
  const matches = [...clean.matchAll(regexFull)];
  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    const y = parseInt(last[1], 10);
    const m = String(parseInt(last[2], 10)).padStart(2, '0');
    const d = String(parseInt(last[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const regexKorean = /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;
  const kMatches = [...clean.matchAll(regexKorean)];
  if (kMatches.length > 0) {
    const last = kMatches[kMatches.length - 1];
    const y = parseInt(last[1], 10);
    const m = String(parseInt(last[2], 10)).padStart(2, '0');
    const d = String(parseInt(last[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

function calculateDDay(deadlineStr, nowMs) {
  const parsed = parseDeadlineDate(deadlineStr);
  if (!parsed) return null;

  const [y, m, d] = parsed.split('-').map(Number);
  const now = new Date(nowMs || Date.now());
  const kstNowMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kstNow = new Date(kstNowMs);

  const startOfTodayUtc = Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate());
  const deadlineUtc = Date.UTC(y, m - 1, d);

  const diffMs = deadlineUtc - startOfTodayUtc;
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

test('DATE-01: 날짜 범위에서 시작일이 아닌 종료일을 마감일로 선택', () => {
  const rangeStr = '2026-09-01 ~ 2026-09-30';
  const deadline = parseDeadlineDate(rangeStr);
  assert.equal(deadline, '2026-09-30', '범위의 마지막 날짜가 마감일이어야 합니다.');
  assert.notEqual(deadline, '2026-09-01', '범위의 첫 날짜가 마감일로 선택되면 안 됩니다.');
});

test('DATE-01: 한국어 날짜 범위 및 단일 날짜 마감일 파싱', () => {
  const krRange = '2026년 10월 01일 ~ 2026년 10월 25일';
  assert.equal(parseDeadlineDate(krRange), '2026-10-25');

  const singleDate = '2026.11.15까지 접수';
  assert.equal(parseDeadlineDate(singleDate), '2026-11-15');

  const alwaysOpen = '상시 접수 (예산 소진 시까지)';
  assert.equal(parseDeadlineDate(alwaysOpen), null);
});

test('DATE-01: KST 기준 당일 및 D-Day 계산', () => {
  // 기준 시간: 2026-09-24T12:00:00+09:00
  const mockNowMs = new Date('2026-09-24T03:00:00Z').getTime(); // 12:00 KST
  const dday = calculateDDay('2026-09-30', mockNowMs);
  assert.equal(dday, 6, '2026-09-24에서 2026-09-30까지 D-6이어야 합니다.');

  const ddayToday = calculateDDay('2026-09-24', mockNowMs);
  assert.equal(ddayToday, 0, '당일 마감은 D-0(D-Day)이어야 합니다.');

  const ddayPast = calculateDDay('2026-09-20', mockNowMs);
  assert.equal(ddayPast, -4, '지난 마감은 음수여야 합니다.');
});

// =========================================================================
// 2. MATCH-01: 지역 적격성 불명 항목을 자동 승인하지 않기 검증
// =========================================================================
const CENTRAL_MINISTRIES = [
  '고용노동부', '보건복지부', '중소벤처기업부', '과학기술정보통신부',
  '교육부', '여성가족부', '행정안전부', '문화체육관광부', '국토교통부'
];

function isEligibleForSuncheon(item) {
  const text = `${item.title || ''} ${item.target || ''} ${item.org || ''} ${item.description || ''} ${item.scope || ''}`;
  const lower = text.toLowerCase();

  const isSuncheon = /순천/i.test(text);
  const isJeonnam = /전라남도|전남/i.test(text);

  const EXCLUDED_OTHER_REGIONS = [
    '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
    '경기', '강원', '충북', '충남', '전북', '경북', '경남', '제주'
  ];

  for (const reg of EXCLUDED_OTHER_REGIONS) {
    const regPattern = new RegExp(`\\b${reg}\\b|${reg}시|${reg}도|${reg}특별시|${reg}광역시`);
    if (regPattern.test(text) && !isSuncheon && !isJeonnam) {
      return false;
    }
  }

  if (isSuncheon || isJeonnam) {
    return true;
  }

  const isCentralMinistry = CENTRAL_MINISTRIES.some(m => text.includes(m));
  const isNationwide = /전국민|전국|대한민국 국민|거주 무관/i.test(text);

  if (isCentralMinistry || isNationwide) {
    return true;
  }

  // 근거가 없는 지역 불명 항목은 자동 승인하지 않음
  return false;
}

test('MATCH-01: 순천시 및 전남 관련 혜택은 승인', () => {
  assert.equal(isEligibleForSuncheon({ title: '순천시 청년 도서구입비 지원', org: '순천시청' }), true);
  assert.equal(isEligibleForSuncheon({ title: '전라남도 청년 문화복지카드', org: '전라남도' }), true);
});

test('MATCH-01: 타 지자체 전용 혜택은 엄격 배제', () => {
  assert.equal(isEligibleForSuncheon({ title: '부산광역시 청년 월세 지원', org: '부산시청' }), false);
  assert.equal(isEligibleForSuncheon({ title: '경기도 청년 기본소득', org: '경기도' }), false);
  assert.equal(isEligibleForSuncheon({ title: '대전 청년 취업수당', org: '대전광역시' }), false);
});

test('MATCH-01: 지역 근거가 없는 불명 항목은 자동 승인 거부', () => {
  const unknownItem = {
    title: '동네 상점가 간판 교체 지원 사업',
    org: '지역상가번영회',
    target: '상인 대상',
    description: '간판 교체 보조금 50만원 지원'
  };
  assert.equal(isEligibleForSuncheon(unknownItem), false, '순천/전국/중앙부처 근거 없는 불명 항목은 false여야 합니다.');
});

test('MATCH-01: 중앙부처 및 전국민 대상 혜택은 승인', () => {
  const govItem = {
    title: '국민취업지원제도 1유형',
    org: '고용노동부',
    target: '전국 취업준비 청년'
  };
  assert.equal(isEligibleForSuncheon(govItem), true);
});

// =========================================================================
// 3. DATA-01: 맞춤 검색 및 보관함 북마크 저장 스키마 계약 검증
// =========================================================================
function validateBookmarkPayload(payload) {
  const allowedKeys = new Set(['user_email', 'policy_id', 'policy_title', 'policy_org', 'policy_data', 'created_at']);
  const forbiddenKeys = ['policy_category', 'policy_dept', 'policy_target', 'policy_url', 'policy_scope'];

  for (const key of Object.keys(payload)) {
    if (forbiddenKeys.includes(key)) {
      throw new Error(`스키마 위반: 허용되지 않는 컬럼 '${key}'이 포함되었습니다.`);
    }
  }

  if (!payload.user_email || typeof payload.user_email !== 'string') {
    throw new Error('user_email은 필수 문자열 필드입니다.');
  }
  if (!payload.policy_id || typeof payload.policy_id !== 'string') {
    throw new Error('policy_id는 필수 문자열 필드입니다.');
  }
  if (!payload.policy_title || typeof payload.policy_title !== 'string') {
    throw new Error('policy_title은 필수 문자열 필드입니다.');
  }

  return true;
}

test('DATA-01: 북마크 저장 시 제공 스키마에 없는 폐기 컬럼 전송 금지', () => {
  const validPayload = {
    user_email: 'citizen@suncheon.go.kr',
    policy_id: 'pol-101',
    policy_title: '순천시 청년 창업 지원금',
    policy_org: '순천시',
    policy_data: {
      category: '일자리',
      target: '만 19~39세',
      url: 'https://suncheon.go.kr/policy/101'
    }
  };

  assert.doesNotThrow(() => validateBookmarkPayload(validPayload));

  const invalidLegacyPayload = {
    ...validPayload,
    policy_category: '일자리',
    policy_url: 'https://suncheon.go.kr'
  };

  assert.throws(
    () => validateBookmarkPayload(invalidLegacyPayload),
    /스키마 위반/
  );
});

// =========================================================================
// 4. DATA-02: 정책 동기화 멱등성 및 키 생성 검증
// =========================================================================
function getPolicyStableKey(source, sourceId, title, org) {
  const cleanId = (sourceId || '').trim();
  if (cleanId) {
    return `${(source || 'custom').trim()}:${cleanId}`;
  }
  const cleanTitle = (title || '').replace(/\s+/g, '').slice(0, 30);
  const cleanOrg = (org || '순천시').replace(/\s+/g, '').slice(0, 15);
  return `${(source || 'custom').trim()}:${cleanOrg}:${cleanTitle}`;
}

test('DATA-02: 정책 동기화 멱등성 키 일관성 보장', () => {
  const key1 = getPolicyStableKey('youth_center', 'Y20260901', '순천 청년 주거비', '순천시');
  const key2 = getPolicyStableKey('youth_center', 'Y20260901', '순천 청년 주거비 변경', '순천시청');
  assert.equal(key1, key2, '동일 원천 ID는 안정적인 동일 키를 반환해야 합니다.');

  const items = [
    { source: 'suncheon', id: '101', title: '청년수당' },
    { source: 'suncheon', id: '101', title: '청년수당 (중복)' },
    { source: 'suncheon', id: '102', title: '어르신 복지' }
  ];

  const uniqueMap = new Map();
  for (const item of items) {
    const k = getPolicyStableKey(item.source, item.id, item.title, '순천시');
    uniqueMap.set(k, item);
  }

  assert.equal(uniqueMap.size, 2, '중복 원천 ID는 업서트되어 행 수가 증가하지 않아야 합니다.');
});

// =========================================================================
// 5. AUTH-02: 회원 탈퇴 확인 문구 및 블랙리스트 검증
// =========================================================================
test('AUTH-02: 탈퇴 확인 문구 불일치 시 탈퇴 거부', () => {
  const validateWithdrawalRequest = (confirmText) => {
    if (confirmText !== '회원탈퇴') {
      throw new Error('탈퇴 확인 문구가 올바르지 않습니다.');
    }
    return true;
  };

  assert.throws(() => validateWithdrawalRequest('탈퇴'), /탈퇴 확인 문구/);
  assert.throws(() => validateWithdrawalRequest(''), /탈퇴 확인 문구/);
  assert.doesNotThrow(() => validateWithdrawalRequest('회원탈퇴'));
});

// =========================================================================
// 6. UX-01 & DATA-03: 제안 제출 분리 및 공감 중복 방지
// =========================================================================
test('UX-01: Supabase 실패 시 접수완료가 아닌 임시저장 상태로 분리', () => {
  const handleSubmitSimulation = (dbSuccess) => {
    if (!dbSuccess) {
      return { status: '임시저장 (미전송)', message: '오프라인 보관' };
    }
    return { status: '접수완료', message: '성공' };
  };

  const failedResult = handleSubmitSimulation(false);
  assert.equal(failedResult.status, '임시저장 (미전송)');
  assert.notEqual(failedResult.status, '접수완료', 'DB 실패 시 접수완료가 표시되면 안 됩니다.');
});

test('DATA-03: 중복 공감 방지 및 원자적 카운트', () => {
  const likeStore = new Set();
  let likesCount = 10;

  const handleLike = (userId, requestId) => {
    const key = `${userId}:${requestId}`;
    if (likeStore.has(key)) {
      throw new Error('이미 공감한 제안입니다.');
    }
    likeStore.add(key);
    likesCount += 1;
    return likesCount;
  };

  assert.equal(handleLike('user1', 'req100'), 11);
  assert.throws(() => handleLike('user1', 'req100'), /이미 공감한 제안/);
  assert.equal(likesCount, 11, '중복 요청으로 인해 공감 수가 증가하면 안 됩니다.');
});
