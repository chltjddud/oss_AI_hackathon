'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Settings,
  Trash2,
  ExternalLink,
  Clock,
  Sparkles,
  Tag,
  X,
  AlertCircle
} from 'lucide-react';
import {
  NotificationItem,
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteStoredNotification,
  clearAllStoredNotifications,
  getInterestKeywords,
  saveInterestKeywords,
  PRESET_KEYWORDS,
  syncNotifications
} from '@/lib/notifications';

interface NotificationCenterProps {
  user?: any;
}

export default function NotificationCenter({ user: propUser }: NotificationCenterProps) {
  const [mounted, setMounted] = useState(false);
  const [activeUser, setActiveUser] = useState<any>(propUser || null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'deadline' | 'keyword'>('all');
  const [keywords, setKeywords] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveUser(propUser);
  }, [propUser]);

  useEffect(() => {
    const handleAuth = () => {
      if (typeof window !== 'undefined') {
        const authStr = localStorage.getItem('suncheon_auth_session') || localStorage.getItem('suncheon_guest_user');
        if (authStr) {
          try {
            setActiveUser(JSON.parse(authStr));
          } catch {
            setActiveUser(null);
          }
        } else {
          setActiveUser(null);
        }
      }
    };
    handleAuth();
    window.addEventListener('auth_state_changed', handleAuth);
    return () => window.removeEventListener('auth_state_changed', handleAuth);
  }, []);

  const currentUser = activeUser || propUser;
  const userEmail = currentUser?.email || undefined;

  // Load notifications and keywords on mount / when user changes
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    if (!currentUser) {
      setNotifications([]);
      setKeywords([]);
      return;
    }

    const storedNotifs = getStoredNotifications(userEmail);
    const storedKw = getInterestKeywords(userEmail);
    setNotifications(storedNotifs);
    setKeywords(storedKw);

    let cachedPolicies: any[] = [];
    let cachedNotices: any[] = [];

    // Background evaluation with cached/fetched data
    const runSync = async (currentKw = storedKw) => {
      try {
        const savedIdsRaw = localStorage.getItem('suncheon_saved_policies');
        const savedIds: string[] = savedIdsRaw ? JSON.parse(savedIdsRaw) : [];

        if (cachedPolicies.length === 0 || cachedNotices.length === 0) {
          const [crawlRes, policiesRes] = await Promise.allSettled([
            fetch('/api/crawl?category=all').then(r => r.json()),
            fetch('/api/policies/sync').then(r => r.json())
          ]);

          const crawlData = crawlRes.status === 'fulfilled' ? crawlRes.value : null;
          const policiesData = policiesRes.status === 'fulfilled' ? policiesRes.value : null;

          cachedNotices = [
            ...(crawlData?.notice || []),
            ...(crawlData?.welfare || [])
          ];

          cachedPolicies = [
            ...(policiesData?.policies || []),
            ...(policiesData?.welfare || [])
          ];
        }

        const updated = syncNotifications(
          cachedPolicies,
          cachedNotices,
          savedIds,
          currentKw,
          userEmail
        );
        setNotifications(updated);
      } catch (err) {
        console.error('Failed to run notification sync:', err);
      }
    };

    runSync();

    // Listen for storage events & keyword change events
    const handleKeywordsChanged = () => {
      const kw = getInterestKeywords(userEmail);
      setKeywords((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(kw)) return prev;
        return kw;
      });
      runSync(kw);
    };

    const handleStorageChange = () => {
      setNotifications(getStoredNotifications(userEmail));
      handleKeywordsChanged();
      runSync();
    };

    const handleBookmarkChanged = () => {
      runSync();
    };

    window.addEventListener('storage', handleStorageChange as EventListener);
    window.addEventListener('bookmark_changed', handleBookmarkChanged);
    window.addEventListener('suncheon_keywords_changed', handleKeywordsChanged);
    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener);
      window.removeEventListener('bookmark_changed', handleBookmarkChanged);
      window.removeEventListener('suncheon_keywords_changed', handleKeywordsChanged);
    };
  }, [userEmail, currentUser]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = currentUser ? notifications.filter(n => !n.isRead).length : 0;

  const handleMarkAsRead = (id: string) => {
    const updated = markNotificationAsRead(id, userEmail);
    setNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = markAllNotificationsAsRead(userEmail);
    setNotifications(updated);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteStoredNotification(id, userEmail);
    setNotifications(updated);
  };

  const handleClearAll = () => {
    clearAllStoredNotifications(userEmail);
    setNotifications([]);
  };

  const handleAddKeyword = (kw: string) => {
    const clean = kw.trim();
    if (!clean || keywords.includes(clean)) return;
    const updated = [...keywords, clean];
    setKeywords(updated);
    saveInterestKeywords(updated, userEmail);
    // Update active user session interests if present
    try {
      const authStr = localStorage.getItem('suncheon_auth_session');
      if (authStr) {
        const u = JSON.parse(authStr);
        u.interests = updated;
        if (u.user_metadata) u.user_metadata.interests = updated;
        localStorage.setItem('suncheon_auth_session', JSON.stringify(u));
      }
    } catch {}
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('suncheon_keywords_changed', { detail: updated }));
    }, 0);
  };

  const handleRemoveKeyword = (kw: string) => {
    const updated = keywords.filter(k => k !== kw);
    setKeywords(updated);
    saveInterestKeywords(updated, userEmail);
    try {
      const authStr = localStorage.getItem('suncheon_auth_session');
      if (authStr) {
        const u = JSON.parse(authStr);
        u.interests = updated;
        if (u.user_metadata) u.user_metadata.interests = updated;
        localStorage.setItem('suncheon_auth_session', JSON.stringify(u));
      }
    } catch {}
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('suncheon_keywords_changed', { detail: updated }));
    }, 0);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'deadline') return n.type === 'deadline';
    if (filterType === 'keyword') return n.type === 'keyword';
    return true;
  });

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return '방금 전';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
    return `${Math.floor(diffSec / 86400)}일 전`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          if (!currentUser) {
            if (window.confirm('로그인 후 맞춤 알림 서비스를 이용하실 수 있습니다.\n로그인 페이지로 이동하시겠습니까?')) {
              window.location.href = '/login';
            }
            return;
          }
          setIsOpen(prev => !prev);
        }}
        className="relative p-2 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-all cursor-pointer flex items-center justify-center group"
        title={currentUser ? '알림 센터' : '알림 센터 (로그인 후 이용 가능)'}
        aria-label={currentUser ? '알림 센터' : '알림 센터 (로그인 후 이용 가능)'}
      >
        <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        {currentUser && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 max-w-[95vw] bg-white rounded-3xl border-2 border-slate-200/90 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 text-slate-800">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-900">
                알림 센터
              </span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                  {unreadCount}개 미확인
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold">
                  모두 읽음
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsSettingsOpen(true);
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                title="관심 키워드 설정"
              >
                <Settings className="w-4 h-4" />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition-colors"
                  title="모두 읽음 처리"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">모두 읽음</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 px-3 pt-2 bg-white text-xs font-bold gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              전체 ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('deadline')}
              className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                filterType === 'deadline'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              마감 임박 ({notifications.filter(n => n.type === 'deadline').length})
            </button>
            <button
              onClick={() => setFilterType('keyword')}
              className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                filterType === 'keyword'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              신규 공고 ({notifications.filter(n => n.type === 'keyword').length})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center text-slate-400 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">
                  새로운 알림이 없습니다
                </p>
                <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">
                  보관한 혜택의 마감 기한이 다가오거나 관심 키워드 공고가 등록되면 알려드립니다.
                </p>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="mt-4 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors"
                >
                  관심 키워드 등록하기
                </button>
              </div>
            ) : (
              filteredNotifications.map(item => {
                const isDeadline = item.type === 'deadline';
                const isUrgent = item.dDay === 0 || item.dDay === 1;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleMarkAsRead(item.id)}
                    className={`p-4 transition-all relative group cursor-pointer hover:bg-slate-50 ${
                      !item.isRead ? 'bg-emerald-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex-1">
                        {/* Tags and Timestamps */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {isDeadline ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                isUrgent
                                  ? 'bg-red-600 text-white'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{item.tag}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Tag className="w-3 h-3 text-emerald-600" />
                              <span>{item.tag}</span>
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400">
                            {formatTimeAgo(item.createdAt)}
                          </span>

                          {!item.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                          )}
                        </div>

                        {/* Title & Message */}
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug mb-1 group-hover:text-emerald-700 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {item.message}
                        </p>

                        {/* Org & Target Link Button */}
                        <div className="mt-2.5 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">
                            {item.org || '순천시'}
                          </span>
                          <Link
                            href={item.targetUrl}
                            target={item.targetUrl.startsWith('http') ? '_blank' : undefined}
                            rel={item.targetUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(item.id);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                          >
                            <span>확인하기</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-md transition-all shrink-0"
                        title="알림 삭제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500 px-4">
              <span>최대 최근 50건 유지</span>
              <button
                onClick={handleClearAll}
                className="hover:text-red-600 font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>알림 전체 삭제</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Keyword Settings Modal (Centered in Viewport via Portal) */}
      {mounted && isSettingsOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsSettingsOpen(false);
              }}
            >
              <div
                className="w-full max-w-lg bg-white rounded-3xl border-2 border-slate-200 shadow-2xl p-6 sm:p-8 relative animate-in zoom-in-95 duration-200 text-slate-800 my-auto max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    관심 키워드 알림 설정
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
                  원하는 인기 키워드를 클릭하여 켜거나 끌 수 있습니다. 등록된 키워드와 일치하는 새 공고가 등록되면 알림 센터로 실시간 안내해 드립니다.
                </p>

                {/* Currently Active Keywords */}
                <div className="mb-6 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-bold text-slate-700">
                      현재 선택된 알림 키워드 ({keywords.length}개)
                    </label>
                    {keywords.length > 0 && (
                      <button
                        onClick={() => {
                          setKeywords([]);
                          saveInterestKeywords([]);
                          try {
                            const authStr = localStorage.getItem('suncheon_auth_session');
                            if (authStr) {
                              const u = JSON.parse(authStr);
                              u.interests = [];
                              if (u.user_metadata) u.user_metadata.interests = [];
                              localStorage.setItem('suncheon_auth_session', JSON.stringify(u));
                            }
                          } catch {}
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('suncheon_keywords_changed', { detail: [] }));
                          }, 0);
                        }}
                        className="text-[11px] text-slate-400 hover:text-red-600 font-semibold transition-colors cursor-pointer"
                      >
                        모두 해제
                      </button>
                    )}
                  </div>
                  {keywords.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white border border-dashed border-slate-300 text-center text-xs text-slate-400">
                      선택된 키워드가 없습니다. 아래 추천 인기 키워드를 클릭해 보세요.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {keywords.map(kw => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/90 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-2xs"
                        >
                          <span>{kw}</span>
                          <button
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-emerald-700 hover:text-red-600 transition-colors cursor-pointer"
                            title="키워드 해제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Preset Keywords Grid */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2.5">
                    추천 인기 키워드 (클릭하여 선택 / 해제)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_KEYWORDS.map(preset => {
                      const isAdded = keywords.includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => isAdded ? handleRemoveKeyword(preset) : handleAddKeyword(preset)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isAdded
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-[1.02]'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span>{isAdded ? '✓' : '+'}</span>
                          <span>{preset}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    설정 완료
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
