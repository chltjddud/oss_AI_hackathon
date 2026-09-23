'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, Layers, MessageSquarePlus, LogIn, LogOut, User, Bookmark, Sparkles, Bot, ChevronDown, Menu, X, Home, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import NotificationCenter from '@/components/NotificationCenter';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
      if (typeof window !== 'undefined') {
        const authStr = localStorage.getItem('suncheon_auth_session') || localStorage.getItem('suncheon_guest_user');
        if (authStr) {
          try {
            const parsed = JSON.parse(authStr);
            setUser(parsed);
            updateSavedCount(parsed);
          } catch {}
        }
      }

      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setUser(data.user);
          updateSavedCount(data.user);
        }
      }).catch(() => {});
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
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur shadow-2xs">
        <div className="container mx-auto flex h-16 items-center justify-between px-3 sm:px-6">
          {/* Brand Logo & Title */}
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

          {/* Desktop & Mobile Actions */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      item.isActive
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden lg:block" />

            {/* 내 보관함 버튼 (Desktop) */}
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300/80 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors shadow-2xs cursor-pointer group shrink-0"
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

            {/* 알림 센터 */}
            <NotificationCenter user={user} />

            {/* Auth Button & Dropdown */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer select-none ${
                    isUserMenuOpen
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                  title="사용자 메뉴 (클릭 시 마이페이지 및 설정)"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    {user.name ? user.name.charAt(0) : '순'}
                  </div>
                  <span className="text-xs font-bold max-w-[85px] sm:max-w-[125px] truncate hidden sm:inline">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">로그인</span>
              </Link>
            )}

            {/* Mobile Hamburger Button (Visible only on < lg) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer border border-slate-200/90 ml-0.5"
              aria-label="모바일 메뉴 열기"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-emerald-700" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 py-4 space-y-3.5 shadow-xl animate-in slide-in-from-top-2 duration-150">
            {/* User Greeting Card on Mobile */}
            {user ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.name ? user.name.charAt(0) : '순'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {user.is_guest
                        ? '순천시민 (체험)'
                        : user.user_metadata?.name
                        ? `${user.user_metadata.name}님`
                        : user.name
                        ? `${user.name}님`
                        : `${user.email?.split('@')[0]}님`}
                    </div>
                    <div className="text-[10px] text-slate-500">{user.email || '순천시 맞춤 지원 회원'}</div>
                  </div>
                </div>
                <Link
                  href="/mypage"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-xl border border-emerald-300 shadow-2xs"
                >
                  마이페이지
                </Link>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">로그인하고 맞춤 혜택 받기</div>
                  <div className="text-[10px] text-slate-500">관심 복지 알림 및 내 보관함 동기화</div>
                </div>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-xl shadow-xs"
                >
                  로그인
                </Link>
              </div>
            )}

            {/* Mobile Navigation Links */}
            <div className="grid grid-cols-1 gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      item.isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </Link>
                );
              })}

              {/* 내 보관함 Quick Link */}
              <Link
                href="/bookmarks"
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  if (!user) {
                    e.preventDefault();
                    if (window.confirm('로그인 후 내 보관함을 이용하실 수 있습니다.\n로그인 페이지로 이동하시겠습니까?')) {
                      window.location.href = '/login?redirect=/bookmarks';
                    }
                  }
                }}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200/80"
              >
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>내 보관함</span>
                </div>
                {savedCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold">
                    {savedCount}개 보관
                  </span>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                )}
              </Link>
            </div>

            {user && (
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                <Link href="/mypage" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-700 font-medium">
                  관심 키워드 알림 관리
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Mobile App-Style Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-1 py-1 flex justify-around items-center">
        {/* 1. 홈 */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-colors ${
            pathname === '/'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">홈</span>
        </Link>

        {/* 2. AI 검색 */}
        <Link
          href="/custom-search"
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-colors ${
            pathname === '/custom-search'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">AI 검색</span>
        </Link>

        {/* 3. 복지보기 */}
        <Link
          href="/policies"
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-colors ${
            pathname === '/policies'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">복지보기</span>
        </Link>

        {/* 4. AI 상담 */}
        <Link
          href="/chat"
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-colors ${
            pathname === '/chat'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bot className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">AI 상담</span>
        </Link>

        {/* 5. 내 보관함 */}
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
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-colors relative ${
            pathname === '/bookmarks'
              ? 'text-amber-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className="relative">
            <Bookmark className={`w-5 h-5 mb-0.5 ${pathname === '/bookmarks' ? 'fill-amber-600 text-amber-600' : ''}`} />
            {user && savedCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-amber-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                {savedCount > 99 ? '99+' : savedCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">보관함</span>
        </Link>
      </nav>
    </>
  );
}
