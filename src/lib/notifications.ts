// Notification engine and local storage manager for Suncheon benefits portal

export type NotificationType = 'deadline' | 'keyword' | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  targetUrl: string;
  tag: string; // e.g., 'D-DAY', 'D-1', 'D-3', '신규공고', '청년'
  createdAt: string; // ISO timestamp
  isRead: boolean;
  dDay?: number;
  org?: string;
}

export const DEFAULT_KEYWORDS = ['청년', '주거', '일자리'];
export const PRESET_KEYWORDS = [
  '청년',
  '주거',
  '월세',
  '일자리',
  '취업',
  '창업',
  '소상공인',
  '신혼부부',
  '임산부',
  '출산',
  '육아',
  '보육',
  '아동',
  '청소년',
  '장학금',
  '중장년',
  '어르신',
  '노인',
  '장애인',
  '1인가구',
  '다자녀',
  '다문화',
  '교통비',
  '문화'
];

const STORAGE_KEY_NOTIFICATIONS = 'suncheon_notifications';
const STORAGE_KEY_KEYWORDS = 'suncheon_interest_keywords';

// Parse date string into Date object (always selecting the end date for ranges)
export function parseDeadlineDate(rawDate?: string | null): Date | null {
  if (!rawDate) return null;
  const str = rawDate.trim();
  if (!str) return null;

  const foundDates: Date[] = [];

  // Match all YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD
  const regexFull = /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/g;
  let match: RegExpExecArray | null;
  while ((match = regexFull.exec(str)) !== null) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      foundDates.push(new Date(Date.UTC(year, month, day, 14, 59, 59))); // End of day in KST (UTC 14:59:59 = KST 23:59:59)
    }
  }

  // Match all YYYY년 M월 D일
  const regexKorean = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g;
  while ((match = regexKorean.exec(str)) !== null) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      foundDates.push(new Date(Date.UTC(year, month, day, 14, 59, 59)));
    }
  }

  // Return the last date in the string (the end date / deadline of the range)
  if (foundDates.length > 0) {
    return foundDates[foundDates.length - 1];
  }

  return null;
}

// Calculate D-Day in KST timezone: returns number of days remaining (0 = today, negative = past)
export function calculateDDay(targetDate: Date): number {
  const now = new Date();
  // Calculate relative to KST (UTC+9)
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayUtc = Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate());

  const kstTarget = new Date(targetDate.getTime() + 9 * 60 * 60 * 1000);
  const targetUtc = Date.UTC(kstTarget.getUTCFullYear(), kstTarget.getUTCMonth(), kstTarget.getUTCDate());

  const diffMs = targetUtc - todayUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getUserStorageKey(baseKey: string, userEmail?: string): string {
  if (userEmail) return `${baseKey}_${userEmail.trim().toLowerCase()}`;
  if (typeof window !== 'undefined') {
    const authStr = localStorage.getItem('suncheon_auth_session') || localStorage.getItem('suncheon_guest_user');
    if (authStr) {
      try {
        const u = JSON.parse(authStr);
        if (u.email) return `${baseKey}_${u.email.trim().toLowerCase()}`;
      } catch {}
    }
  }
  return baseKey;
}

// Get interest keywords
export function getInterestKeywords(userEmail?: string): string[] {
  if (typeof window === 'undefined') return DEFAULT_KEYWORDS;
  try {
    const key = getUserStorageKey(STORAGE_KEY_KEYWORDS, userEmail);
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // Check if active user profile has interests
    const authStr = localStorage.getItem('suncheon_auth_session');
    if (authStr) {
      const u = JSON.parse(authStr);
      if (Array.isArray(u.interests) && u.interests.length > 0) {
        return u.interests;
      }
    }
  } catch (err) {
    console.error('Failed to load interest keywords:', err);
  }
  return DEFAULT_KEYWORDS;
}

// Save interest keywords
export function saveInterestKeywords(keywords: string[], userEmail?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getUserStorageKey(STORAGE_KEY_KEYWORDS, userEmail);
    localStorage.setItem(key, JSON.stringify(keywords));
  } catch (err) {
    console.error('Failed to save interest keywords:', err);
  }
}

// Get stored notifications
export function getStoredNotifications(userEmail?: string): NotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getUserStorageKey(STORAGE_KEY_NOTIFICATIONS, userEmail);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
  return [];
}

// Save stored notifications
export function saveStoredNotifications(items: NotificationItem[], userEmail?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getUserStorageKey(STORAGE_KEY_NOTIFICATIONS, userEmail);
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save notifications:', err);
  }
}

// Mark single notification as read
export function markNotificationAsRead(id: string, userEmail?: string): NotificationItem[] {
  const current = getStoredNotifications(userEmail);
  const updated = current.map(item => item.id === id ? { ...item, isRead: true } : item);
  saveStoredNotifications(updated, userEmail);
  return updated;
}

// Mark all as read
export function markAllNotificationsAsRead(userEmail?: string): NotificationItem[] {
  const current = getStoredNotifications(userEmail);
  const updated = current.map(item => ({ ...item, isRead: true }));
  saveStoredNotifications(updated, userEmail);
  return updated;
}

// Delete single notification
export function deleteStoredNotification(id: string, userEmail?: string): NotificationItem[] {
  const current = getStoredNotifications(userEmail);
  const updated = current.filter(item => item.id !== id);
  saveStoredNotifications(updated, userEmail);
  return updated;
}

// Clear all notifications
export function clearAllStoredNotifications(userEmail?: string): void {
  saveStoredNotifications([], userEmail);
}

export const KEYWORD_SYNONYMS: Record<string, string[]> = {
  '청년': ['청년', '청춘', '대학생', '청년인턴', '청년센터'],
  '주거': ['주거', '주택', '월세', '전세', '임대', '보금자리', '행복주택', '주거안정'],
  '월세': ['월세', '주거비', '임차료', '월차임'],
  '일자리': ['일자리', '취업', '채용', '구직', '고용', '인턴', '근로'],
  '취업': ['취업', '구직', '면접', '자격증', '취업준비', '일자리'],
  '창업': ['창업', '스타트업', '기업가', '창업자', '사업화', '창업연당'],
  '소상공인': ['소상공인', '자영업', '소상공', '골목상권', '경영개선', '특례보증'],
  '신혼부부': ['신혼부부', '신혼', '결혼', '예비부부'],
  '임산부': ['임산부', '임신', '산모', '모자보건', '태아', '출산'],
  '출산': ['출산', '출생', '출산장려금', '신생아', '산후조리'],
  '육아': ['육아', '양육', '아동수당', '부모급여', '아이돌봄', '어린이집'],
  '보육': ['보육', '어린이집', '유치원', '돌봄', '가정양육'],
  '아동': ['아동', '어린이', '유아', '영유아', '아동복지'],
  '청소년': ['청소년', '중고등', '학생', '청소년수당', '방과후'],
  '장학금': ['장학', '장학금', '학자금', '장학생', '교육비'],
  '중장년': ['중장년', '신중년', '5060', '인생이모작', '재취업'],
  '어르신': ['어르신', '노인', '경로', '기초연금', '노인복지', '노령'],
  '노인': ['노인', '어르신', '경로', '기초연금', '노인복지', '장기요양'],
  '장애인': ['장애인', '장애', '발달장애', '장애수당', '재활'],
  '1인가구': ['1인가구', '일인가구', '독거', '혼자', '1인 가구'],
  '다자녀': ['다자녀', '셋째', '다둥이', '다자녀가구'],
  '보훈': ['보훈', '국가유공자', '참전', '유공자'],
  '문화예술': ['문화', '예술', '공연', '전시', '문화재단', '문화누리'],
  '농업인': ['농업', '농민', '농가', '농업인', '영농', '농촌'],
  '귀농귀촌': ['귀농', '귀촌', '전입', '귀농인'],
  '소득지원': ['소득지원', '생계', '기초생활', '차상위', '긴급복지', '생계급여']
};

export interface SyncCandidatePolicy {
  id: string;
  title: string;
  org?: string;
  dept?: string;
  deadline?: string | null;
  url?: string;
  description?: string;
  target?: string;
  category?: string;
  reason?: string;
  date?: string;
}

export interface SyncCandidateNotice {
  id: string;
  title: string;
  source?: string;
  dept?: string;
  date?: string;
  link?: string;
  reason?: string;
}

/**
 * Main Notification Evaluation Engine
 * Evaluates:
 * 1. Saved bookmarks for approaching deadlines (D-Day, D-1, D-3, D-7)
 * 2. Active interest keywords against policies and notices with synonym expansion
 */
export function syncNotifications(
  allPolicies: SyncCandidatePolicy[],
  allNotices: SyncCandidateNotice[],
  savedIds: string[],
  keywords: string[],
  userEmail?: string
): NotificationItem[] {
  const existing = getStoredNotifications(userEmail);
  const todayStr = new Date().toISOString().split('T')[0];

  const activeKeywords = keywords.filter(k => k.trim().length >= 2);
  const activeKeywordSet = new Set(activeKeywords.map(k => k.trim().toLowerCase()));

  // 1. Prune existing keyword notifications if their keyword tag is no longer active
  const validExisting = existing.filter(item => {
    if (item.type !== 'keyword') return true;
    return activeKeywordSet.has((item.tag || '').trim().toLowerCase());
  });
  const validExistingMap = new Map<string, NotificationItem>(validExisting.map(n => [n.id, n]));

  const newItems: NotificationItem[] = [];

  // ----------------------------------------------------
  // 1. D-Day Deadline Notifications for Saved Bookmarks
  // ----------------------------------------------------
  const savedPolicyList = allPolicies.filter(p => savedIds.includes(p.id));

  for (const policy of savedPolicyList) {
    const deadlineDate = parseDeadlineDate(policy.deadline);
    if (!deadlineDate) continue;

    const dDay = calculateDDay(deadlineDate);

    // Only alert if deadline is within 7 days and not expired
    if (dDay >= 0 && dDay <= 7) {
      const notifId = `deadline-${policy.id}-${todayStr}-d${dDay}`;

      if (!validExistingMap.has(notifId)) {
        let tag = `D-${dDay}`;
        let message = '';

        if (dDay === 0) {
          tag = '오늘 마감';
          message = `보관하신 '${policy.title}' 신청이 오늘 마감됩니다! 서둘러 확인하세요.`;
        } else if (dDay === 1) {
          tag = '내일 마감';
          message = `보관하신 '${policy.title}' 신청 마감이 하루 남았습니다.`;
        } else {
          tag = `D-${dDay}`;
          message = `보관하신 '${policy.title}' 신청 마감이 ${dDay}일 남았습니다.`;
        }

        newItems.push({
          id: notifId,
          type: 'deadline',
          title: `[마감 임박] ${policy.title}`,
          message,
          targetUrl: policy.url || `/policies`,
          tag,
          createdAt: new Date().toISOString(),
          isRead: false,
          dDay,
          org: policy.org || policy.dept || '순천시'
        });
      }
    }
  }

  // ----------------------------------------------------
  // 2. Keyword-based New Notice & Policy Notifications
  // ----------------------------------------------------
  for (const kw of activeKeywords) {
    const synonyms = KEYWORD_SYNONYMS[kw] || [kw];
    const lowerSynonyms = synonyms.map(s => s.toLowerCase());

    // Check notices (scan full notice dataset, max 3 per keyword)
    let noticeMatchCount = 0;
    for (const notice of allNotices) {
      if (noticeMatchCount >= 3) break;
      const text = `${notice.title} ${notice.dept || ''} ${notice.reason || ''} ${notice.source || ''}`.toLowerCase();
      const isMatched = lowerSynonyms.some(term => text.includes(term));
      if (isMatched) {
        const notifId = `keyword-notice-${notice.id}-${kw}`;
        if (!validExistingMap.has(notifId)) {
          newItems.push({
            id: notifId,
            type: 'keyword',
            title: `[${kw} 맞춤 공고] ${notice.title}`,
            message: `관심 분야 '${kw}' 관련 순천시 최신 공지/소식이 등록되었습니다.`,
            targetUrl: notice.link || '/notices',
            tag: kw,
            createdAt: new Date().toISOString(),
            isRead: false,
            org: notice.source || '순천시'
          });
          validExistingMap.set(notifId, newItems[newItems.length - 1]);
        }
        noticeMatchCount++;
      }
    }

    // Check policies (scan full policy dataset, max 3 per keyword)
    let policyMatchCount = 0;
    for (const policy of allPolicies) {
      if (policyMatchCount >= 3) break;
      const text = `${policy.title} ${policy.target || ''} ${policy.description || ''} ${policy.category || ''} ${policy.reason || ''} ${policy.dept || ''}`.toLowerCase();
      const isMatched = lowerSynonyms.some(term => text.includes(term));
      if (isMatched) {
        const notifId = `keyword-policy-${policy.id}-${kw}`;
        if (!validExistingMap.has(notifId)) {
          newItems.push({
            id: notifId,
            type: 'keyword',
            title: `[${kw} 맞춤 혜택] ${policy.title}`,
            message: `관심 분야 '${kw}'에 부합하는 순천시 지원 정책이 등록되었습니다.`,
            targetUrl: policy.url || '/policies',
            tag: kw,
            createdAt: new Date().toISOString(),
            isRead: false,
            org: policy.org || policy.dept || '순천시'
          });
          validExistingMap.set(notifId, newItems[newItems.length - 1]);
        }
        policyMatchCount++;
      }
    }
  }

  // Combine and sort by createdAt descending
  const combined = [...newItems, ...validExisting];

  // Limit stored notifications to recent 50 items
  const sorted = combined
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  saveStoredNotifications(sorted, userEmail);
  return sorted;
}
