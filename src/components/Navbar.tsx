'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, Layers, MessageSquarePlus, LogIn, LogOut, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const navLinks = [
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
                    {item.label === '순천시 공지보기'
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

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium hidden lg:inline max-w-[120px] truncate">
                {user.email?.split('@')[0]}님
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-all"
                title="로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-2xs"
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
