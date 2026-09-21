'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, ExternalLink, Layers, Tag, Calendar, X, Compass, Sparkles, ChevronLeft, ChevronRight, Bookmark, Bot } from 'lucide-react';
import { CrawledItem } from '@/lib/crawler';
import { ApplicablePolicy } from '@/lib/api';
import { Gov24Item } from './SupportSection';
import { supabase } from '@/lib/supabase';
import AiSummaryModal from '@/components/AiSummaryModal';
import { AiSummaryResult } from '@/lib/summarizer';

interface PolicySectionProps {
  initialWelfare: CrawledItem[];
  applicablePolicies?: ApplicablePolicy[];
  gov24Items?: Gov24Item[];
}

const ITEMS_PER_PAGE = 18;

export interface UnifiedPolicy {
  id: string;
  title: string;
  scope: 'suncheon' | 'jeonnam' | 'national' | 'youth';
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

function inferCategories(text: string): string[] {
  const result: string[] = [];
  if (text.includes('청년') || text.includes('대학생') || text.includes('청소년')) result.push('청년·청소년');
  if (text.includes('건강') || text.includes('의료') || text.includes('보건') || text.includes('치료')) result.push('보건·의료');
  if (text.includes('주거') || text.includes('전세') || text.includes('월세') || text.includes('임대') || text.includes('주택')) result.push('주거·자립');
  if (text.includes('일자리') || text.includes('취업') || text.includes('창업') || text.includes('인턴') || text.includes('기업') || text.includes('고용')) result.push('일자리·창업');
  if (text.includes('출산') || text.includes('임산부') || text.includes('영유아') || text.includes('난임')) result.push('임신·출산');
  if (text.includes('보육') || text.includes('교육') || text.includes('장학') || text.includes('학생') || text.includes('어린이')) result.push('보육·교육');
  if (text.includes('생활') || text.includes('생계') || text.includes('지원금') || text.includes('수당') || text.includes('안정')) result.push('생활안정');
  if (text.includes('농업') || text.includes('축산') || text.includes('농가') || text.includes('원예') || text.includes('과수') || text.includes('귀농') || text.includes('어촌')) result.push('농림축산어업');
  if (text.includes('안전') || text.includes('보험') || text.includes('재난') || text.includes('상품권')) result.push('행정·안전');
  if (text.includes('문화') || text.includes('예술') || text.includes('체육') || text.includes('공연') || text.includes('전시')) result.push('문화·체육');
  if (text.includes('돌봄') || text.includes('장애인') || text.includes('양로') || text.includes('어르신')) result.push('보호·돌봄');

  if (result.length === 0) {
    result.push('생활안정');
  }
  return result;
}

export default function PolicySection({
  initialWelfare,
  applicablePolicies = [],
  gov24Items = []
}: PolicySectionProps) {
  const [selectedScope, setSelectedScope] = useState<'all' | 'suncheon' | 'youth' | 'jeonnam' | 'national' | 'saved'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'name'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeModalPolicy, setActiveModalPolicy] = useState<UnifiedPolicy | null>(null);
  const [summaries, setSummaries] = useState<Record<string, AiSummaryResult>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});
  const [savedPolicyIds, setSavedPolicyIds] = useState<string[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Sync saved policies from Supabase DB
  const syncWithSupabaseDB = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('saved_policies')
        .select('policy_id')
        .eq('user_email', email);
      if (!error && data) {
        const dbIds = data.map((row: any) => row.policy_id);
        setSavedPolicyIds(prev => {
          const combined = Array.from(new Set([...prev, ...dbIds]));
          if (typeof window !== 'undefined') {
            localStorage.setItem('suncheon_saved_policies', JSON.stringify(combined));
          }
          return combined;
        });
      }
    } catch {
      // Ignore if table access error
    }
  };

  // Load saved policies from DB & localStorage and check URL query
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check local session
    let email: string | null = null;
    const authStr = localStorage.getItem('suncheon_auth_session') || localStorage.getItem('suncheon_guest_user');
    if (authStr) {
      try {
        const parsed = JSON.parse(authStr);
        if (parsed && typeof parsed.email === 'string' && parsed.email) {
          const userEmailStr: string = parsed.email;
          email = userEmailStr;
          setCurrentUserEmail(userEmailStr);
          syncWithSupabaseDB(userEmailStr);
        }
      } catch {}
    }

    if (!email) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setCurrentUserEmail(data.user.email);
          syncWithSupabaseDB(data.user.email);
        }
      });
    }

    // 2. Load from localStorage for immediate display
    try {
      const raw = localStorage.getItem('suncheon_saved_policies');
      if (raw) {
        setSavedPolicyIds(JSON.parse(raw));
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('scope') === 'saved' || params.get('tab') === 'saved') {
        setSelectedScope('saved');
      }
    } catch (err) {
      console.error('Failed to load saved policies:', err);
    }
  }, []);

  const toggleSavePolicy = async (policy: UnifiedPolicy) => {
    const id = policy.id;
    const wasSaved = savedPolicyIds.includes(id);
    const next = wasSaved ? savedPolicyIds.filter(item => item !== id) : [...savedPolicyIds, id];
    setSavedPolicyIds(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('suncheon_saved_policies', JSON.stringify(next));
      window.dispatchEvent(new Event('bookmark_changed'));
    }

    showToast(wasSaved ? '보관함에서 삭제되었습니다.' : '혜택 보관함에 저장되었습니다.');

    // Sync to Supabase DB if logged in
    const targetEmail = currentUserEmail || 'guest@suncheon.kr';
    try {
      if (wasSaved) {
        await supabase
          .from('saved_policies')
          .delete()
          .match({ user_email: targetEmail, policy_id: id });
      } else {
        await supabase
          .from('saved_policies')
          .upsert({
            user_email: targetEmail,
            policy_id: id,
            policy_title: policy.title,
            policy_org: policy.org,
            policy_data: {
              dept: policy.dept,
              target: policy.target,
              scope: policy.scope,
              url: policy.url,
              deadline: policy.postedAt
            }
          }, { onConflict: 'user_email,policy_id' });
      }
    } catch (err) {
      console.warn('DB bookmark sync skipped:', err);
    }
  };

  const isSaved = (id: string) => savedPolicyIds.includes(id);

  const handleOpenSummary = async (p: UnifiedPolicy) => {
    setActiveModalPolicy(p);
    const itemKey = p.id;

    if (summaries[itemKey] || loadingSummaries[itemKey]) {
      return;
    }

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

  const handleOpenChat = (p: UnifiedPolicy) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('open_ai_chat', {
          detail: {
            initialQuery: `${p.title} 혜택에 대해 1:1 상담받고 싶어요. 지원 요건과 필요 구비서류, 신청 방법을 자세히 알려주세요.`,
            autoSend: true,
            policy: p
          }
        })
      );
    }
  };

  // Convert raw data into unified Policy items
  const policies = useMemo(() => {
    const list: UnifiedPolicy[] = [];
    const seenIds = new Set<string>();

    // 1. Crawled welfare items (Suncheon City Hall, Youth Center, Culture Foundation)
    initialWelfare.forEach((item) => {
      const isYouth = item.source?.includes('청년') || item.title?.includes('청년');
      const textToScan = `${item.title} ${item.dept || ''} ${item.reason || ''}`;
      const id = item.id;
      seenIds.add(id);

      list.push({
        id,
        title: item.title,
        scope: isYouth ? 'youth' : 'suncheon',
        scopeLabel: isYouth ? '청년 맞춤' : '순천시',
        org: item.source || '순천시청',
        dept: item.dept || '순천시',
        categories: inferCategories(textToScan),
        target: item.dept ? `${item.dept} 공고 요건 대상자` : '순천시민 및 관내 요건 충족자',
        description: item.reason || '',
        deadline: null,
        postedAt: item.date || '상시',
        url: item.link || '#',
      });
    });

    // 2. Applicable Policies (Suncheon, Jeonnam, Youth, Central Government)
    if (applicablePolicies.length > 0) {
      applicablePolicies.forEach((item) => {
        if (seenIds.has(item.id)) return;
        seenIds.add(item.id);

        const textToScan = `${item.title} ${item.description || ''} ${item.category || ''}`;
        const rawCat = item.category || '';
        const cats = rawCat ? [rawCat.trim()] : inferCategories(textToScan);

        list.push({
          id: item.id,
          title: item.title,
          scope: item.scope,
          scopeLabel: item.scopeLabel,
          org: item.org,
          dept: item.dept,
          categories: cats,
          target: item.target,
          description: item.description,
          deadline: item.deadline,
          postedAt: item.deadline || '상시접수',
          url: item.url,
        });
      });
    } else if (gov24Items.length > 0) {
      // Fallback for legacy gov24Items
      gov24Items.forEach((item, idx) => {
        const title = (item.서비스명 || item.svcNm || '순천시 지원 정책') as string;
        const summary = (item.서비스목적요약 || item.지원내용 || '') as string;
        const textToScan = `${title} ${summary} ${item.서비스분야 || ''}`;
        const rawCat = (item.서비스분야 as string) || '';
        const cats = rawCat ? [rawCat.trim()] : inferCategories(textToScan);
        const org = (item.소관기관명 as string) || '순천시';
        const isYouth = title.includes('청년');

        let cleanOrg = org || '대한민국 정부';
        if (org.includes('순천')) {
          cleanOrg = '순천시';
        } else if (org.includes('전남광주통합특별시') || org.includes('전라남도') || org.includes('전남')) {
          cleanOrg = '전라남도';
        }

        list.push({
          id: `gov24-${idx}`,
          title,
          scope: isYouth ? 'youth' : 'suncheon',
          scopeLabel: isYouth ? '청년 맞춤' : '순천시',
          org: cleanOrg,
          dept: (item.부서명 as string) || cleanOrg,
          categories: cats,
          target: (item.지원대상 as string) || summary || '순천시민 요건 충족자',
          description: summary,
          deadline: (item.신청기한 as string) || null,
          postedAt: (item.신청기한 as string) || '상시접수',
          url: (item.상세조회URL as string) || '#',
        });
      });
    }

    return list;
  }, [initialWelfare, applicablePolicies, gov24Items]);

  // Compute counts for scope tabs
  const scopeCounts = useMemo(() => {
    return {
      all: policies.length,
      suncheon: policies.filter(p => p.scope === 'suncheon').length,
      youth: policies.filter(p => p.scope === 'youth').length,
      jeonnam: policies.filter(p => p.scope === 'jeonnam').length,
      national: policies.filter(p => p.scope === 'national').length,
      saved: savedPolicyIds.length,
    };
  }, [policies, savedPolicyIds]);

  // Compute ONLY categories that actually exist in the data (count > 0)
  const availableCategories = useMemo(() => {
    const map = new Map<string, number>();
    policies.forEach(p => {
      // If scope is selected, count only within selected scope
      if (selectedScope === 'saved') {
        if (!savedPolicyIds.includes(p.id)) return;
      } else if (selectedScope !== 'all' && p.scope !== selectedScope) {
        return;
      }
      p.categories.forEach(c => {
        if (c && c.trim()) {
          map.set(c, (map.get(c) || 0) + 1);
        }
      });
    });

    return Array.from(map.entries())
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
  }, [policies, selectedScope, savedPolicyIds]);

  // Compute organizations that have policies in selected scope
  const availableOrgs = useMemo(() => {
    const map = new Map<string, number>();
    policies.forEach(p => {
      if (selectedScope === 'saved') {
        if (!savedPolicyIds.includes(p.id)) return;
      } else if (selectedScope !== 'all' && p.scope !== selectedScope) {
        return;
      }
      if (p.org) {
        map.set(p.org, (map.get(p.org) || 0) + 1);
      }
    });

    const orgList = Array.from(map.entries())
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15) // Top 15 agencies
      .map(([org, count]) => ({ label: org, value: org, count }));

    const totalCount = policies.filter(p => {
      if (selectedScope === 'saved') return savedPolicyIds.includes(p.id);
      return selectedScope === 'all' || p.scope === selectedScope;
    }).length;

    return [
      { label: '전체 기관', value: 'all', count: totalCount },
      ...orgList
    ];
  }, [policies, selectedScope, savedPolicyIds]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSelectedScope('all');
    setSelectedCategories([]);
    setSelectedOrg('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const filteredPolicies = useMemo(() => {
    const result = policies.filter(p => {
      const matchesScope = selectedScope === 'all'
        ? true
        : selectedScope === 'saved'
        ? savedPolicyIds.includes(p.id)
        : p.scope === selectedScope;
      const matchesCategory = selectedCategories.length === 0 ||
        selectedCategories.some(c => p.categories.includes(c));
      const matchesOrg = selectedOrg === 'all' || p.org === selectedOrg;
      const lowerQ = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        p.title.toLowerCase().includes(lowerQ) ||
        p.org.toLowerCase().includes(lowerQ) ||
        p.dept.toLowerCase().includes(lowerQ) ||
        p.target.toLowerCase().includes(lowerQ) ||
        p.description.toLowerCase().includes(lowerQ);

      return matchesScope && matchesCategory && matchesOrg && matchesSearch;
    });

    if (sortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      result.sort((a, b) => (b.postedAt || '').localeCompare(a.postedAt || ''));
    }

    return result;
  }, [policies, selectedScope, selectedCategories, selectedOrg, searchQuery, sortBy, savedPolicyIds]);

  const totalPages = Math.ceil(filteredPolicies.length / ITEMS_PER_PAGE) || 1;

  const paginatedPolicies = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPolicies.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPolicies, currentPage]);

  const getScopeBadgeStyle = (scope: string) => {
    switch (scope) {
      case 'youth':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'suncheon':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'jeonnam':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'national':
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <div className="w-full text-slate-800">
      {/* Hero Header */}
      <div className="mb-8 text-center py-10 bg-white rounded-3xl shadow-xs border border-emerald-100">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          순천시민 신청 가능 공공 혜택 종합 포털
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-slate-900">
          순천시 <span className="text-emerald-600">복지보기</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto px-4 leading-relaxed">
          순천시청 자체 사업부터 청년 맞춤 정책, 전남광역 지원 및 중앙부처 전국민 혜택까지 순천시민이 누릴 수 있는 모든 복지 혜택을 한곳에서 확인하세요.
        </p>
      </div>

      {/* Scope Navigation Tabs (순천시 / 청년 / 전남광역 / 전국·중앙부처) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: '전체 혜택', count: scopeCounts.all },
            { id: 'suncheon', label: '순천시 자체 혜택', count: scopeCounts.suncheon },
            { id: 'youth', label: '순천 청년 맞춤 혜택', count: scopeCounts.youth },
            { id: 'jeonnam', label: '전남광역 혜택', count: scopeCounts.jeonnam },
            { id: 'national', label: '전국·중앙부처 혜택', count: scopeCounts.national },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedScope(tab.id as any);
                setSelectedOrg('all');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                selectedScope === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                selectedScope === tab.id
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-900">정책 분야 선택</span>
            <span className="text-xs text-slate-400 hidden sm:inline">(현재 등록된 정책 분야만 표시됩니다)</span>
          </div>
          {selectedCategories.length > 0 && (
            <button
              onClick={() => setSelectedCategories([])}
              className="text-xs text-slate-500 hover:text-emerald-700 underline font-medium"
            >
              분야 선택 해제
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {availableCategories.map(cat => {
            const isSelected = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Agency Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Organization filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {availableOrgs.slice(0, 8).map(o => (
              <button
                key={o.value}
                onClick={() => {
                  setSelectedOrg(o.value);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border whitespace-nowrap ${
                  selectedOrg === o.value
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {o.label} ({o.count})
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="정책명, 대상, 내용 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Result Status Bar */}
      <div className="flex items-center justify-between mb-4 px-1 text-xs sm:text-sm text-slate-500">
        <div>
          총 <strong className="text-emerald-700 font-bold">{filteredPolicies.length}</strong>건의 지원 정책 (20개씩 보기)
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs focus:outline-none cursor-pointer"
          >
            <option value="latest">최신순</option>
            <option value="name">가나다순</option>
          </select>
        </div>
      </div>

      {/* Active filter badges */}
      {(selectedCategories.length > 0 || selectedOrg !== 'all' || searchQuery || selectedScope !== 'all') && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {selectedScope !== 'all' && (
            <button
              onClick={() => setSelectedScope('all')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-200"
            >
              {selectedScope === 'suncheon' ? '순천시' : selectedScope === 'youth' ? '청년맞춤' : selectedScope === 'jeonnam' ? '전남광역' : '전국·중앙부처'} <X className="w-3 h-3" />
            </button>
          )}
          {selectedCategories.map(c => (
            <button
              key={c}
              onClick={() => toggleCategory(c)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs hover:bg-emerald-100"
            >
              {c} <X className="w-3 h-3" />
            </button>
          ))}
          {selectedOrg !== 'all' && (
            <button
              onClick={() => setSelectedOrg('all')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs hover:bg-emerald-100"
            >
              {selectedOrg} <X className="w-3 h-3" />
            </button>
          )}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs hover:bg-emerald-100"
            >
              "{searchQuery}" <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Policy Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedPolicies.length > 0 ? (
          paginatedPolicies.map((p, idx) => (
            <div
              key={`policy-${p.id || idx}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${getScopeBadgeStyle(p.scope)}`}>
                      {p.scopeLabel}
                    </span>
                    <span 
                      title={p.org}
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 max-w-[200px] truncate shrink-0"
                    >
                      {p.org}
                    </span>
                  </div>
                  {p.categories.length > 0 && (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 shrink-0">
                      {p.categories[0]}
                      {p.categories.length > 1 && ` 외 ${p.categories.length - 1}`}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mb-3">
                  {p.title}
                </h3>

                <div className="mb-4 text-xs rounded-xl p-3 bg-slate-50 border border-slate-100 text-slate-600 leading-relaxed flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-slate-800 shrink-0">대상:</span>
                    <span className="line-clamp-2 text-slate-600">{p.target}</span>
                  </div>
                  {p.description && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-slate-800 shrink-0">내용:</span>
                      <span className="line-clamp-2 text-slate-500">{p.description}</span>
                    </div>
                  )}
                  {/* 신청기한 */}
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-700 shrink-0">신청기한:</span>
                    <span className="truncate text-slate-600 font-medium" title={p.postedAt || '상시접수'}>
                      {p.postedAt || '상시접수'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 하단 액션 바: [AI 요약] + [AI 상담] + [보관함] (좌측) / [상세보기 ↗] (우측) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs mt-auto">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleOpenSummary(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 cursor-pointer"
                    title="핵심 3줄 요약 및 필수 구비서류 확인"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI 요약</span>
                  </button>

                  <button
                    onClick={() => handleOpenChat(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 cursor-pointer"
                    title="이 복지 혜택으로 1:1 AI 맞춤 상담 시작"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>AI 상담</span>
                  </button>

                  <button
                    onClick={() => toggleSavePolicy(p)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                      isSaved(p.id)
                        ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                    }`}
                    title={isSaved(p.id) ? '보관함에서 삭제' : '보관함에 담기'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved(p.id) ? 'fill-current' : ''}`} />
                    <span>{isSaved(p.id) ? '보관됨' : '보관'}</span>
                  </button>
                </div>

                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-800 hover:underline shrink-0 text-xs py-1.5"
                >
                  상세보기
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <Bookmark className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-medium text-slate-600 mb-1">
              {selectedScope === 'saved'
                ? '보관함에 저장된 혜택이 아직 없습니다.'
                : '선택한 분야 또는 검색어에 일치하는 정책이 없습니다.'}
            </p>
            <p className="text-xs text-slate-400 mb-4">
              {selectedScope === 'saved'
                ? '마음에 드는 혜택 카드의 [보관] 버튼을 누르면 언제든 여기서 모아볼 수 있습니다.'
                : '조건을 변경하거나 필터를 초기화해 보세요.'}
            </p>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-xs cursor-pointer"
            >
              {selectedScope === 'saved' ? '전체 혜택 둘러보기' : '필터 초기화'}
            </button>
          </div>
        )}
      </div>

      {/* Pagination Controls (20 per page) */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-200">
          <div className="text-xs sm:text-sm text-slate-500">
            총 <strong className="text-emerald-700 font-bold">{filteredPolicies.length}</strong>건 중 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredPolicies.length)}건 표시 (페이지 {currentPage} / {totalPages})
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 transition-all text-xs font-semibold cursor-pointer disabled:cursor-not-allowed"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 transition-all text-xs font-semibold cursor-pointer disabled:cursor-not-allowed"
              aria-label="다음 페이지"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* AI Summary Popup Modal */}
      {activeModalPolicy && (
        <AiSummaryModal
          isOpen={Boolean(activeModalPolicy)}
          onClose={() => setActiveModalPolicy(null)}
          title={activeModalPolicy.title}
          source={activeModalPolicy.org}
          dept={activeModalPolicy.dept}
          url={activeModalPolicy.url}
          summary={summaries[activeModalPolicy.id] || null}
          isLoading={Boolean(loadingSummaries[activeModalPolicy.id])}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/90 text-white text-xs sm:text-sm font-semibold shadow-xl backdrop-blur-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Bookmark className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
