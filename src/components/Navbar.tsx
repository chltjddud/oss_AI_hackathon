'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, Layers, MessageSquarePlus, LogIn, LogOut, User, Bookmark, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [savedCount, setSavedCount] = useState<number>(0);

  useEffect(() => {
    const updateSavedCount = () => {
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('suncheon_saved_policies');
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

    updateSavedCount();

    const checkUser = () => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setUser(data.user);
        } else if (typeof window !== 'undefined') {
          const authStr = localStorage.getItem('suncheon_auth_session') || localStorage.getItem('suncheon_guest_user');
          if (authStr) {
            try {
              setUser(JSON.parse(authStr));
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      });
      updateSavedCount();
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        checkUser();
      }
      updateSavedCount();
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('suncheon_auth_session');
      localStorage.removeItem('suncheon_guest_user');
    }
    setUser(null);
  };

  const navLinks = [
    {
      href: '/custom-search',
      label: 'AI 맞춤 검색',
      icon: Sparkles,
      isActive: pathname === '/custom-search',
    },
    {
      href: '/notices',
      label: '순천시 공지보기',
      icon: Bell,
      isActive: pathname === '/notices',
    },
    {
      href: '/policies',
      label: '순천시 지원보기',
      icon: Layers,
      isActive: pathname === '/policies',
    },
    {
      href: '/support',
      label: '이런 지원 필요해요',
      icon: MessageSquarePlus,
      isActive: pathname === '/support',
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur shadow-2xs">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/suncheon-logo.svg"
            alt="순천시 로고"
            width={75}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <div className="flex flex-col">
            <span className="font-bold text-base sm:text-lg text-emerald-800 tracking-tight group-hover:text-emerald-600 transition-colors">
              순천시 혜택 모음
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden sm:inline">
              순천시 공지 · 맞춤 지원 · 시민 제안 포털
            </span>
          </div>
        </Link>

        {/* Navigation & Auth */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <nav className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    item.isActive
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="inline md:hidden">
                    {item.label === 'AI 맞춤 검색'
                      ? '맞춤검색'
                      : item.label === '순천시 공지보기'
                      ? '공지'
                      : item.label === '순천시 지원보기'
                      ? '지원'
                      : '시민제안'}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* 내 보관함 버튼 (전용 보관함 페이지로 이동) */}
          <Link
            href="/bookmarks"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300/80 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
            title="내가 보관한 순천시 맞춤 혜택 목록"
          >
            <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500 group-hover:scale-110 transition-transform" />
            <span>내 보관함</span>
            {savedCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-extrabold shadow-2xs">
                {savedCount}
              </span>
            )}
          </Link>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-700 font-semibold hidden lg:inline max-w-[140px] truncate px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                {user.is_guest
                  ? '순천시민 (체험)'
                  : user.user_metadata?.name
                  ? `${user.user_metadata.name}님`
                  : user.name
                  ? `${user.name}님`
                  : `${user.email?.split('@')[0]}님`}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                title="로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
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
