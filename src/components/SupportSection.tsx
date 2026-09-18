'use client';

import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, ExternalLink, MapPin, X, Calendar, Sparkles, User, Users, SlidersHorizontal } from 'lucide-react';
import { CrawledItem } from '@/lib/crawler';

export interface Gov24Item {
  서비스명?: string;
  svcNm?: string;
  서비스목적요약?: string;
  지원내용?: string;
  소관기관명?: string;
  jrsdDptAllNm?: string;
  서비스분야?: string;
  서비스목적?: string;
  svcPpo?: string;
  지원유형?: string;
  상세조회URL?: string;
  [key: string]: unknown;
}

export type Benefit = {
  id?: string;
  title: string;
  region: 'suncheon' | 'jeonnam' | 'national';
  org: string;
  dept: string;
  categories: string[];
  lifeStages: string[];
  households: string[];
  target: string;
  deadline: string | null;
  postedAt: string;
  url: string;
};

interface SupportSectionProps {
  initialWelfare: CrawledItem[];
  gov24Items: Gov24Item[];
  lastUpdated: string;
}

const LIFE_STAGES = ['임신·출산', '영유아', '아동', '청소년', '청년', '중장년', '노년'];
const HOUSEHOLDS = ['저소득', '장애인', '한부모·조손', '다자녀', '다문화·탈북민', '보훈대상자'];

const ORGS = [
  { label: '전체 기관', value: 'all' },
  { label: '순천시청', value: '순천시청' },
  { label: '순천청년정책', value: '순천청년정책' },
  { label: '순천문화재단', value: '순천문화재단' },
  { label: '국립순천대', value: '순천대학교' },
  { label: '전라남도', value: '전라남도' },
  { label: '보조금24', value: '보조금24' }
];

const SCOPE = {
  suncheon: ['suncheon', 'jeonnam', 'national'],
  jeonnam: ['jeonnam', 'national'],
  national: ['national'],
};

function inferLifeStages(text: string): string[] {
  const result: string[] = [];
  if (text.includes('임신') || text.includes('출산') || text.includes('산모') || text.includes('난임')) result.push('임신·출산');
  if (text.includes('영유아') || text.includes('유아') || text.includes('아기') || text.includes('어린이집')) result.push('영유아');
  if (text.includes('아동') || text.includes('초등') || text.includes('아이')) result.push('아동');
  if (text.includes('청소년') || text.includes('중고등') || text.includes('학생')) result.push('청소년');
  if (text.includes('청년') || text.includes('대학생') || text.includes('취업준비') || text.includes('미취업')) result.push('청년');
  if (text.includes('중장년') || text.includes('재취업') || text.includes('신중년')) result.push('중장년');
  if (text.includes('노인') || text.includes('어르신') || text.includes('시니어') || text.includes('노년')) result.push('노년');
  return result;
}

function inferHouseholds(text: string): string[] {
  const result: string[] = [];
  if (text.includes('저소득') || text.includes('차상위') || text.includes('기초생활') || text.includes('수급자')) result.push('저소득');
  if (text.includes('장애인') || text.includes('중증장애')) result.push('장애인');
  if (text.includes('한부모') || text.includes('조손') || text.includes('미혼모')) result.push('한부모·조손');
  if (text.includes('다자녀') || text.includes('다둥이')) result.push('다자녀');
  if (text.includes('다문화') || text.includes('외국인') || text.includes('북한이탈') || text.includes('탈북')) result.push('다문화·탈북민');
  if (text.includes('보훈') || text.includes('유공자')) result.push('보훈대상자');
  return result;
}

function adaptCrawledItem(item: CrawledItem): Benefit {
  const isJeonnam = item.source === '전라남도';
  const textToScan = `${item.title} ${item.dept || ''} ${item.reason || ''}`;
  return {
    id: item.id,
    title: item.title || '',
    region: isJeonnam ? 'jeonnam' : 'suncheon',
    org: item.source || '순천시청',
    dept: item.dept || '',
    categories: [],
    lifeStages: inferLifeStages(textToScan),
    households: inferHouseholds(textToScan),
    target: item.dept ? `${item.dept} 관련 지원` : '해당 요건 충족자',
    deadline: null,
    postedAt: item.date || '',
    url: item.link || '#',
  };
}

function adaptGov24Item(item: Gov24Item, idx: number): Benefit {
  const title = item.서비스명 || item.svcNm || '공공서비스 지원';
  const summary = item.서비스목적요약 || item.지원내용 || '';
  const textToScan = `${title} ${summary} ${item.지원유형 || ''} ${item.소관기관명 || ''}`;
  return {
    id: `gov24-${idx}`,
    title,
    region: 'national',
    org: '보조금24',
    dept: item.소관기관명 || item.jrsdDptAllNm || '정부/지자체',
    categories: item.서비스분야 ? [item.서비스분야] : [],
    lifeStages: inferLifeStages(textToScan),
    households: inferHouseholds(textToScan),
    target: item.지원유형 || summary || '전 국민 요건 충족자',
    deadline: null,
    postedAt: '',
    url: item.상세조회URL || '#',
  };
}

export default function SupportSection({
  initialWelfare,
  gov24Items,
  lastUpdated
}: SupportSectionProps) {
  const [welfareList, setWelfareList] = useState<CrawledItem[]>(initialWelfare);
  const [gov24List, setGov24List] = useState<Gov24Item[]>(gov24Items);
  const [updatedTime, setUpdatedTime] = useState<string>(lastUpdated);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [region, setRegion] = useState<'suncheon' | 'jeonnam' | 'national'>('suncheon');
  const [selectedLifeStages, setSelectedLifeStages] = useState<string[]>([]);
  const [selectedHouseholds, setSelectedHouseholds] = useState<string[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  const allBenefits = useMemo(() => {
    const w = welfareList.map(adaptCrawledItem);
    const g = gov24List.map(adaptGov24Item);
    return [...w, ...g];
  }, [welfareList, gov24List]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/crawl?refresh=true');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setWelfareList(json.welfare || []);
          setUpdatedTime(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleFilter = (set: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    set(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const clearAllFilters = () => {
    setRegion('suncheon');
    setSelectedLifeStages([]);
    setSelectedHouseholds([]);
    setSelectedOrg('all');
    setSearchQuery('');
    setSortBy('latest');
  };

  const matchesRegion = (item: Benefit, r: string) => SCOPE[r as keyof typeof SCOPE].includes(item.region);
  const matchesLifeStages = (item: Benefit, stages: string[]) => stages.length === 0 || stages.some(s => item.lifeStages.includes(s) || item.lifeStages.length === 0);
  const matchesHouseholds = (item: Benefit, holds: string[]) => holds.length === 0 || holds.some(h => item.households.includes(h) || item.households.length === 0);
  const matchesOrg = (item: Benefit, o: string) => o === 'all' || item.org === o;
  const matchesSearch = (item: Benefit, q: string) => {
    if (!q) return true;
    const lowerQ = q.toLowerCase();
    return (
      item.title.toLowerCase().includes(lowerQ) ||
      item.org.toLowerCase().includes(lowerQ) ||
      item.dept.toLowerCase().includes(lowerQ) ||
      item.target.toLowerCase().includes(lowerQ)
    );
  };

  const filteredList = useMemo(() => {
    const result = allBenefits.filter(item =>
      matchesRegion(item, region) &&
      matchesLifeStages(item, selectedLifeStages) &&
      matchesHouseholds(item, selectedHouseholds) &&
      matchesOrg(item, selectedOrg) &&
      matchesSearch(item, searchQuery)
    );

    if (sortBy === 'region') {
      const weight = { suncheon: 1, jeonnam: 2, national: 3 };
      result.sort((a, b) => weight[a.region] - weight[b.region]);
    } else {
      result.sort((a, b) => (b.postedAt || '').localeCompare(a.postedAt || ''));
    }

    return result;
  }, [allBenefits, region, selectedLifeStages, selectedHouseholds, selectedOrg, searchQuery, sortBy]);

  const getRegionCount = (r: string) => {
    return allBenefits.filter(item =>
      matchesRegion(item, r) &&
      matchesLifeStages(item, selectedLifeStages) &&
      matchesHouseholds(item, selectedHouseholds) &&
      matchesOrg(item, selectedOrg) &&
      matchesSearch(item, searchQuery)
    ).length;
  };

  const renderRegionBadge = (r: string) => {
    if (r === 'suncheon') return <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">순천</span>;
    if (r === 'jeonnam') return <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200">전남</span>;
    return <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">전국</span>;
  };

  const activeFiltersCount = selectedLifeStages.length + selectedHouseholds.length + (selectedOrg !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);

  return (
    <div className="w-full text-slate-800">
      {/* Hero Header */}
      <div className="mb-8 text-center py-10 bg-white rounded-3xl shadow-xs border border-emerald-100">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          상황별 맞춤 지원 포털
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-slate-900">
          순천에 <span className="text-emerald-600">이런 지원 필요해요</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto px-4">
          연령대와 가구 상황을 선택하시면 순천시와 중앙정부에서 제공하는 맞춤 지원 혜택을 즉시 찾아드립니다.
        </p>
      </div>

      {/* Region Tabs & Refresh Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 bg-emerald-100/70 p-1.5 rounded-full w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'suncheon', label: '순천' },
            { id: 'jeonnam', label: '전남' },
            { id: 'national', label: '전국' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setRegion(r.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                region === r.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-800 hover:text-emerald-950 hover:bg-white/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {r.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                region === r.id ? 'bg-white text-emerald-700' : 'bg-emerald-200 text-emerald-800'
              }`}>
                {getRegionCount(r.id)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 self-end sm:self-center">
          <span>최근 갱신: {updatedTime}</span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Situation Filter Box */}
      <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-xs mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white p-5 border-b border-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-xs">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  내게 딱 맞는 맞춤 조건 선택
                </h2>
                <p className="text-xs text-slate-500">
                  해당하는 생애주기와 가구 조건을 복수 선택할 수 있습니다.
                </p>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-slate-500 underline hover:text-emerald-700 font-medium"
              >
                필터 초기화
              </button>
            )}
          </div>

          <div className="space-y-4 pt-1">
            {/* 나는 (Life stages) */}
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 text-sm font-bold text-emerald-900 mt-1.5 w-20 shrink-0">
                <User className="w-4 h-4 text-emerald-600" />
                <span>나는</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {LIFE_STAGES.map(stage => {
                  const isSelected = selectedLifeStages.includes(stage);
                  return (
                    <button
                      key={stage}
                      onClick={() => toggleFilter(setSelectedLifeStages, stage)}
                      className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                          : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 우리 집은 (Households) */}
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 text-sm font-bold text-emerald-900 mt-1.5 w-20 shrink-0">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>우리 집은</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {HOUSEHOLDS.map(stage => {
                  const isSelected = selectedHouseholds.includes(stage);
                  return (
                    <button
                      key={stage}
                      onClick={() => toggleFilter(setSelectedHouseholds, stage)}
                      className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                          : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Agency & Search Bar */}
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs sm:text-sm font-bold text-slate-700 shrink-0">기관 선택</span>
            <div className="flex flex-wrap gap-1.5">
              {ORGS.map(o => {
                const isSelected = selectedOrg === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setSelectedOrg(o.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="지원 내용, 혜택명, 기관 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Result Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-slate-800 font-medium">
            조회된 맞춤 혜택 <strong className="text-emerald-600 text-lg font-bold">{filteredList.length}</strong>건
            <span className="text-xs text-slate-400 ml-2">
              (순천 {filteredList.filter(i => i.region === 'suncheon').length} · 
               전남 {filteredList.filter(i => i.region === 'jeonnam').length} · 
               전국 {filteredList.filter(i => i.region === 'national').length})
            </span>
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {[...selectedLifeStages, ...selectedHouseholds].map(f => (
                <button
                  key={f}
                  onClick={() => {
                    setSelectedLifeStages(p => p.filter(x => x !== f));
                    setSelectedHouseholds(p => p.filter(x => x !== f));
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs hover:bg-emerald-100"
                >
                  {f} <X className="w-3 h-3" />
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
        </div>

        <div className="flex items-center gap-3 text-sm shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="latest">최신순</option>
            <option value="region">가까운 지역순</option>
          </select>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredList.length > 0 ? (
          filteredList.map((item, idx) => (
            <div
              key={`support-${item.org}-${item.id || idx}-${idx}`}
              className="group rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between relative overflow-hidden p-5"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />

              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 border-slate-200">
                      {item.org}
                    </span>
                    {renderRegionBadge(item.region)}
                  </div>
                  {item.lifeStages.length > 0 && (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {item.lifeStages[0]}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base sm:text-lg leading-snug text-slate-900 group-hover:text-emerald-600 transition-colors break-keep line-clamp-2 mb-3">
                  {item.title}
                </h3>

                <div className="mb-4 text-xs rounded-xl p-3 bg-emerald-50/70 border border-emerald-100 text-emerald-900 leading-relaxed flex flex-col gap-1.5">
                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0 text-emerald-800">대상</span>
                    <span className="line-clamp-2 text-slate-700">{item.target || '공고문 참조'}</span>
                  </div>
                  {item.dept && (
                    <div className="flex items-start gap-2">
                      <span className="font-bold shrink-0 text-emerald-800">부서</span>
                      <span className="text-slate-700">{item.dept}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.postedAt || '상시'}</span>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-800 hover:underline shrink-0"
                >
                  원문보기
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <p className="font-medium text-slate-600 mb-2">선택한 조건에 부합하는 지원 정보가 없습니다.</p>
            <p className="text-xs text-slate-400 mb-4">선택하신 생애주기나 가구 조건을 변경해 보세요.</p>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-xs"
            >
              조건 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
