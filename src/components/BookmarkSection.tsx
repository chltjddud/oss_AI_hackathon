'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Trash2,
  ExternalLink,
  Sparkles,
  Search,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AiSummaryModal from '@/components/AiSummaryModal';
import { AiSummaryResult } from '@/lib/summarizer';
import { ApplicablePolicy } from '@/lib/api';
import { CrawledItem } from '@/lib/crawler';

export interface UnifiedPolicy {
  id: string;
  title: string;
  scope: 'suncheon' | 'youth' | 'jeonnam' | 'national';
  scopeLabel: string;
  org: string;
  dept: string;
  categories: string[];
  target: string;
  description: string;
  deadline: string | null;
  postedAt: string;
  url: string;
}

interface BookmarkSectionProps {
  initialWelfare: CrawledItem[];
  applicablePolicies: ApplicablePolicy[];
}

export default function BookmarkSection({
  initialWelfare = [],
  applicablePolicies = []
}: BookmarkSectionProps) {
  const [savedPolicyIds, setSavedPolicyIds] = useState<string[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Summary Modal
  const [activeModalPolicy, setActiveModalPolicy] = useState<UnifiedPolicy | null>(null);
  const [summaries, setSummaries] = useState<Record<string, AiSummaryResult>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Convert raw data into unified list
  const allPoliciesMap = useMemo(() => {
    const map = new Map<string, UnifiedPolicy>();

    initialWelfare.forEach(item => {
      const isYouth = item.source?.includes('청년') || item.title?.includes('청년');
      map.set(item.id, {
        id: item.id,
        title: item.title,
        scope: isYouth ? 'youth' : 'suncheon',
        scopeLabel: isYouth ? '청년 맞춤' : '순천시',
        org: item.source || '순천시청',
        dept: item.dept || '순천시',
        categories: ['순천맞춤복지'],
        target: item.dept ? `${item.dept} 공고 요건 대상자` : '순천시민 및 관내 요건 충족자',
        description: item.reason || '',
        deadline: null,
        postedAt: item.date || '상시',
        url: item.link || '#'
      });
    });

    applicablePolicies.forEach(item => {
      if (!map.has(item.id)) {
        map.set(item.id, {
          id: item.id,
          title: item.title,
          scope: item.scope,
          scopeLabel: item.scopeLabel,
          org: item.org,
          dept: item.dept,
          categories: item.category ? [item.category] : ['공공복지'],
          target: item.target,
          description: item.description,
          deadline: item.deadline,
          postedAt: item.deadline || '상시접수',
          url: item.url
        });
      }
    });

    return map;
  }, [initialWelfare, applicablePolicies]);

  // Load saved policy IDs from localStorage and Supabase
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem('suncheon_saved_policies');
      if (raw) {
        setSavedPolicyIds(JSON.parse(raw));
      }

      // Check session
      const authStr = localStorage.getItem('suncheon_auth_session') || localStorage.getItem('suncheon_guest_user');
      let email: string | null = null;
      if (authStr) {
        try {
          const parsed = JSON.parse(authStr);
          email = parsed.email || null;
          setCurrentUserEmail(email);
        } catch {}
      }

      if (!email) {
        supabase.auth.getUser().then(({ data }) => {
          if (data?.user?.email) {
            email = data.user.email;
            setCurrentUserEmail(email);
          }
        });
      }

      // Sync from Supabase DB
      const targetEmail = email || currentUserEmail;
      if (targetEmail) {
        supabase
          .from('saved_policies')
          .select('policy_id')
          .eq('user_email', targetEmail)
          .then(({ data, error }) => {
            if (!error && data && data.length > 0) {
              const dbIds = data.map((d: any) => d.policy_id);
              setSavedPolicyIds(prev => {
                const merged = Array.from(new Set([...prev, ...dbIds]));
                localStorage.setItem('suncheon_saved_policies', JSON.stringify(merged));
                return merged;
              });
            }
          });
      }
    } catch (err) {
      console.error(err);
    }

    const handleBookmarkChanged = () => {
      try {
        const raw = localStorage.getItem('suncheon_saved_policies');
        if (raw) setSavedPolicyIds(JSON.parse(raw));
      } catch {}
    };

    window.addEventListener('bookmark_changed', handleBookmarkChanged);
    return () => window.removeEventListener('bookmark_changed', handleBookmarkChanged);
  }, []);

  const handleRemovePolicy = async (policyId: string) => {
    const next = savedPolicyIds.filter(id => id !== policyId);
    setSavedPolicyIds(next);

    if (typeof window !== 'undefined') {
      localStorage.setItem('suncheon_saved_policies', JSON.stringify(next));
      window.dispatchEvent(new Event('bookmark_changed'));
    }

    showToast('보관함에서 삭제되었습니다.');

    const targetEmail = currentUserEmail || 'guest@suncheon.kr';
    try {
      await supabase
        .from('saved_policies')
        .delete()
        .match({ user_email: targetEmail, policy_id: policyId });
    } catch (err) {
      console.warn('Delete from Supabase skipped:', err);
    }
  };

  const handleOpenSummary = async (p: UnifiedPolicy) => {
    setActiveModalPolicy(p);
    const itemKey = p.id;

    if (summaries[itemKey] || loadingSummaries[itemKey]) return;

    try {
      setLoadingSummaries(prev => ({ ...prev, [itemKey]: true }));
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: p.id,
          title: p.title,
          source: p.org,
          dept: p.dept,
          target: p.target,
          description: p.description,
          date: p.postedAt,
          url: p.url,
          type: 'policy'
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.summary) {
          setSummaries(prev => ({ ...prev, [itemKey]: json.summary }));
        }
      }
    } catch (err) {
      console.error('Failed to summarize policy:', err);
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  // Filtered saved policies
  const savedPoliciesList = useMemo(() => {
    return savedPolicyIds
      .map(id => allPoliciesMap.get(id))
      .filter((item): item is UnifiedPolicy => item !== undefined);
  }, [savedPolicyIds, allPoliciesMap]);

  // Categories present in saved policies
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    savedPoliciesList.forEach(p => {
      p.categories.forEach(c => set.add(c));
    });
    return Array.from(set);
  }, [savedPoliciesList]);

  const filteredList = useMemo(() => {
    return savedPoliciesList.filter(p => {
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'all' || p.categories.includes(selectedCategory);

      return matchesSearch && matchesCat;
    });
  }, [savedPoliciesList, searchQuery, selectedCategory]);

  return (
    <div className="w-full text-slate-800">
      {/* Header Banner */}
      <div className="mb-8 text-center py-10 bg-white rounded-3xl shadow-xs border border-amber-200/80 relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-3 border border-amber-300/70">
          <Bookmark className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
          <span>관심 혜택 보관함</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-slate-900">
          내 <span className="text-amber-600">보관함</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto px-4 leading-relaxed">
          관심 있는 순천시 지원 정책과 혜택을 한곳에서 모아보고 언제든지 신청 일정을 확인하세요.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
          <span>총 보관된 정책:</span>
          <strong className="text-amber-700 font-bold">{savedPoliciesList.length}건</strong>
        </div>
      </div>

      {savedPoliciesList.length > 0 ? (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                전체 ({savedPoliciesList.length})
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search within saved */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="보관된 정책 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white"
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map(policy => (
              <div
                key={policy.id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-amber-300 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      {policy.scopeLabel}
                    </span>
                    {policy.categories.map(c => (
                      <span key={c} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        {c}
                      </span>
                    ))}
                  </div>

                  <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-amber-700 transition-colors mb-2 leading-snug">
                    {policy.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-3 mb-4 leading-relaxed">
                    {policy.description}
                  </p>

                  <div className="space-y-1 text-xs text-slate-500 mb-5">
                    {policy.target && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">대상:</span>
                        <span className="truncate">{policy.target}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{policy.org} {policy.dept && `· ${policy.dept}`}</span>
                    </div>
                    {policy.deadline && (
                      <div className="flex items-center gap-1.5 text-amber-800 font-medium pt-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>신청 기한: {policy.deadline}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRemovePolicy(policy.id)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 transition-all cursor-pointer"
                      title="보관함에서 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제</span>
                    </button>

                    <button
                      onClick={() => handleOpenSummary(policy)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 transition-all cursor-pointer"
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-2xs"
                    >
                      <span>신청 바로가기</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 sm:p-16 text-center shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Bookmark className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">
            보관함에 담긴 혜택이 아직 없습니다
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
            순천시 지원 정책 목록이나 AI 맞춤 검색에서 관심 있는 혜택의 '보관하기' 버튼을 눌러 모아보세요.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/policies"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>순천시 지원보기 둘러보기</span>
            </Link>

            <Link
              href="/custom-search"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>AI 맞춤 검색으로 찾기</span>
            </Link>
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      {activeModalPolicy && (
        <AiSummaryModal
          isOpen={!!activeModalPolicy}
          onClose={() => setActiveModalPolicy(null)}
          title={activeModalPolicy.title}
          source={activeModalPolicy.org}
          dept={activeModalPolicy.dept}
          url={activeModalPolicy.url}
          summary={summaries[activeModalPolicy.id] || null}
          isLoading={!!loadingSummaries[activeModalPolicy.id]}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-slate-900/90 text-white text-xs sm:text-sm font-semibold shadow-xl backdrop-blur-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
