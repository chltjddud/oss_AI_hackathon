'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogIn, UserPlus, Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 이메일 중복 실시간 검증 (회원가입 모드)
  const cleanEmail = email.trim().toLowerCase();
  const isDuplicateEmail = mode === 'signup' && cleanEmail.length > 0 && (() => {
    if (typeof window === 'undefined') return false;
    if (cleanEmail === 'guest@suncheon.kr') return true;
    try {
      const registered = JSON.parse(localStorage.getItem('suncheon_registered_accounts') || '[]');
      return registered.some((acc: any) => acc.email?.trim().toLowerCase() === cleanEmail);
    } catch {
      return false;
    }
  })();

  const getRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('redirect') || '/';
    }
    return '/';
  };

  const handleGuestLogin = () => {
    const guestUser = {
      id: 'guest-' + Date.now(),
      email: 'guest@suncheon.kr',
      name: '순천시민 (체험)',
      user_metadata: { name: '순천시민 (체험)' },
      is_guest: true
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('suncheon_auth_session', JSON.stringify(guestUser));
      window.dispatchEvent(new Event('auth_state_changed'));
    }
    setSuccessMsg('체험용 계정으로 로그인되었습니다. 이동합니다.');
    setTimeout(() => {
      router.push(getRedirectUrl());
      router.refresh();
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetEmail = email.trim().toLowerCase();

      if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
        throw new Error('올바른 이메일 형식을 입력해 주세요.');
      }

      if (mode === 'login') {
        let loginSuccess = false;

        // 1. Supabase 로그인 시도
        try {
          const { error, data } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password,
          });
          if (!error && data?.session) {
            loginSuccess = true;
            if (typeof window !== 'undefined') {
              const userObj = {
                ...data.user,
                name: data.user.user_metadata?.name || targetEmail.split('@')[0]
              };
              localStorage.setItem('suncheon_auth_session', JSON.stringify(userObj));
              window.dispatchEvent(new Event('auth_state_changed'));
            }
          }
        } catch {
          // Supabase 에러 발생 시 로컬 계정 확인으로 fallback
        }

        // 2. 로컬 등록 계정 확인 fallback (대소문자 무시)
        if (!loginSuccess && typeof window !== 'undefined') {
          const registered = JSON.parse(localStorage.getItem('suncheon_registered_accounts') || '[]');
          const matched = registered.find((acc: any) => 
            acc.email?.trim().toLowerCase() === targetEmail && acc.password === password
          );
          if (matched) {
            loginSuccess = true;
            const sessionUser = {
              id: matched.id,
              email: matched.email,
              name: matched.name || matched.email.split('@')[0],
              user_metadata: { name: matched.name || matched.email.split('@')[0] },
              is_member: true
            };
            localStorage.setItem('suncheon_auth_session', JSON.stringify(sessionUser));
            window.dispatchEvent(new Event('auth_state_changed'));
          }
        }

        if (!loginSuccess) {
          throw new Error('이메일 또는 비밀번호가 일치하지 않습니다. 회원가입 후 이용해 주세요.');
        }

        setSuccessMsg('로그인되었습니다. 이동합니다.');
        setTimeout(() => {
          router.push(getRedirectUrl());
          router.refresh();
        }, 600);
      } else {
        // 회원가입 모드: 이름 입력 검증 및 이메일 중복 엄격 차단
        const cleanName = name.trim();
        if (!cleanName) {
          throw new Error('회원가입을 위해 이름을 입력해 주세요.');
        }

        if (targetEmail === 'guest@suncheon.kr') {
          throw new Error('체험용 계정 이메일(guest@suncheon.kr)은 회원가입에 사용할 수 없습니다.');
        }

        if (typeof window !== 'undefined') {
          const registered = JSON.parse(localStorage.getItem('suncheon_registered_accounts') || '[]');
          const isDuplicate = registered.some((acc: any) => acc.email?.trim().toLowerCase() === targetEmail);
          
          if (isDuplicate) {
            throw new Error('이미 등록된 이메일 주소입니다. 로그인 탭에서 로그인해 주세요.');
          }

          const newUserId = 'user-' + Date.now();
          const newUser = {
            id: newUserId,
            name: cleanName,
            email: targetEmail,
            user_metadata: { name: cleanName },
            is_member: true
          };

          registered.push({
            id: newUserId,
            name: cleanName,
            email: targetEmail,
            password,
            createdAt: new Date().toISOString()
          });
          localStorage.setItem('suncheon_registered_accounts', JSON.stringify(registered));
          localStorage.setItem('suncheon_auth_session', JSON.stringify(newUser));
          window.dispatchEvent(new Event('auth_state_changed'));
        }

        setSuccessMsg(`${cleanName}님, 회원가입이 완료되었습니다! 즉시 로그인되었습니다.`);
        setTimeout(() => {
          router.push(getRedirectUrl());
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            메인으로 돌아가기
          </Link>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              {mode === 'login' ? '순천 혜택 포털 로그인' : '순천 혜택 포털 회원가입'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              순천시민을 위한 실시간 맞춤 혜택과 공지 알림을 이용하세요.
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signup' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              회원가입
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">이름 (성함 또는 닉네임)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="홍길동 (또는 순천시민)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">이메일 주소</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="example@suncheon.kr"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg('');
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                    isDuplicateEmail
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
              {isDuplicateEmail && (
                <p className="text-[11px] font-semibold text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>이미 등록된 이메일 주소입니다. 로그인 탭에서 로그인해 주세요.</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">비밀번호</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="6자리 이상 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isDuplicateEmail}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{loading ? '로그인 중...' : '로그인'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? '가입 처리 중...' : '회원가입'}</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-medium">또는 바로 체험하기</span>
            </div>
          </div>

          {/* Guest / Demo Login Button */}
          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-800 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer group shadow-2xs"
          >
            <span className="px-1.5 py-0.5 rounded bg-emerald-200/70 text-[11px] font-bold text-emerald-800">1초 로그인</span>
            <span>순천시민 체험 계정으로 시작하기 (게스트)</span>
          </button>

          {/* Registration Info Tip */}
          <div className="mt-6 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-[11px] sm:text-xs text-emerald-900 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 text-emerald-950 mb-1">
              💡 간편 회원가입 안내
            </p>
            <p className="text-slate-600">
              별도의 확인 이메일 수신 대기 없이, 가입 버튼을 누르면 <strong>즉시 회원 등록 및 로그인</strong>되어 순천 혜택 보관함과 모든 맞춤 서비스를 바로 이용하실 수 있습니다.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
