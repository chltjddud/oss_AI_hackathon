'use client';

import React, { useState } from 'react';
import { CrawledItem } from '@/lib/crawler';
import { Search, RefreshCw, ExternalLink, Sparkles, Bell, HeartHandshake, Building2, Calendar } from 'lucide-react';

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

interface CrawledSectionProps {
  initialWelfare: CrawledItem[];
  initialNotice: CrawledItem[];
  gov24Items: Gov24Item[];
  lastUpdated: string;
}

export default function CrawledSection({
  initialWelfare,
  initialNotice,
  gov24Items,
  lastUpdated
}: CrawledSectionProps) {
  const [activeTab, setActiveTab] = useState<'welfare' | 'notice' | 'gov24'>('welfare');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [welfareList, setWelfareList] = useState<CrawledItem[]>(initialWelfare);
  const [noticeList, setNoticeList] = useState<CrawledItem[]>(initialNotice);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatedTime, setUpdatedTime] = useState<string>(lastUpdated);

  const sources = [
    { key: 'all', label: '전체 기관' },
    { key: '순천시청', label: '순천시청' },
    { key: '순천청년정책', label: '순천청년정책' },
    { key: '순천문화재단', label: '순천문화재단' },
    { key: '순천대학교', label: '국립순천대' }
  ];

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/crawl?refresh=true');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setWelfareList(json.welfare || []);
          setNoticeList(json.notice || []);
          setUpdatedTime(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter items based on activeTab, source, and search
  const currentItems = activeTab === 'welfare' ? welfareList : noticeList;

  const filteredItems = currentItems.filter(item => {
    const matchesSource = sourceFilter === 'all' || item.source === sourceFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.reason && item.reason.toLowerCase().includes(q)) ||
      (item.dept && item.dept.toLowerCase().includes(q));
    return matchesSource && matchesSearch;
  });

  const filteredGov24 = gov24Items.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (item.서비스명 || item.svcNm || '').toLowerCase();
    const desc = (item.서비스목적요약 || item.지원내용 || '').toLowerCase();
    const dept = (item.소관기관명 || item.jrsdDptAllNm || '').toLowerCase();
    return name.includes(q) || desc.includes(q) || dept.includes(q);
  });

  return (
    <div className="w-full">
      {/* Category Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-emerald-100 pb-4">
        <div className="flex items-center gap-2 bg-emerald-100/60 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => { setActiveTab('welfare'); setSourceFilter('all'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'welfare'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-emerald-900/70 hover:text-emerald-900 hover:bg-white/50'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            순천시 복지·혜택
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'welfare' ? 'bg-emerald-700/80 text-white' : 'bg-emerald-200/70 text-emerald-800'
            }`}>
              {welfareList.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('notice'); setSourceFilter('all'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'notice'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Bell className="w-4 h-4" />
            순천 일반 공지사항
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'notice' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {noticeList.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('gov24'); setSourceFilter('all'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'gov24'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-emerald-900/70 hover:text-emerald-900 hover:bg-white/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            공공서비스(보조금24)
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'gov24' ? 'bg-emerald-800 text-white' : 'bg-emerald-200/70 text-emerald-800'
            }`}>
              {gov24Items.length}
            </span>
          </button>
        </div>

        {/* Refresh & status */}
        <div className="flex items-center gap-3 text-xs text-slate-500 self-end sm:self-center">
          <span>갱신: {updatedTime}</span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all font-medium text-slate-600 disabled:opacity-50"
            title="실시간 크롤링 새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
        {/* Source Pills (for crawled tabs) */}
        {activeTab !== 'gov24' ? (
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-400 mr-1">기관 선택:</span>
            {sources.map(s => {
              const isSelected = sourceFilter === s.key;
              const count = s.key === 'all'
                ? currentItems.length
                : currentItems.filter(i => i.source === s.key).length;

              return (
                <button
                  key={s.key}
                  onClick={() => setSourceFilter(s.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.label} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-medium">
            행정안전부 공공서비스 API 연동 데이터입니다.
          </div>
        )}

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="제목, 내용, 기관 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Crawled items view (Welfare or Notice) */}
      {activeTab !== 'gov24' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => (
              <div
                key={`${item.id || 'item'}-${idx}`}
                className="group rounded-2xl border border-emerald-100/90 bg-white p-6 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Top decorative stripe for welfare */}
                {item.category === 'welfare' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                )}

                <div>
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 border-slate-200">
                      {item.source}
                    </span>

                    {item.category === 'welfare' ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        복지·지원 혜택
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium bg-slate-50 text-slate-600 border-slate-200">
                        <Bell className="w-3 h-3 text-slate-400" />
                        일반공지
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-base md:text-lg leading-snug text-slate-800 group-hover:text-emerald-700 transition-colors break-keep line-clamp-2 mb-2">
                    {item.title}
                  </h3>

                  {/* Reason / AI Insight */}
                  {item.reason && (
                     <div className="mb-4 text-xs rounded-xl p-2.5 bg-emerald-50/50 border border-emerald-100/60 text-emerald-900/80 leading-relaxed flex items-start gap-1.5">
                      <span className="font-bold text-emerald-700 shrink-0">분류:</span>
                      <span>{item.reason}</span>
                    </div>
                  )}
                </div>

                {/* Metadata & Footer link */}
                <div className="pt-4 border-t border-slate-100 mt-2 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.date}
                    </span>
                    {item.dept && (
                      <span className="truncate max-w-[100px]">{item.dept}</span>
                    )}
                  </div>

                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                  >
                    원문보기
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">조건에 맞는 게시물이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">검색어나 기관 필터를 변경해 보세요.</p>
            </div>
          )}
        </div>
      ) : (
        /* Gov24 items view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGov24.length > 0 ? (
            filteredGov24.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-emerald-100 bg-white text-slate-800 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between p-6"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                      {item.소관기관명 || item.jrsdDptAllNm || '정부/지자체'}
                    </span>
                    {item.서비스분야 && (
                      <span className="text-xs text-slate-400">
                        {item.서비스분야}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg leading-snug break-keep text-emerald-800 pt-1 mb-2">
                    {item.서비스명 || item.svcNm || '정책 이름 없음'}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {item.서비스목적요약 || item.서비스목적 || item.지원내용 || item.svcPpo || '상세 내용이 제공되지 않았습니다.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                  {item.지원유형 ? (
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 font-medium bg-slate-100 text-slate-700 border-slate-200">
                      {item.지원유형}
                    </span>
                  ) : <span />}
                  {item.상세조회URL && (
                    <a
                      href={item.상세조회URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      상세보기 &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500">
              <p className="font-medium text-slate-600">등록된 공공서비스 데이터가 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
