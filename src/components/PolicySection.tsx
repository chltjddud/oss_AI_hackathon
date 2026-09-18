'use client';

import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, Layers, Building2, Bookmark, X, Calendar, Tag } from 'lucide-react';
import { CrawledItem } from '@/lib/crawler';
import { Gov24Item, Benefit } from './SupportSection';

interface PolicySectionProps {
  initialWelfare: CrawledItem[];
  gov24Items: Gov24Item[];
}

function inferCategories(text: string): string[] {
  const result: string[] = [];
  if (text.includes('건강') || text.includes('의료') || text.includes('보건') || text.includes('치료')) result.push('보건·의료');
  if (text.includes('주거') || text.includes('전세') || text.includes('월세') || text.includes('임대') || text.includes('주택')) result.push('주거·자립');
  if (text.includes('일자리') || text.includes('취업') || text.includes('창업') || text.includes('인턴') || text.includes('기업')) result.push('일자리·창업');
  if (text.includes('출산') || text.includes('임산부') || text.includes('영유아') || text.includes('난임')) result.push('임신·출산');
  if (text.includes('보육') || text.includes('교육') || text.includes('장학') || text.includes('학생') || text.includes('어린이')) result.push('보육·교육');
  if (text.includes('생활') || text.includes('생계') || text.includes('지원금') || text.includes('수당') || text.includes('안정')) result.push('생활안정');
  if (text.includes('농업') || text.includes('축산') || text.includes('농가') || text.includes('원예') || text.includes('과수') || text.includes('귀농')) result.push('농림축산어업');
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
  gov24Items
}: PolicySectionProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'name'>('latest');

  // Convert raw data into unified Policy items
  const policies = useMemo(() => {
    const list: Benefit[] = [];

    // 1. Crawled welfare items
    initialWelfare.forEach((item) => {
      const textToScan = `${item.title} ${item.dept || ''} ${item.reason || ''}`;
      list.push({
        id: item.id,
        title: item.title,
        region: 'suncheon',
        org: item.source || '순천시청',
        dept: item.dept || '순천시',
        categories: inferCategories(textToScan),
        lifeStages: [],
        households: [],
        target: item.dept ? `${item.dept} 공고 요건 대상자` : '순천시민 및 관내 요건 충족자',
        deadline: null,
        postedAt: item.date || '상시',
        url: item.link || '#',
      });
    });

    // 2. Gov24 items (Suncheon municipal policies)
    gov24Items.forEach((item, idx) => {
      const title = item.서비스명 || item.svcNm || '순천시 지원 정책';
      const summary = item.서비스목적요약 || item.지원내용 || '';
      const textToScan = `${title} ${summary} ${item.서비스분야 || ''}`;
      const rawCat = (item.서비스분야 as string) || '';
      const cats = rawCat ? [rawCat.trim()] : inferCategories(textToScan);

      const rawOrg = (item.소관기관명 as string) || '';
      const org = rawOrg.includes('순천') ? '순천시' : (rawOrg || '순천시');

      list.push({
        id: `gov24-${idx}`,
        title,
        region: 'suncheon',
        org,
        dept: (item.부서명 as string) || (item.소관기관명 as string) || '순천시',
        categories: cats,
        lifeStages: [],
        households: [],
        target: (item.지원대상 as string) || (item.지원유형 as string) || summary || '순천시 해당 요건 대상자',
        deadline: (item.신청기한 as string) || null,
        postedAt: (item.신청기한 as string) || '상시접수',
        url: (item.상세조회URL as string) || '#',
      });
    });

    return list;
  }, [initialWelfare, gov24Items]);

  // Compute ONLY categories that actually exist in the data (count > 0)
  const availableCategories = useMemo(() => {
    const map = new Map<string, number>();
    policies.forEach(p => {
      p.categories.forEach(c => {
        if (c && c.trim()) {
          map.set(c, (map.get(c) || 0) + 1);
        }
      });
    });

    return Array.from(map.entries())
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]) // Most frequent categories first
      .map(([cat]) => cat);
  }, [policies]);

  // Compute ONLY organizations that actually have policies
  const availableOrgs = useMemo(() => {
    const map = new Map<string, number>();
    policies.forEach(p => {
      if (p.org) {
        map.set(p.org, (map.get(p.org) || 0) + 1);
      }
    });

    const orgList = Array.from(map.entries())
      .filter(([_, count]) => count > 0)
      .map(([org, count]) => ({ label: org, value: org, count }));

    return [
      { label: '전체 기관', value: 'all', count: policies.length },
      ...orgList
    ];
  }, [policies]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedOrg('all');
    setSearchQuery('');
  };

  const filteredPolicies = useMemo(() => {
    const result = policies.filter(p => {
      const matchesCategory = selectedCategories.length === 0 ||
        selectedCategories.some(c => p.categories.includes(c));
      const matchesOrg = selectedOrg === 'all' || p.org === selectedOrg;
      const lowerQ = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        p.title.toLowerCase().includes(lowerQ) ||
        p.org.toLowerCase().includes(lowerQ) ||
        p.dept.toLowerCase().includes(lowerQ) ||
        p.target.toLowerCase().includes(lowerQ);

      return matchesCategory && matchesOrg && matchesSearch;
    });

    if (sortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      result.sort((a, b) => (b.postedAt || '').localeCompare(a.postedAt || ''));
    }

    return result;
  }, [policies, selectedCategories, selectedOrg, searchQuery, sortBy]);

  const getCategoryCount = (cat: string) => {
    return policies.filter(p => p.categories.includes(cat)).length;
  };

  return (
    <div className="w-full text-slate-800">
      {/* Hero Header */}
      <div className="mb-8 text-center py-10 bg-white rounded-3xl shadow-xs border border-emerald-100">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          순천시 맞춤 지원 및 공공 정책
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-slate-900">
          순천시 <span className="text-emerald-600">지원보기</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto px-4">
          순천시청, 관내 주요 공공기관 및 보조금24에 공식 등록된 순천시민 대상 지원 혜택을 한눈에 확인하세요.
        </p>
      </div>

      {/* Category Filter Section (Only shows categories with count > 0) */}
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

        {/* Dynamic Category Chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {availableCategories.map(cat => {
            const isSelected = selectedCategories.includes(cat);
            const count = getCategoryCount(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                {cat}
                <span className={`text-xs ml-1.5 px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="h-px bg-slate-100 w-full mb-4" />

        {/* Agency and Search Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-700 shrink-0">소관 기관:</span>
            {availableOrgs.map(o => (
              <button
                key={o.value}
                onClick={() => setSelectedOrg(o.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                  selectedOrg === o.value
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {o.label} ({o.count})
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="정책명, 대상, 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Result Status Bar */}
      <div className="flex items-center justify-between mb-4 px-1 text-xs sm:text-sm text-slate-500">
        <div>
          총 <strong className="text-emerald-700 font-bold">{filteredPolicies.length}</strong>건의 순천 지원 정책이 있습니다.
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs focus:outline-none"
          >
            <option value="latest">최신순</option>
            <option value="name">가나다순</option>
          </select>
        </div>
      </div>

      {/* Active filter badges */}
      {(selectedCategories.length > 0 || selectedOrg !== 'all' || searchQuery) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
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
        {filteredPolicies.length > 0 ? (
          filteredPolicies.map((p, idx) => (
            <div
              key={`policy-${p.org}-${p.id || idx}-${idx}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {p.org}
                  </span>
                  {p.categories.length > 0 && (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                      {p.categories[0]}
                      {p.categories.length > 1 && ` 외 ${p.categories.length - 1}`}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mb-3">
                  {p.title}
                </h3>

                <div className="mb-4 text-xs rounded-xl p-3 bg-slate-50 border border-slate-100 text-slate-600 leading-relaxed flex flex-col gap-1.5">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-slate-800 shrink-0">대상:</span>
                    <span className="line-clamp-2 text-slate-600">{p.target}</span>
                  </div>
                  {p.dept && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-slate-800 shrink-0">부서:</span>
                      <span className="text-slate-600">{p.dept}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 mt-auto">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {p.postedAt || '상시'}
                </span>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-800 hover:underline shrink-0"
                >
                  상세보기
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <p className="font-medium text-slate-600 mb-2">선택한 분야 또는 검색어에 일치하는 정책이 없습니다.</p>
            <button
              onClick={clearAllFilters}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-xs"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
