'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AiSummaryModal from '@/components/AiSummaryModal';
import AiLoadingCanvas from '@/components/AiLoadingCanvas';
import { AiSummaryResult } from '@/lib/summarizer';
import { supabase } from '@/lib/supabase';
import {
  Sparkles,
  Search,
  CheckCircle2,
  Bookmark,
  ExternalLink,
  Calendar,
  Building2,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Clock,
  Layers,
  Bell
} from 'lucide-react';

interface MatchedPolicy {
  id: string;
  title: string;
  category: string;
  org: string;
  dept: string;
  target: string;
  description: string;
  url: string;
  deadline: string | null;
  scopeLabel: string;
  matchReason: string;
  relevanceScore: number;
}

interface MatchedNotice {
  id: string;
  title: string;
  link: string;
  source: string;
  dept?: string;
  date: string;
  views?: string;
  matchReason: string;
  relevanceScore: number;
}

interface MatchResult {
  userSituationSummary: string;
  aiAdvice: string;
  actionTips: string[];
  matchedPolicies: MatchedPolicy[];
  matchedNotices: MatchedNotice[];
}

const PRESET_QUERIES = [
  { label: '20대 순천 대학생 주거·장학금', query: '순천에 거주하는 20대 대학생인데 월세 지원이나 학자금 장학금 혜택이 있을까요?' },
  { label: '청년 창업 및 사업화 지원', query: '순천에서 창업을 준비 중인 2030 청년입니다. 사업화 지원금이나 공유 오피스 공간 지원을 찾고 있어요.' },
  { label: '신혼부부 전세대출 및 정착금', query: '순천에 새로 보금자리를 마련한 신혼부부입니다. 주택 대출이자 지원이나 결혼축하금 혜택이 궁금합니다.' },
  { label: '문화예술인 창작 및 전시 지원', query: '순천에서 활동 중인 청년 예술인입니다. 창작 활동 지원금이나 전시·공연 기회가 있나요?' },
  { label: '취업준비생 자격증 및 구직', query: '순천에 사는 20대 취업준비생입니다. 자격증 시험 응시료 지원이나 면접 정장 대여, 구직 수당이 궁금해요.' },
  { label: '영유아 양육 및 다자녀 가정', query: '순천에서 어린 자녀를 키우고 있는 가정입니다. 아동 양육 수당이나 다자녀 복지 혜택을 알고 싶어요.' }
];

export default function CustomSearchPage() {
  const [situationText, setSituationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Bookmarks
  const [savedPolicyIds, setSavedPolicyIds] = useState<string[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Summary Modal for Policies and Notices
  const [activePolicyModal, setActivePolicyModal] = useState<MatchedPolicy | null>(null);
  const [activeNoticeModal, setActiveNoticeModal] = useState<MatchedNotice | null>(null);
  const [summaries, setSummaries] = useState<Record<string, AiSummaryResult>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Sync saved policies
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem('suncheon_saved_policies');
      if (raw) setSavedPolicyIds(JSON.parse(raw));

      const authStr = localStorage.getItem('suncheon_auth_session') || localStorage.getItem('suncheon_guest_user');
      if (authStr) {
        const parsed = JSON.parse(authStr);
        if (parsed.email) setCurrentUserEmail(parsed.email);
      } else {
        supabase.auth.getUser().then(({ data }) => {
          if (data?.user?.email) setCurrentUserEmail(data.user.email);
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const toggleSavePolicy = async (policy: MatchedPolicy) => {
    const id = policy.id;
    const wasSaved = savedPolicyIds.includes(id);
    const next = wasSaved ? savedPolicyIds.filter(item => item !== id) : [...savedPolicyIds, id];
    setSavedPolicyIds(next);

    if (typeof window !== 'undefined') {
      localStorage.setItem('suncheon_saved_policies', JSON.stringify(next));
      window.dispatchEvent(new Event('bookmark_changed'));
    }

    showToast(wasSaved ? '보관함에서 삭제되었습니다.' : '내 보관함에 추가되었습니다.');

    const targetEmail = currentUserEmail || 'guest@suncheon.kr';
    try {
      if (wasSaved) {
        await supabase.from('saved_policies').delete().match({ user_email: targetEmail, policy_id: id });
      } else {
        await supabase.from('saved_policies').upsert({
          user_email: targetEmail,
          policy_id: id,
          policy_title: policy.title,
          policy_category: policy.category,
          policy_org: policy.org,
          policy_dept: policy.dept,
          policy_target: policy.target,
          policy_url: policy.url,
          policy_scope: policy.scopeLabel
        }, { onConflict: 'user_email,policy_id' });
      }
    } catch (err) {
      console.warn('Bookmark sync note:', err);
    }
  };

  const handleOpenPolicySummary = async (policy: MatchedPolicy) => {
    setActivePolicyModal(policy);
    const key = `policy-${policy.id}`;

    if (summaries[key] || loadingSummaries[key]) return;

    try {
      setLoadingSummaries(prev => ({ ...prev, [key]: true }));
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: policy.id || policy.title,
          title: policy.title,
          source: policy.org,
          dept: policy.dept,
          target: policy.target,
          description: policy.description,
          date: policy.deadline,
          url: policy.url,
          type: 'policy'
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.summary) {
          setSummaries(prev => ({ ...prev, [key]: json.summary }));
        }
      }
    } catch (err) {
      console.error('Failed to summarize policy:', err);
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleOpenNoticeSummary = async (notice: MatchedNotice) => {
    setActiveNoticeModal(notice);
    const key = `notice-${notice.id}`;

    if (summaries[key] || loadingSummaries[key]) return;

    try {
      setLoadingSummaries(prev => ({ ...prev, [key]: true }));
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notice.id || notice.title,
          title: notice.title,
          source: notice.source,
          dept: notice.dept,
          date: notice.date,
          url: notice.link,
          type: 'notice'
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.summary) {
          setSummaries(prev => ({ ...prev, [key]: json.summary }));
        }
      }
    } catch (err) {
      console.error('Failed to summarize notice:', err);
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSearch = async (queryText?: string) => {
    const textToSearch = (queryText || situationText).trim();
    if (!textToSearch) {
      showToast('상황이나 고민을 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    setLoadingStep(1);
    setHasSearched(true);
    setResult(null);

    // Step animations
    const stepTimer1 = setTimeout(() => setLoadingStep(2), 1200);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 2800);

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: textToSearch })
      });

      const data = await res.json();
      if (data.success) {
        setResult({
          userSituationSummary: data.userSituationSummary,
          aiAdvice: data.aiAdvice,
          actionTips: data.actionTips || [],
          matchedPolicies: data.matchedPolicies || [],
          matchedNotices: data.matchedNotices || []
        });
      } else {
        showToast(data.error || '맞춤 추천 검색에 실패했습니다.');
      }
    } catch (err) {
      console.error('Custom search failed:', err);
      showToast('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/40 via-white to-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-10 max-w-5xl">
        {/* Header Badge & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100/90 text-emerald-800 text-xs sm:text-sm font-bold shadow-2xs mb-4 border border-emerald-200">
            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>AI 맞춤 상황 분석 & 실시간 추천</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            내 상황에 딱 맞는 <span className="text-emerald-700 underline decoration-emerald-300 decoration-wavy underline-offset-4">순천시 혜택·공지</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            나이, 거주지, 직업, 현재 겪고 있는 고민을 편하게 입력하시면,<br className="hidden sm:inline" />
            AI가 순천시의 공공 지원 정책과 실시간 공지사항을 대조하여 가장 적합한 혜택을 찾아드립니다.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-3xl border-2 border-emerald-200/90 p-5 sm:p-7 shadow-lg shadow-emerald-500/5 mb-8 relative z-10 transition-all hover:border-emerald-400">
          <div className="relative">
            <textarea
              rows={3}
              value={situationText}
              onChange={e => setSituationText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="예: 순천에 거주 중인 25세 취업준비생입니다. 자격증 응시료 지원이나 면접 지원금, 청년 주거비 지원 정책이 있는지 알고 싶어요."
              className="w-full p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all resize-none leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>구체적으로 적어주실수록 AI가 더 정확한 자격 요건을 진단합니다.</span>
              </div>

              <button
                onClick={() => handleSearch()}
                disabled={isLoading || !situationText.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>AI 맞춤 분석 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>AI 맞춤 검색하기</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Situation Presets */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-500 mb-2.5 flex items-center gap-1.5">
              <span>자주 찾는 상황 키워드 (클릭 시 자동 검색):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUERIES.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSituationText(preset.query);
                    handleSearch(preset.query);
                  }}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 border border-slate-200/80 hover:border-emerald-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State Interactive Canvas API Experience */}
        {isLoading && (
          <AiLoadingCanvas loadingStep={loadingStep} />
        )}

        {/* Results View */}
        {!isLoading && result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
            {/* 1. AI Diagnostic & Advice Card (고대비 깔끔한 디자인 & 가독성 개선) */}
            <div className="bg-white rounded-3xl border-2 border-emerald-300 p-6 sm:p-8 text-slate-800 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-bold border border-emerald-200 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>AI 맞춤 분석 총평</span>
                </div>
              </div>

              {/* 진단된 상황 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 mb-5">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  진단된 상황
                </div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                  {result.userSituationSummary}
                </div>
              </div>

              {/* AI 조언 본문 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                {result.aiAdvice}
              </div>

              {/* 체크포인트 */}
              {result.actionTips && result.actionTips.length > 0 && (
                <div className="pt-5 border-t border-slate-200">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>신청 전 꼭 챙겨야 할 핵심 체크포인트</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.actionTips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2.5 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200 p-3.5 rounded-2xl text-xs sm:text-sm text-slate-800 font-medium leading-relaxed transition-colors">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Matched Policies Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    추천 지원 정책
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {result.matchedPolicies.length}건
                  </span>
                </div>
              </div>

              {result.matchedPolicies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.matchedPolicies.map(policy => {
                    const isSaved = savedPolicyIds.includes(policy.id);
                    return (
                      <div
                        key={policy.id}
                        className="bg-white rounded-3xl border border-slate-200 hover:border-emerald-400 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Match Score & Badges */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-extrabold shadow-2xs">
                              {policy.relevanceScore}% 일치
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {policy.scopeLabel || '순천시 혜택'}
                            </span>
                          </div>

                          {/* AI Match Reason Box (이모티콘 제거) */}
                          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-xs text-slate-800 font-medium mb-3 leading-relaxed">
                            <strong className="text-emerald-800 font-bold block mb-0.5">맞춤 추천 사유</strong>
                            {policy.matchReason}
                          </div>

                          {/* Policy Title */}
                          <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-emerald-700 transition-colors mb-2 leading-snug">
                            {policy.title}
                          </h3>

                          {/* Details */}
                          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                            {policy.description}
                          </p>

                          <div className="space-y-1 text-xs text-slate-400 mb-5">
                            {policy.target && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-600">대상:</span>
                                <span className="truncate">{policy.target}</span>
                              </div>
                            )}
                            {policy.deadline && (
                              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>신청 마감: {policy.deadline}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleSavePolicy(policy)}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                isSaved
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
                              <span>{isSaved ? '보관됨' : '보관'}</span>
                            </button>

                            <button
                              onClick={() => handleOpenPolicySummary(policy)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer shadow-2xs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>AI 3줄 요약</span>
                            </button>
                          </div>

                          {policy.url && policy.url !== '#' && (
                            <a
                              href={policy.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all"
                            >
                              <span>신청 바로가기</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
                  해당 조건과 일치하는 공공 지원 정책이 없습니다.
                </div>
              )}
            </div>

            {/* 3. Matched Notices Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    추천 실시간 공지사항
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {result.matchedNotices.length}건
                  </span>
                </div>
              </div>

              {result.matchedNotices.length > 0 ? (
                <div className="space-y-3">
                  {result.matchedNotices.map((notice, idx) => (
                    <div
                      key={notice.id || idx}
                      className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-600 text-white">
                            {notice.relevanceScore}% 일치
                          </span>
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">
                            {notice.source}
                          </span>
                          {notice.dept && (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs text-slate-500 bg-slate-50">
                              {notice.dept}
                            </span>
                          )}
                        </div>

                        {/* Notice Title */}
                        <a
                          href={notice.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mb-2"
                        >
                          {notice.title}
                        </a>

                        {/* Reason & Date */}
                        <p className="text-xs text-slate-800 font-medium mb-2 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 inline-block">
                          <span className="font-bold text-emerald-800 mr-1.5">추천 사유:</span>
                          {notice.matchReason}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {notice.date}
                          </span>
                        </div>
                      </div>

                      {/* Notice Actions */}
                      <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 shrink-0">
                        <button
                          onClick={() => handleOpenNoticeSummary(notice)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI 3줄 요약</span>
                        </button>

                        <a
                          href={notice.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                        >
                          <span>공고 원문</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
                  해당 조건과 일치하는 공지사항이 없습니다.
                </div>
              )}
            </div>

            {/* Re-search prompt */}
            <div className="text-center py-6">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <span>다른 상황으로 다시 검색하기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Initial Empty State Guide */}
        {!isLoading && !result && !hasSearched && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-10">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-lg mb-3">
                1
              </div>
              <h3 className="font-bold text-slate-900 mb-1.5">내 상황 자유롭게 입력</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                나이, 직업, 거주지, 주거 형태 등 현재 처한 상황이나 필요한 지원금을 일상 언어로 입력하세요.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-lg mb-3">
                2
              </div>
              <h3 className="font-bold text-slate-900 mb-1.5">AI 심층 매칭 분석</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Google Gemini AI가 순천시의 최신 지원 정책과 실시간 공지사항 150여 건을 비교 분석합니다.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-lg mb-3">
                3
              </div>
              <h3 className="font-bold text-slate-900 mb-1.5">맞춤 혜택 즉시 확인</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                가장 일치도가 높은 혜택과 공지사항, 놓치지 말아야 할 필수 신청 꿀팁을 한눈에 확인하세요.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Policy AI Summary Modal */}
      {activePolicyModal && (
        <AiSummaryModal
          isOpen={!!activePolicyModal}
          onClose={() => setActivePolicyModal(null)}
          title={activePolicyModal.title}
          source={activePolicyModal.org}
          dept={activePolicyModal.dept}
          url={activePolicyModal.url}
          summary={summaries[`policy-${activePolicyModal.id}`] || null}
          isLoading={!!loadingSummaries[`policy-${activePolicyModal.id}`]}
        />
      )}

      {/* Notice AI Summary Modal */}
      {activeNoticeModal && (
        <AiSummaryModal
          isOpen={!!activeNoticeModal}
          onClose={() => setActiveNoticeModal(null)}
          title={activeNoticeModal.title}
          source={activeNoticeModal.source}
          dept={activeNoticeModal.dept}
          url={activeNoticeModal.link}
          summary={summaries[`notice-${activeNoticeModal.id}`] || null}
          isLoading={!!loadingSummaries[`notice-${activeNoticeModal.id}`]}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-slate-900/90 text-white text-xs sm:text-sm font-semibold shadow-xl backdrop-blur-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}
