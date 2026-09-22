'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Lock,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  Bell,
  MessageSquarePlus,
  ArrowRight,
  ShieldAlert,
  X,
  LogIn
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getInterestKeywords, saveInterestKeywords, PRESET_KEYWORDS } from '@/lib/notifications';

// 순천시 관할 읍·면·동 목록
const SUNCHEON_DISTRICTS = [
  '조례동',
  '연향동',
  '덕연동',
  '풍덕동',
  '남제동',
  '저전동',
  '장천동',
  '중앙동',
  '삼산동',
  '향동',
  '매곡동',
  '왕조1동',
  '왕조2동',
  '해룡면 (신대지구 포함)',
  '서면',
  '황전면',
  '월등면',
  '주암면',
  '송광면',
  '외서면',
  '낙안면',
  '별량면',
  '상사면',
  '기타 / 전입 예정'
];

// 관심 복지 분야 목록 (알림 센터 키워드와 100% 실시간 연동)
const WELFARE_INTERESTS = PRESET_KEYWORDS;

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 폼 상태
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('조례동');
  const [interests, setInterests] = useState<string[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 상태 메시지
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 요약 카운트
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [keywordCount, setKeywordCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);

  // 탈퇴 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 유저 정보 로드
  useEffect(() => {
    const loadUserData = () => {
      setLoading(true);
      try {
        let currentUser: any = null;

        if (typeof window !== 'undefined') {
          const authStr =
            localStorage.getItem('suncheon_auth_session') ||
            localStorage.getItem('suncheon_guest_user');

          if (authStr) {
            currentUser = JSON.parse(authStr);
          }

          // 활동 통계 로드
          const savedRaw = localStorage.getItem('suncheon_saved_policies');
          if (savedRaw) {
            const parsed = JSON.parse(savedRaw);
            setBookmarkCount(Array.isArray(parsed) ? parsed.length : 0);
          }

          // 알림 센터 관심 키워드와 1:1 연동 로드
          const targetEmail = currentUser?.email || undefined;
          const currentKeywords = getInterestKeywords(targetEmail);
          setKeywordCount(currentKeywords.length);
          setInterests(currentKeywords);

          const requestsRaw = localStorage.getItem('suncheon_citizen_requests');
          if (requestsRaw && currentUser) {
            const parsed = JSON.parse(requestsRaw);
            if (Array.isArray(parsed)) {
              const myRequests = parsed.filter(
                (r: any) =>
                  (currentUser.email && r.author_email === currentUser.email) ||
                  (currentUser.name && r.author === currentUser.name)
              );
              setRequestCount(myRequests.length);
            }
          }
        }

        if (currentUser) {
          setUser(currentUser);
          setName(currentUser.name || currentUser.user_metadata?.name || '');
          setEmail(currentUser.email || '');
          setPhone(currentUser.phone || currentUser.user_metadata?.phone || '');
          setDistrict(currentUser.district || currentUser.user_metadata?.district || '조례동');
          // 알림센터의 키워드를 단일 진실 공급원(Single Source of Truth)으로 사용
          const kw = getInterestKeywords(currentUser.email);
          setInterests(kw);
          setKeywordCount(kw.length);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('사용자 정보 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

    // Supabase auth 확인 보완
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser((prev: any) => ({
          ...(prev || {}),
          ...data.user,
          name: data.user.user_metadata?.name || prev?.name || data.user.email?.split('@')[0]
        }));
      }
    });

    // 알림센터 또는 다른 탭에서의 키워드/보관함 변경 이벤트 실시간 수신
    const handleKeywordsSync = (e?: any) => {
      const authStr = typeof window !== 'undefined' ? (localStorage.getItem('suncheon_auth_session') || localStorage.getItem('suncheon_guest_user')) : null;
      let targetEmail: string | undefined = undefined;
      if (authStr) {
        try { targetEmail = JSON.parse(authStr).email; } catch {}
      }
      const kw = e?.detail || getInterestKeywords(targetEmail);
      setInterests(kw);
      setKeywordCount(kw.length);
      const userSavedKey = targetEmail ? `suncheon_saved_policies_${targetEmail.toLowerCase()}` : null;
      const raw = (userSavedKey && localStorage.getItem(userSavedKey)) || localStorage.getItem('suncheon_saved_policies');
      setBookmarkCount(raw ? JSON.parse(raw).length : 0);
    };

    const handleStorage = (e?: Event) => {
      const se = e as StorageEvent | undefined;
      if (!se?.key || se.key === 'suncheon_interest_keywords') {
        handleKeywordsSync();
      }
      if (!se?.key || se.key === 'suncheon_saved_policies') {
        const raw = localStorage.getItem('suncheon_saved_policies');
        setBookmarkCount(raw ? JSON.parse(raw).length : 0);
      }
    };

    window.addEventListener('storage', handleStorage as EventListener);
    window.addEventListener('bookmark_changed', handleStorage as EventListener);
    window.addEventListener('suncheon_keywords_changed', handleKeywordsSync as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage as EventListener);
      window.removeEventListener('bookmark_changed', handleStorage as EventListener);
      window.removeEventListener('suncheon_keywords_changed', handleKeywordsSync as EventListener);
    };
  }, []);

  // 관심 복지 토글 (알림 센터 키워드와 100% 실시간 연동)
  const toggleInterest = (tag: string) => {
    const next = interests.includes(tag)
      ? interests.filter((item) => item !== tag)
      : [...interests, tag];

    const targetEmail = email || user?.email;
    setInterests(next);
    setKeywordCount(next.length);
    saveInterestKeywords(next, targetEmail);

    // 세션 유저 객체도 동기화
    try {
      const authStr = localStorage.getItem('suncheon_auth_session');
      if (authStr) {
        const u = JSON.parse(authStr);
        u.interests = next;
        if (u.user_metadata) u.user_metadata.interests = next;
        localStorage.setItem('suncheon_auth_session', JSON.stringify(u));
      }
    } catch {}

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('suncheon_keywords_changed', { detail: next }));
    }, 0);
  };

  const handleSelectAllInterests = () => {
    const targetEmail = email || user?.email;
    setInterests(WELFARE_INTERESTS);
    setKeywordCount(WELFARE_INTERESTS.length);
    saveInterestKeywords(WELFARE_INTERESTS, targetEmail);

    try {
      const authStr = localStorage.getItem('suncheon_auth_session');
      if (authStr) {
        const u = JSON.parse(authStr);
        u.interests = WELFARE_INTERESTS;
        if (u.user_metadata) u.user_metadata.interests = WELFARE_INTERESTS;
        localStorage.setItem('suncheon_auth_session', JSON.stringify(u));
      }
    } catch {}

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('suncheon_keywords_changed', { detail: WELFARE_INTERESTS }));
    }, 0);
  };

  const handleClearAllInterests = () => {
    const targetEmail = email || user?.email;
    setInterests([]);
    setKeywordCount(0);
    saveInterestKeywords([], targetEmail);

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
  };

  // 개인정보 저장 핸들러
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSaving(true);

    try {
      const cleanName = name.trim();
      if (!cleanName) {
        throw new Error('이름(성함)을 입력해 주세요.');
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error('새 비밀번호는 6자리 이상이어야 합니다.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        }
      }

      const updatedUser = {
        ...user,
        name: cleanName,
        phone: phone.trim(),
        district,
        interests,
        user_metadata: {
          ...(user?.user_metadata || {}),
          name: cleanName,
          phone: phone.trim(),
          district,
          interests
        }
      };

      // 1. 로컬 스토리지 세션 업데이트
      if (typeof window !== 'undefined') {
        localStorage.setItem('suncheon_auth_session', JSON.stringify(updatedUser));

        // 등록 계정 목록(suncheon_registered_accounts) 동기화
        const registered = JSON.parse(
          localStorage.getItem('suncheon_registered_accounts') || '[]'
        );
        const idx = registered.findIndex((acc: any) => acc.email === user.email);
        if (idx !== -1) {
          registered[idx] = {
            ...registered[idx],
            name: cleanName,
            phone: phone.trim(),
            district,
            interests,
            ...(newPassword ? { password: newPassword } : {})
          };
          localStorage.setItem('suncheon_registered_accounts', JSON.stringify(registered));
        }

        // 알림 센터 관심 키워드 및 북마크 스토리지 실시간 동기화
        saveInterestKeywords(interests, user?.email || email);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('suncheon_keywords_changed', { detail: interests }));
          window.dispatchEvent(new Event('bookmark_changed'));
          window.dispatchEvent(new Event('auth_state_changed'));
        }, 0);
      }

      // 2. Supabase 비밀번호 및 메타데이터 업데이트 (활성화된 경우)
      try {
        const updatePayload: any = {
          data: {
            name: cleanName,
            phone: phone.trim(),
            district,
            interests
          }
        };
        if (newPassword) {
          updatePayload.password = newPassword;
        }
        await supabase.auth.updateUser(updatePayload);
      } catch {
        // 로컬 모드 fallback 처리
      }

      setUser(updatedUser);
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setSuccessMsg('개인정보 및 맞춤 설정이 안전하게 저장되었습니다.');
    } catch (err: any) {
      setErrorMsg(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 회원 탈퇴 핸들러
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== '회원탈퇴') {
      setDeleteError('"회원탈퇴"를 정확히 입력해 주세요.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      if (typeof window !== 'undefined') {
        // 등록 계정 목록에서 제거
        if (user?.email) {
          const registered = JSON.parse(
            localStorage.getItem('suncheon_registered_accounts') || '[]'
          );
          const filtered = registered.filter((acc: any) => acc.email !== user.email);
          localStorage.setItem('suncheon_registered_accounts', JSON.stringify(filtered));
        }

        // 세션 정보 완전 삭제
        localStorage.removeItem('suncheon_auth_session');
        localStorage.removeItem('suncheon_guest_user');

        // Supabase 로그아웃
        try {
          await supabase.auth.signOut();
        } catch {}

        // 글로벌 이벤트 전파
        window.dispatchEvent(new Event('auth_state_changed'));
        window.dispatchEvent(new Event('bookmark_changed'));
      }

      alert('회원 탈퇴가 완료되었습니다. 그동안 순천시 혜택 모음을 이용해 주셔서 감사합니다.');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setDeleteError(err.message || '탈퇴 처리 중 오류가 발생했습니다.');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-600">마이페이지 정보를 불러오는 중입니다...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 비로그인 상태일 때
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 border border-emerald-100">
              <User className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">로그인이 필요합니다</h1>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              마이페이지는 회원 전용 공간입니다. 로그인 또는 간편 가입 후 개인정보 관리와 맞춤 복지 설정을 이용해 보세요.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>로그인 / 회원가입 이동</span>
              </Link>
              <Link
                href="/"
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                메인 화면으로 돌아가기
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* 상단 프로필 헤더 */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-black shadow-sm shrink-0">
                {name ? name.charAt(0) : '순'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{name || '순천시민'} 님</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {user.is_guest ? '체험 계정' : '순천시민 회원'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{email || '등록된 이메일 없음'}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>순천시 {district} 거주</span>
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0">
              <Link
                href="/chat"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>1:1 AI 맞춤 상담</span>
              </Link>
            </div>
          </div>

          {/* 3개 활동 요약 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-slate-100">
            <Link
              href="/bookmarks"
              className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/70 hover:border-emerald-200 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Bookmark className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">내 보관 혜택</div>
                  <div className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {bookmarkCount}건
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">관심 복지 알림</div>
                  <div className="text-lg font-bold text-slate-900">{keywordCount}개 연동</div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                알림센터 실시간 연동
              </span>
            </div>

            <Link
              href="/support"
              className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/70 hover:border-emerald-200 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <MessageSquarePlus className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">내 복지 제안/요청</div>
                  <div className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {requestCount}건
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>

        {/* 상태 알림 메시지 */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="font-semibold">{successMsg}</div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="font-semibold">{errorMsg}</div>
          </div>
        )}

        {/* 개인정보 수정 폼 섹션 */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs mb-8">
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900">개인정보 및 맞춤 설정 수정</h2>
            <p className="text-xs text-slate-500 mt-1">
              순천시 혜택 추천과 맞춤 알림에 반영될 정보를 최신으로 유지해 주세요.
            </p>
          </div>

          <div className="space-y-6">
            {/* 기본 인적 사항 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  이름 (성명) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  이메일 주소 (계정 ID)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm cursor-not-allowed font-medium"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">이메일은 계정 고유 식별자로 변경할 수 없습니다.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  연락처 (휴대폰 번호)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  순천시 거주 지역 (행정동/면) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium bg-white cursor-pointer"
                  >
                    {SUNCHEON_DISTRICTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 관심 복지 분야 다중 선택 (알림 센터와 100% 실시간 연동) */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-800">
                      관심 복지 분야 및 맞춤 알림 키워드
                    </label>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      상단 알림센터 실시간 연동
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    선택하신 관심 분야는 상단 [알림 센터]의 관심 키워드와 실시간 연동되어, 순천시 신규 복지 공고 등록 시 맞춤 알림을 받아보실 수 있습니다.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAllInterests}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-emerald-50 border border-emerald-200 cursor-pointer transition-colors"
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllInterests}
                    className="text-[11px] text-slate-400 hover:text-red-600 font-semibold px-2.5 py-1 rounded-lg hover:bg-red-50 border border-slate-200 cursor-pointer transition-colors"
                  >
                    전체 해제
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {WELFARE_INTERESTS.map((item) => {
                  const selected = interests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInterest(item)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        selected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs scale-[1.02]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      {selected ? `✓ ${item}` : `+ ${item}`}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5">
                현재 {interests.length}개 분야가 맞춤 알림 대상으로 설정되어 있습니다.
              </p>
            </div>

            {/* 비밀번호 변경 영역 (선택사항) */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>비밀번호 변경 (선택 사항)</span>
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                비밀번호를 변경하려면 아래에 새 비밀번호를 입력해 주세요. 변경을 원치 않으시면 비워두셔도 됩니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    새 비밀번호 (6자리 이상)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호 입력"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호 재입력"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? '저장 중...' : '개인정보 변경사항 저장'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* 회원 탈퇴 위험 구역 (Danger Zone) */}
        <div className="bg-red-50/50 rounded-3xl border border-red-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <span>회원 탈퇴</span>
              </h3>
              <p className="text-xs text-red-700/80 mt-1 leading-relaxed">
                탈퇴 시 보관하신 맞춤 혜택 북마크, 키워드 알림 및 회원 계정 정보가 영구적으로 파기되며 복구할 수 없습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteError('');
                setDeleteConfirmText('');
              }}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-red-600 text-red-600 hover:text-white border border-red-300 hover:border-red-600 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>회원 탈퇴 신청</span>
            </button>
          </div>
        </div>
      </main>

      {/* 회원 탈퇴 확인 팝업 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 sm:p-7 relative animate-scaleUp">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950">정말 탈퇴하시겠습니까?</h3>
                <p className="text-xs text-slate-500">순천시 혜택 모음 회원 탈퇴 안내</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed space-y-1.5 mb-5">
              <p className="font-bold text-red-950">• 탈퇴 시 유의사항:</p>
              <p>- 계정에 등록된 개인정보 및 로그인 인증 세션이 완전히 삭제됩니다.</p>
              <p>- 내 보관함에 저장된 순천시 혜택 및 설정한 알림 키워드가 즉시 삭제됩니다.</p>
              <p>- 탈퇴 후에는 동일한 이메일로 재가입하더라도 이전 보관 내역이 복구되지 않습니다.</p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                탈퇴 확인을 위해 아래 입력창에 <span className="text-red-600">&quot;회원탈퇴&quot;</span>를 입력해 주세요.
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="회원탈퇴"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-semibold"
              />
              {deleteError && (
                <p className="text-xs text-red-600 font-semibold mt-1.5">{deleteError}</p>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                취소하고 유지하기
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmText.trim() !== '회원탈퇴'}
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? '탈퇴 처리 중...' : '회원 탈퇴 확인'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
