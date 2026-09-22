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

// Parse date string into Date object
export function parseDeadlineDate(rawDate?: string | null): Date | null {
  if (!rawDate) return null;
  const str = rawDate.trim();

  // If contains range (e.g. 2026-09-01 ~ 2026-09-30), take the end date
  const parts = str.split(/[~–-]\s*/);
  const targetStr = parts.length > 1 && parts[1].length >= 8 ? parts[1].trim() : str;

  // Match YYYY-MM-DD or YYYY.MM.DD
  const m1 = targetStr.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m1) {
    const year = parseInt(m1[1], 10);
    const month = parseInt(m1[2], 10) - 1;
    const day = parseInt(m1[3], 10);
    return new Date(year, month, day);
  }

  // Match YYYY년 M월 D일
  const m2 = targetStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (m2) {
    const year = parseInt(m2[1], 10);
    const month = parseInt(m2[2], 10) - 1;
    const day = parseInt(m2[3], 10);
    return new Date(year, month, day);
  }

  return null;
}

// Calculate D-Day: returns number of days remaining (0 = today, negative = past)
export function calculateDDay(targetDate: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
 * 2. Active interest keywords against policies and notices
 */
export function syncNotifications(
  allPolicies: SyncCandidatePolicy[],
  allNotices: SyncCandidateNotice[],
  savedIds: string[],
  keywords: string[],
  userEmail?: string
): NotificationItem[] {
  const existing = getStoredNotifications(userEmail);
  const existingMap = new Map<string, NotificationItem>(existing.map(n => [n.id, n]));
  const todayStr = new Date().toISOString().split('T')[0];

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

      if (!existingMap.has(notifId)) {
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
  const activeKeywords = keywords.filter(k => k.trim().length >= 2);

  for (const kw of activeKeywords) {
    const lowerKw = kw.toLowerCase();

    // Check notices
    for (const notice of allNotices.slice(0, 30)) {
      const text = `${notice.title} ${notice.dept || ''} ${notice.reason || ''}`.toLowerCase();
      if (text.includes(lowerKw)) {
        const notifId = `keyword-notice-${notice.id}-${kw}`;
        if (!existingMap.has(notifId)) {
          newItems.push({
            id: notifId,
            type: 'keyword',
            title: `[${kw} 신규 공고] ${notice.title}`,
            message: `관심 키워드 '${kw}' 관련 최신 공지사항이 등록되었습니다.`,
            targetUrl: notice.link || '/notices',
            tag: kw,
            createdAt: new Date().toISOString(),
            isRead: false,
            org: notice.source || '순천시'
          });
        }
      }
    }

    // Check policies
    for (const policy of allPolicies.slice(0, 30)) {
      const text = `${policy.title} ${policy.target || ''} ${policy.description || ''} ${policy.category || ''}`.toLowerCase();
      if (text.includes(lowerKw)) {
        const notifId = `keyword-policy-${policy.id}-${kw}`;
        if (!existingMap.has(notifId)) {
          newItems.push({
            id: notifId,
            type: 'keyword',
            title: `[${kw} 맞춤 혜택] ${policy.title}`,
            message: `관심 키워드 '${kw}'에 부합하는 지원 정책이 등록되었습니다.`,
            targetUrl: policy.url || '/policies',
            tag: kw,
            createdAt: new Date().toISOString(),
            isRead: false,
            org: policy.org || '순천시'
          });
        }
      }
    }
  }

  // Combine and sort by createdAt descending
  const combined = [...newItems, ...existing];

  // Limit stored notifications to recent 50 items
  const sorted = combined
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  saveStoredNotifications(sorted, userEmail);
  return sorted;
}
