'use client';

import React, { useEffect } from 'react';
import { Sparkles, CheckCircle2, Users, Info, ExternalLink, X, Loader2, Calendar } from 'lucide-react';
import { AiSummaryResult } from '@/lib/summarizer';

interface AiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  source?: string;
  dept?: string;
  url?: string;
  summary: AiSummaryResult | null;
  isLoading: boolean;
}

export default function AiSummaryModal({
  isOpen,
  onClose,
  title,
  source,
  dept,
  url,
  summary,
  isLoading
}: AiSummaryModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                AI 핵심 요약
              </span>
              {source && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                  {source}
                </span>
              )}
              {dept && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  {dept}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
            {title}
          </h2>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-8 space-y-4">
              <div className="flex items-center justify-center gap-2.5 text-emerald-700 font-bold text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span>AI가 핵심 내용을 요약 분석하고 있습니다...</span>
              </div>
              <div className="space-y-2.5 max-w-md mx-auto pt-2">
                <div className="h-4 bg-emerald-50 rounded-md w-full animate-pulse"></div>
                <div className="h-4 bg-emerald-50 rounded-md w-5/6 mx-auto animate-pulse"></div>
                <div className="h-4 bg-emerald-50 rounded-md w-4/6 mx-auto animate-pulse"></div>
              </div>
            </div>
          ) : summary ? (
            <>
              {/* Headline Callout */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 font-bold text-sm sm:text-base leading-relaxed">
                &ldquo;{summary.headline}&rdquo;
              </div>

              {/* 3 Bullets */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  핵심 3줄 요약
                </h3>
                <div className="space-y-2.5">
                  {summary.bullets.map((bullet, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target, Deadline & Tip Grid */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                {summary.deadline && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
                    <Calendar className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-emerald-950 block mb-0.5">신청 / 마감 기한</span>
                      <span className="text-xs sm:text-sm font-semibold text-emerald-900 leading-relaxed">
                        {summary.deadline}
                      </span>
                    </div>
                  </div>
                )}

                {summary.targetAudience && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/70">
                    <Users className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-sky-950 block mb-0.5">추천 대상</span>
                      <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {summary.targetAudience}
                      </span>
                    </div>
                  </div>
                )}

                {summary.tip && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-amber-950 block mb-0.5">신청 안내 및 유의사항</span>
                      <span className="text-xs sm:text-sm text-amber-900 leading-relaxed">
                        {summary.tip}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              요약 정보를 불러올 수 없습니다.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3">
          {url && url !== '#' ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              <span>공고 원문 바로가기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <div></div>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
