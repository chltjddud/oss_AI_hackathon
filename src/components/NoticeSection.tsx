'use client';

import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, ExternalLink, Calendar, Bell, Building2, Eye, Sparkles, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { CrawledItem, parseNoticeDateToTimestamp } from '@/lib/crawler';
import AiSummaryModal from '@/components/AiSummaryModal';
import { AiSummaryResult } from '@/lib/summarizer';

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

const ITEMS_PER_PAGE = 20;

export default function NoticeSection({
  initialNotices,
  lastUpdated
}: NoticeSectionProps) {
  const [noticeList, setNoticeList] = useState<CrawledItem[]>(initialNotices);
  const [updatedTime, setUpdatedTime] = useState<string>(lastUpdated);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeModalNotice, setActiveModalNotice] = useState<{ notice: CrawledItem; itemKey: string } | null>(null);
  const [summaries, setSummaries] = useState<Record<string, AiSummaryResult>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});

  const handleOpenSummary = async (notice: CrawledItem, itemKey: string) => {
    setActiveModalNotice({ notice, itemKey });

    if (summaries[itemKey] || loadingSummaries[itemKey]) {
      return;
    }

    try {
      setLoadingSummaries(prev => ({ ...prev, [itemKey]: true }));
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notice.id || notice.title,
          title: notice.title,
          source: notice.source,
          dept: notice.dept,
          description: notice.reason,
          date: notice.date,
          url: notice.link,
          type: 'notice'
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.summary) {
          setSummaries(prev => ({ ...prev, [itemKey]: json.summary }));
        }
      }
    } catch (err) {
      console.error('Failed to summarize notice:', err);
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [itemKey]: false }));
    }
  };

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
    const list = noticeList.filter(item => {
      const matchesSource = selectedSource === 'all' || item.source === selectedSource;
      const lowerQ = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        item.title.toLowerCase().includes(lowerQ) ||
        (item.dept && item.dept.toLowerCase().includes(lowerQ)) ||
        (item.source && item.source.toLowerCase().includes(lowerQ));
      return matchesSource && matchesSearch;
    });

    // 날짜 최신순(내림차순) 정렬
    list.sort((a, b) => {
      const timeA = parseNoticeDateToTimestamp(a.date);
      const timeB = parseNoticeDateToTimestamp(b.date);
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

    return list;
  }, [noticeList, selectedSource, searchQuery]);

  const totalPages = Math.ceil(filteredNotices.length / ITEMS_PER_PAGE) || 1;

  const paginatedNotices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNotices, currentPage]);

  const handleSelectSource = (src: string) => {
    setSelectedSource(src);
    setCurrentPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

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
                  onClick={() => handleSelectSource(s.value)}
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
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
              />
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all text-xs font-semibold shrink-0 disabled:opacity-50 shadow-xs cursor-pointer"
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
          총 <strong className="text-emerald-700 font-bold">{filteredNotices.length}</strong>건의 공지사항
        </div>
        <div>
          업데이트: <span className="font-medium text-slate-700">{updatedTime}</span>
        </div>
      </div>

      {/* Notice List */}
      <div className="space-y-3">
        {paginatedNotices.length > 0 ? (
          paginatedNotices.map((notice, idx) => {
            const itemKey = `notice-${notice.source}-${notice.id || idx}-${idx}`;

            return (
              <div
                key={itemKey}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col justify-between group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 shrink-0">
                    <button
                      onClick={() => handleOpenSummary(notice, itemKey)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI 3줄 요약</span>
                    </button>

                    <a
                      href={notice.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
                    >
                      공고 원문
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <p className="font-medium text-slate-600 mb-2">검색 결과에 맞는 공지사항이 없습니다.</p>
            <p className="text-xs text-slate-400">다른 검색어를 입력하거나 기관 필터를 '전체 공지'로 변경해 보세요.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls (20 per page) */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-200">
          <div className="text-xs sm:text-sm text-slate-500">
            총 <strong className="text-emerald-700 font-bold">{filteredNotices.length}</strong>건 중 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredNotices.length)}건 표시 (페이지 {currentPage} / {totalPages})
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
      {activeModalNotice && (
        <AiSummaryModal
          isOpen={Boolean(activeModalNotice)}
          onClose={() => setActiveModalNotice(null)}
          title={activeModalNotice.notice.title}
          source={activeModalNotice.notice.source}
          dept={activeModalNotice.notice.dept}
          url={activeModalNotice.notice.link}
          summary={summaries[activeModalNotice.itemKey] || null}
          isLoading={Boolean(loadingSummaries[activeModalNotice.itemKey])}
        />
      )}
    </div>
  );
}
