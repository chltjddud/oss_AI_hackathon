'use client';

import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, ExternalLink, MapPin, X, Calendar, Sparkles } from 'lucide-react';
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
  originalCategory?: string;
};

interface CrawledSectionProps {
  initialWelfare: CrawledItem[];
  initialNotice: CrawledItem[];
  gov24Items: Gov24Item[];
  lastUpdated: string;
}

const LIFE_STAGES = ['임신·출산', '영유아', '아동', '청소년', '청년', '중장년', '노년'];
const HOUSEHOLDS = ['저소득', '장애인', '한부모·조손', '다자녀', '다문화·탈북민', '보훈대상자'];
const CATEGORIES = [
  '신체건강', '정신건강', '생활지원', '주거', '일자리', '문화·여가', '안전·위기',
  '임신·출산', '보육', '교육', '입양·위탁', '보호·돌봄', '서민금융', '법률'
];

const ORGS = [
  { label: '전체 기관', value: 'all' },
  { label: '순천시청', value: '순천시청' },
  { label: '순천청년정책', value: '순천청년정책' },
  { label: '순천문화재단', value: '순천문화재단' },
  { label: '국립순천대', value: '국립순천대' },
  { label: '전라남도', value: '전라남도' },
  { label: '보조금24', value: '보조금24' }
];

const SCOPE = {
  suncheon: ['suncheon', 'jeonnam', 'national'],
  jeonnam: ['jeonnam', 'national'],
  national: ['national'],
};

// Adapter functions
function adaptCrawledItem(item: CrawledItem): Benefit {
  const isJeonnam = item.source === '전라남도';
  return {
    title: item.title || '',
    region: isJeonnam ? 'jeonnam' : 'suncheon',
    org: item.source || '순천시청',
    dept: item.dept || '',
    categories: [], // TODO: 분류 매핑 필요
    lifeStages: [], // TODO: 분류 매핑 필요
    households: [], // TODO: 분류 매핑 필요
    target: '',
    deadline: null, // TODO: 마감일 파싱 로직 추가 시 적용
    postedAt: item.date || '',
    url: item.link || '#',
    originalCategory: item.category
  };
}

function adaptGov24Item(item: Gov24Item): Benefit {
  return {
    title: item.서비스명 || item.svcNm || '정책 이름 없음',
    region: 'national',
    org: '보조금24',
    dept: item.소관기관명 || item.jrsdDptAllNm || '정부/지자체',
    categories: item.서비스분야 ? [item.서비스분야] : [], 
    lifeStages: [], // TODO: 분류 매핑 필요
    households: [], // TODO: 분류 매핑 필요
    target: item.지원유형 || '',
    deadline: null,
    postedAt: '',
    url: item.상세조회URL || '#',
  };
}

export default function CrawledSection({
  initialWelfare,
  initialNotice,
  gov24Items,
  lastUpdated
}: CrawledSectionProps) {
  const [welfareList, setWelfareList] = useState<CrawledItem[]>(initialWelfare);
  const [gov24List, setGov24List] = useState<Gov24Item[]>(gov24Items);
  const [updatedTime, setUpdatedTime] = useState<string>(lastUpdated);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // States for filters
  const [region, setRegion] = useState<'suncheon' | 'jeonnam' | 'national'>('suncheon');
  const [selectedLifeStages, setSelectedLifeStages] = useState<string[]>([]);
  const [selectedHouseholds, setSelectedHouseholds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
          setGov24List(json.gov24 || []);
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
    setSelectedCategories([]);
    setSelectedOrg('all');
    setSearchQuery('');
    setSortBy('latest');
  };

  const clearPanelFilters = () => {
    setSelectedLifeStages([]);
    setSelectedHouseholds([]);
    setSelectedCategories([]);
    setSelectedOrg('all');
  };

  const matchesRegion = (item: Benefit, r: string) => SCOPE[r as keyof typeof SCOPE].includes(item.region);
  const matchesLifeStages = (item: Benefit, stages: string[]) => stages.length === 0 || stages.some(s => item.lifeStages.includes(s));
  const matchesHouseholds = (item: Benefit, holds: string[]) => holds.length === 0 || holds.some(h => item.households.includes(h));
  const matchesCategories = (item: Benefit, cats: string[]) => cats.length === 0 || cats.some(c => item.categories.includes(c));
  const matchesOrg = (item: Benefit, o: string) => o === 'all' || item.org === o;
  const matchesSearch = (item: Benefit, q: string) => {
    if (!q) return true;
    const lowerQ = q.toLowerCase();
    return (
      item.title.toLowerCase().includes(lowerQ) ||
      item.org.toLowerCase().includes(lowerQ) ||
      item.dept.toLowerCase().includes(lowerQ) ||
      item.target.toLowerCase().includes(lowerQ) ||
      item.categories.some(c => c.toLowerCase().includes(lowerQ))
    );
  };

  const filteredList = useMemo(() => {
    let result = allBenefits.filter(item => 
      matchesRegion(item, region) &&
      matchesLifeStages(item, selectedLifeStages) &&
      matchesHouseholds(item, selectedHouseholds) &&
      matchesCategories(item, selectedCategories) &&
      matchesOrg(item, selectedOrg) &&
      matchesSearch(item, searchQuery)
    );

    if (sortBy === 'deadline') {
      result.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    } else if (sortBy === 'region') {
      const weight = { suncheon: 1, jeonnam: 2, national: 3 };
      result.sort((a, b) => weight[a.region] - weight[b.region]);
    } else {
      result.sort((a, b) => (b.postedAt || "").localeCompare(a.postedAt || ""));
    }
    
    return result;
  }, [allBenefits, region, selectedLifeStages, selectedHouseholds, selectedCategories, selectedOrg, searchQuery, sortBy]);

  const getRegionCount = (r: string) => {
    return allBenefits.filter(item => 
      matchesRegion(item, r) &&
      matchesLifeStages(item, selectedLifeStages) &&
      matchesHouseholds(item, selectedHouseholds) &&
      matchesCategories(item, selectedCategories) &&
      matchesOrg(item, selectedOrg) &&
      matchesSearch(item, searchQuery)
    ).length;
  };

  const getCategoryCount = (c: string) => {
    return allBenefits.filter(item => 
      matchesRegion(item, region) &&
      matchesLifeStages(item, selectedLifeStages) &&
      matchesHouseholds(item, selectedHouseholds) &&
      (item.categories.includes(c)) &&
      matchesOrg(item, selectedOrg) &&
      matchesSearch(item, searchQuery)
    ).length;
  };

  const getOrgCount = (o: string) => {
    if (o === 'all') return allBenefits.filter(item => 
      matchesRegion(item, region) &&
      matchesLifeStages(item, selectedLifeStages) &&
      matchesHouseholds(item, selectedHouseholds) &&
      matchesCategories(item, selectedCategories) &&
      matchesSearch(item, searchQuery)
    ).length;
    
    return allBenefits.filter(item => 
      matchesRegion(item, region) &&
      matchesLifeStages(item, selectedLifeStages) &&
      matchesHouseholds(item, selectedHouseholds) &&
      matchesCategories(item, selectedCategories) &&
      item.org === o &&
      matchesSearch(item, searchQuery)
    ).length;
  };

  const activeFiltersCount = selectedLifeStages.length + selectedHouseholds.length + selectedCategories.length + (selectedOrg !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);
  
  const renderRegionBadge = (r: string) => {
    if (r === 'suncheon') return <span className="inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold bg-[#D1FAE5] text-[#047857] border-emerald-200">순천</span>;
    if (r === 'jeonnam') return <span className="inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold bg-[#FEF3C7] text-[#B45309] border-amber-200">전남</span>;
    return <span className="inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold bg-[#E0E7FF] text-[#4338CA] border-indigo-200">전국</span>;
  };

  return (
    <div className="w-full text-[#1F2937]">
      {/* 1. 지역 탭 바 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 bg-[#DDF5E8] p-1.5 rounded-full w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'suncheon', label: '순천' },
            { id: 'jeonnam', label: '전남' },
            { id: 'national', label: '전국' }
          ].map(r => (
            <button
              key={r.id}
              aria-pressed={region === r.id}
              onClick={() => setRegion(r.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                region === r.id
                  ? 'bg-[#10B981] text-white shadow-md'
                  : 'text-[#059669]/70 hover:text-[#059669] hover:bg-white/50'
              }`}
            >
              {r.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                region === r.id ? 'bg-white text-[#10B981]' : 'bg-[#D1FAE5]/70 text-[#059669]'
              }`}>
                {getRegionCount(r.id)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-[#4B5563] self-end sm:self-center">
          <span>갱신: {updatedTime}</span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#EEFAF4] hover:text-[#10B981] hover:border-[#10B981] transition-all font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#10B981]' : ''}`} />
            새로고침
          </button>
        </div>
      </div>
      <p className="text-sm text-[#4B5563] mb-6 pl-2">
        {region === 'suncheon' && '순천 시민이 받을 수 있는 순천시·전남·전국 혜택을 모두 보여줘요'}
        {region === 'jeonnam' && '전라남도와 전국 단위 혜택을 보여줘요'}
        {region === 'national' && '전국 어디서나 받을 수 있는 혜택(보조금24)만 보여줘요'}
      </p>

      {/* 2. 필터 패널 */}
      <div className="bg-white rounded-2xl border border-[#D5F2E3] shadow-sm mb-6 overflow-hidden">
        {/* 상황별 추천 */}
        <div className="bg-gradient-to-b from-[#EEFAF4] to-white p-5 border-b border-[#E5E7EB] relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-[#1F2937]">
                <span className="text-[#10B981]">순천시</span>, 이런 지원이 필요해요
              </h3>
              <span className="text-xs text-[#4B5563] hidden sm:inline ml-2">해당하는 상황을 고르면 받을 수 있는 혜택만 모아 보여드려요.</span>
            </div>
            <button onClick={clearPanelFilters} className="text-xs text-gray-500 underline hover:text-gray-700">필터 초기화</button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold text-[#4B5563] mt-1.5 w-16 whitespace-nowrap shrink-0">나는</span>
              <div className="flex flex-wrap gap-2">
                {LIFE_STAGES.map(stage => {
                  const isSelected = selectedLifeStages.includes(stage);
                  return (
                    <button
                      key={stage}
                      aria-pressed={isSelected}
                      onClick={() => toggleFilter(setSelectedLifeStages, stage)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all border ${
                        isSelected 
                          ? 'bg-[#10B981] text-white border-[#10B981] font-bold shadow-sm' 
                          : 'bg-white text-[#10B981] border-[#D5F2E3] hover:bg-[#EEFAF4]'
                      }`}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold text-[#4B5563] mt-1.5 w-16 whitespace-nowrap shrink-0">우리 집은</span>
              <div className="flex flex-wrap gap-2">
                {HOUSEHOLDS.map(stage => {
                  const isSelected = selectedHouseholds.includes(stage);
                  return (
                    <button
                      key={stage}
                      aria-pressed={isSelected}
                      onClick={() => toggleFilter(setSelectedHouseholds, stage)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all border ${
                        isSelected 
                          ? 'bg-[#10B981] text-white border-[#10B981] font-bold shadow-sm' 
                          : 'bg-white text-[#10B981] border-[#D5F2E3] hover:bg-[#EEFAF4]'
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

        {/* 분야·기관·검색 */}
        <div className="p-5">
          <div className="flex items-start gap-3 mb-5">
            <span className="text-sm font-bold text-[#4B5563] mt-1.5 w-16 whitespace-nowrap shrink-0">복지분야</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategories.includes(cat);
                const count = getCategoryCount(cat);
                return (
                  <button
                    key={cat}
                    aria-pressed={isSelected}
                    onClick={() => toggleFilter(setSelectedCategories, cat)}
                    className={`px-3 py-1 rounded-full text-sm transition-all border ${
                      isSelected 
                        ? 'bg-[#ECFDF5] text-[#047857] border-[#10B981] font-bold' 
                        : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-slate-50'
                    }`}
                  >
                    {cat} <span className="opacity-60 text-xs ml-0.5">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-[#E5E7EB] w-full mb-5" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-sm font-bold text-[#4B5563] shrink-0">기관 선택</span>
              <div className="flex flex-wrap gap-2">
                {ORGS.map(o => {
                  const isSelected = selectedOrg === o.value;
                  const count = getOrgCount(o.value);
                  return (
                    <button
                      key={o.value}
                      aria-pressed={isSelected}
                      onClick={() => {
                        if (o.value === 'all') setSelectedOrg('all');
                        else setSelectedOrg(o.value);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        isSelected
                          ? 'bg-[#D1FAE5] text-[#059669] border-[#10B981] font-bold'
                          : 'bg-slate-50 text-[#4B5563] border-[#E5E7EB] hover:bg-slate-100'
                      }`}
                    >
                      {o.label} {o.value !== 'all' && <span className="opacity-70">({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="제목, 내용, 기관 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] bg-white shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. 결과 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4" aria-live="polite">
        <div className="flex flex-col gap-2">
          <div className="text-[#1F2937]">
            받을 수 있는 혜택 <strong className="text-[#10B981] text-lg">{filteredList.length}</strong>건
            <span className="text-sm text-[#9CA3AF] ml-2">
              (순천 {filteredList.filter(i => i.region === 'suncheon').length} · 
               전남 {filteredList.filter(i => i.region === 'jeonnam').length} · 
               전국 {filteredList.filter(i => i.region === 'national').length})
            </span>
          </div>
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {[...selectedLifeStages, ...selectedHouseholds, ...selectedCategories].map(f => (
                <button key={f} onClick={() => {
                  setSelectedLifeStages(p => p.filter(x => x !== f));
                  setSelectedHouseholds(p => p.filter(x => x !== f));
                  setSelectedCategories(p => p.filter(x => x !== f));
                }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EEFAF4] border border-[#D5F2E3] text-[#059669] text-xs hover:bg-[#D1FAE5]">
                  {f} <X className="w-3 h-3" />
                </button>
              ))}
              {selectedOrg !== 'all' && (
                <button onClick={() => setSelectedOrg('all')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EEFAF4] border border-[#D5F2E3] text-[#059669] text-xs hover:bg-[#D1FAE5]">
                  {selectedOrg} <X className="w-3 h-3" />
                </button>
              )}
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EEFAF4] border border-[#D5F2E3] text-[#059669] text-xs hover:bg-[#D1FAE5]">
                  "{searchQuery}" <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm shrink-0">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20"
          >
            <option value="latest">최신 등록순</option>
            <option value="deadline">마감 임박순</option>
            <option value="region">가까운 지역순</option>
          </select>
        </div>
      </div>

      {/* 4. 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredList.length > 0 ? (
          filteredList.map((item, idx) => {
            let ddayClass = "bg-white text-[#10B981] border-[#D5F2E3]";
            let ddayText = "상시";
            if (item.deadline) {
              const diff = Math.ceil((new Date(item.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              if (diff < 0) {
                ddayClass = "bg-gray-100 text-gray-500 border-gray-200";
                ddayText = "마감";
              } else if (diff <= 14) {
                ddayClass = "bg-red-50 text-red-600 border-red-100";
                ddayText = `D-${diff}`;
              } else {
                ddayClass = "bg-white text-slate-600 border-slate-200";
                ddayText = `D-${diff}`;
              }
            }

            return (
            <div
              key={idx}
              className="group rounded-[16px] border border-[#E5E7EB] bg-[#FFFFFF] shadow-sm hover:shadow-md hover:border-[#D5F2E3] transition-all duration-200 flex flex-col justify-between relative overflow-hidden p-6"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#10B981]" />
              
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold bg-slate-100 text-[#4B5563] border-[#E5E7EB]">
                      {item.org}
                    </span>
                    {renderRegionBadge(item.region)}
                  </div>
                  {item.categories.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium bg-[#ECFDF5] text-[#047857] border-[#D5F2E3]">
                      {item.categories[0]} {item.categories.length > 1 && '외'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-lg leading-snug text-[#1F2937] group-hover:text-[#059669] transition-colors break-keep line-clamp-2 mb-3">
                  {item.title}
                </h3>

                <div className="mb-4 text-xs rounded-xl p-3 bg-[#EEFAF4] border border-[#D5F2E3] text-[#047857] leading-relaxed flex flex-col gap-1.5">
                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">대상</span>
                    <span className="line-clamp-2 text-[#059669]">{item.target || '누구나'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">기한</span>
                    <span className="text-[#059669]">{item.deadline ? `${item.deadline}까지` : '상시 신청'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] mt-auto flex items-center justify-between text-xs text-[#9CA3AF]">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.postedAt || '날짜없음'}
                  </span>
                  {item.dept && <span className="truncate max-w-[80px]">{item.dept}</span>}
                  
                  <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded font-bold border ${ddayClass}`}>
                    {ddayText}
                  </span>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#10B981] hover:text-[#059669] hover:underline shrink-0"
                >
                  원문보기
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            )
          })
        ) : (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-[#E5E7EB] text-[#9CA3AF]">
            <p className="font-medium text-[#4B5563] mb-3">조건에 맞는 혜택이 없어요.<br/>선택한 상황이나 분야를 줄여 보세요.</p>
            <button onClick={clearAllFilters} className="px-4 py-2 bg-[#10B981] text-white rounded-lg text-sm font-medium hover:bg-[#059669] shadow-sm">
              조건 모두 지우기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
