'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, Layers, MessageSquarePlus, LogIn, LogOut, User, Bookmark, Sparkles, Bot, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import NotificationCenter from '@/components/NotificationCenter';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSavedCount = (activeUser?: any) => {
      if (typeof window !== 'undefined') {
        try {
          const authStr = localStorage.getItem('suncheon_auth_session') || localStorage.getItem('suncheon_guest_user');
          let email = activeUser?.email;
          if (!email && authStr) {
            try {
              email = JSON.parse(authStr).email;
            } catch {}
          }
          if (!email) {
            setSavedCount(0);
            return;
          }
          const userKey = `suncheon_saved_policies_${email}`;
          const raw = localStorage.getItem(userKey) || localStorage.getItem('suncheon_saved_policies');
          if (raw) {
            const list = JSON.parse(raw);
            setSavedCount(Array.isArray(list) ? list.length : 0);
          } else {
            setSavedCount(0);
          }
        } catch {
          setSavedCount(0);
        }
      }
    };

    const checkUser = () => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setUser(data.user);
          updateSavedCount(data.user);
        } else if (typeof window !== 'undefined') {
          const authStr = localStorage.getItem('suncheon_auth_session') || localStorage.getItem('suncheon_guest_user');
          if (authStr) {
            try {
              const parsed = JSON.parse(authStr);
              setUser(parsed);
              updateSavedCount(parsed);
            } catch {
              setUser(null);
              setSavedCount(0);
            }
          } else {
            setUser(null);
            setSavedCount(0);
          }
        }
      });
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        updateSavedCount(session.user);
      } else {
        checkUser();
      }
    });

    const handleCustomAuth = () => checkUser();
    const handleBookmarkChanged = () => updateSavedCount();

    window.addEventListener('auth_state_changed', handleCustomAuth);
    window.addEventListener('bookmark_changed', handleBookmarkChanged);
    window.addEventListener('storage', handleBookmarkChanged);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('auth_state_changed', handleCustomAuth);
      window.removeEventListener('bookmark_changed', handleBookmarkChanged);
      window.removeEventListener('storage', handleBookmarkChanged);
    };
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('suncheon_auth_session');
      localStorage.removeItem('suncheon_guest_user');
      localStorage.removeItem('suncheon_saved_policies');
      window.dispatchEvent(new Event('auth_state_changed'));
      window.dispatchEvent(new Event('bookmark_changed'));
    }
    setUser(null);
    setSavedCount(0);
  };

  const navLinks = [
    {
      href: '/custom-search',
      label: 'AI 검색',
      icon: Sparkles,
      isActive: pathname === '/custom-search',
    },
    {
      href: '/chat',
      label: 'AI 상담',
      icon: Bot,
      isActive: pathname === '/chat',
    },
    {
      href: '/notices',
      label: '공지보기',
      icon: Bell,
      isActive: pathname === '/notices',
    },
    {
      href: '/policies',
      label: '복지보기',
      icon: Layers,
      isActive: pathname === '/policies',
    },
    {
      href: '/support',
      label: '복지 요청',
      icon: MessageSquarePlus,
      isActive: pathname === '/support',
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur shadow-2xs">
      <div className="container mx-auto flex h-16 items-center justify-between px-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <Image
            src="/suncheon-logo.svg"
            alt="순천시 로고"
            width={75}
            height={32}
            className="h-7 sm:h-8 w-auto"
            priority
          />
          <div className="flex flex-col">
            <span className="font-bold text-sm sm:text-lg text-emerald-800 tracking-tight group-hover:text-emerald-600 transition-colors whitespace-nowrap">
              순천시 혜택 모음
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden xl:inline whitespace-nowrap">
              순천시 공지 · 맞춤 지원 · 시민 제안 포털
            </span>
          </div>
        </Link>

        {/* Navigation & Auth */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <nav className="flex items-center gap-0.5 sm:gap-1 lg:gap-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                    item.isActive
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* 내 보관함 버튼 (전용 보관함 페이지로 이동) */}
          <Link
            href="/bookmarks"
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
                if (window.confirm('로그인 후 내 보관함을 이용하실 수 있습니다.\n로그인 페이지로 이동하시겠습니까?')) {
                  window.location.href = '/login?redirect=/bookmarks';
                }
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300/80 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
            title={user ? '내가 보관한 순천시 맞춤 혜택 목록' : '내 보관함 (로그인 후 이용 가능)'}
          >
            <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500 group-hover:scale-110 transition-transform" />
            <span>내 보관함</span>
            {user && savedCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-extrabold shadow-2xs">
                {savedCount}
              </span>
            )}
          </Link>

          {/* 알림 센터 (D-Day 마감 임박 & 키워드 공고) */}
          <NotificationCenter user={user} />

          {/* Auth Button & Dropdown */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isUserMenuOpen
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
                title="사용자 메뉴 (클릭 시 마이페이지 및 설정)"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  {user.name ? user.name.charAt(0) : '순'}
                </div>
                <span className="text-xs font-bold max-w-[85px] sm:max-w-[125px] truncate">
                  {user.is_guest
                    ? '순천시민 (체험)'
                    : user.user_metadata?.name
                    ? `${user.user_metadata.name}님`
                    : user.name
                    ? `${user.name}님`
                    : `${user.email?.split('@')[0]}님`}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-emerald-700 transition-transform duration-200 shrink-0 ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 sm:w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-fadeIn">
                  {/* User Profile Header */}
                  <div className="px-3 py-2.5 bg-slate-50 rounded-xl mb-1.5 border border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {user.is_guest
                          ? '순천시민 (체험)'
                          : user.user_metadata?.name
                          ? `${user.user_metadata.name}님`
                          : user.name
                          ? `${user.name}님`
                          : `${user.email?.split('@')[0]}님`}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                        {user.is_guest ? '체험' : '회원'}
                      </span>
                    </div>
                    {user.email && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {user.email}
                      </p>
                    )}
                  </div>

                  {/* Dropdown Items */}
                  <div className="space-y-0.5">
                    <Link
                      href="/mypage"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-colors group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                          마이페이지
                        </span>
                        <span className="text-[10px] text-slate-500">
                          개인정보 수정 및 맞춤 복지 설정
                        </span>
                      </div>
                    </Link>

                    <Link
                      href="/bookmarks"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-slate-700 hover:text-amber-900 transition-colors group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Bookmark className="w-4 h-4 fill-amber-500 text-amber-500" />
                      </div>
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                            내 보관함
                          </span>
                          {savedCount > 0 && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500 text-white">
                              {savedCount}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          내가 찜한 순천시 혜택
                        </span>
                      </div>
                    </Link>
                  </div>

                  <div className="h-px bg-slate-100 my-1.5" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-red-600" />
                    <span>로그아웃</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>로그인</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
