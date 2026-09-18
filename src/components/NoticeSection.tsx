'use client';

import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, ExternalLink, Calendar, Bell, Building2, Eye, Filter } from 'lucide-react';
import { CrawledItem } from '@/lib/crawler';

interface NoticeSectionProps {
  initialNotices: CrawledItem[];
  lastUpdated: string;
}

const SOURCES = [
  { label: '전체 공지', value: 'all' },
  { label: '순천시청', value: '순천시청' },
  { label: '순천청년정책', value: '순천청년정책' },
  { label: '순천문화재단', value: '순천문화재단' },
  { label: '국립순천대학교', value: '순천대학교' },
];

export default function NoticeSection({
  initialNotices,
  lastUpdated
}: NoticeSectionProps) {
  const [noticeList, setNoticeList] = useState<CrawledItem[]>(initialNotices);
  const [updatedTime, setUpdatedTime] = useState<string>(lastUpdated);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/crawl?refresh=true');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.notice) {
          setNoticeList(json.notice);
          setUpdatedTime(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch (err) {
      console.error('Failed to refresh notices:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredNotices = useMemo(() => {
    return noticeList.filter(item => {
      const matchesSource = selectedSource === 'all' || item.source === selectedSource;
      const lowerQ = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        item.title.toLowerCase().includes(lowerQ) ||
        (item.dept && item.dept.toLowerCase().includes(lowerQ)) ||
        (item.source && item.source.toLowerCase().includes(lowerQ));
      return matchesSource && matchesSearch;
    });
  }, [noticeList, selectedSource, searchQuery]);

  const getSourceCount = (src: string) => {
    if (src === 'all') return noticeList.length;
    return noticeList.filter(i => i.source === src).length;
  };

  return (
    <div className="w-full text-slate-800">
      {/* Hero Header */}
      <div className="mb-8 text-center py-10 bg-white rounded-3xl shadow-xs border border-emerald-100">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
          <Bell className="w-3.5 h-3.5 text-emerald-600" />
          순천시 주요 기관 실시간 소식
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-slate-900">
          순천시 <span className="text-emerald-600">공지보기</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto px-4">
          순천시청 시정소식, 청년정책, 순천문화재단, 국립순천대학교의 최신 공지사항을 한자리에서 실시간으로 확인하세요.
        </p>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Source Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {SOURCES.map(s => {
              const isSelected = selectedSource === s.value;
              const count = getSourceCount(s.value);
              return (
                <button
                  key={s.value}
                  onClick={() => setSelectedSource(s.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {s.label}
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white text-emerald-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Refresh and Search */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="공지 제목, 부서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
              />
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all text-xs font-semibold shrink-0 disabled:opacity-50 shadow-xs"
              title="최신 공지 데이터 새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">새로고침</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mb-4 px-1 text-xs sm:text-sm text-slate-500">
        <div>
          총 <strong className="text-emerald-700 font-bold">{filteredNotices.length}</strong>건의 공지사항이 있습니다.
        </div>
        <div>
          동기화 시각: <span className="font-medium text-slate-700">{updatedTime}</span>
        </div>
      </div>

      {/* Notice List */}
      <div className="space-y-3">
        {filteredNotices.length > 0 ? (
          filteredNotices.map((notice, idx) => (
            <div
              key={`notice-${notice.source}-${notice.id || idx}-${idx}`}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {notice.source}
                  </span>
                  {notice.dept && (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                      {notice.dept}
                    </span>
                  )}
                  {notice.reason && (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs text-slate-500 bg-slate-50 border border-slate-100">
                      {notice.reason}
                    </span>
                  )}
                </div>

                <a
                  href={notice.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2"
                >
                  {notice.title}
                </a>

                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {notice.date || '날짜 미상'}
                  </span>
                  {notice.views && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      조회 {notice.views}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 shrink-0">
                <a
                  href={notice.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
                >
                  공고 원문보기
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <p className="font-medium text-slate-600 mb-2">검색 결과에 맞는 공지사항이 없습니다.</p>
            <p className="text-xs text-slate-400">다른 검색어를 입력하거나 기관 필터를 '전체 공지'로 변경해 보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
