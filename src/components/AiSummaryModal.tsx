'use client';

import React, { useEffect } from 'react';
import { Sparkles, CheckCircle2, Users, Info, ExternalLink, X, Loader2, Calendar, FileText, Bot } from 'lucide-react';
import { AiSummaryResult } from '@/lib/summarizer';
import { resolveGovDocument } from '@/lib/gov24Documents';

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
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
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
                <span>AI가 핵심 내용과 구비서류를 분석하고 있습니다...</span>
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

              {/* Required Documents Section with Government 24 (정부24) Issuance Links */}
              {summary.requiredDocuments && summary.requiredDocuments.length > 0 && (() => {
                const isNoDocRequired =
                  summary.requiredDocuments.length === 1 &&
                  (summary.requiredDocuments[0].includes('해당없음') ||
                    summary.requiredDocuments[0].includes('별도 제출') ||
                    summary.requiredDocuments[0].includes('서류 없음') ||
                    summary.requiredDocuments[0].includes('불필요'));

                const isUnconfirmedDoc =
                  summary.requiredDocuments.length === 1 &&
                  (summary.requiredDocuments[0].includes('확인 필요') ||
                    summary.requiredDocuments[0].includes('미기재') ||
                    summary.requiredDocuments[0].includes('공고 원문 확인'));

                if (isNoDocRequired) {
                  return (
                    <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs sm:text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>민원인 제출 구비서류: 서류 제출 불필요</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          정부24 확인
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900 leading-relaxed font-medium mb-3">
                        {summary.requiredDocuments[0]}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href={url && url !== '#' ? url : 'https://www.gov.kr'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs group cursor-pointer"
                        >
                          <span>공식 신청 바로가기</span>
                          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                        <a
                          href="https://www.gov.kr"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <span>정부24 공고확인</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                }

                if (isUnconfirmedDoc) {
                  return (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs sm:text-sm">
                          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>구비서류 확인 상태: 공고 원문 확인 필요</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                          원문 확인 요망
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3">
                        공고 원문 요약본에 구비서류 정보가 명시되어 있지 않거나 별도 확인이 필요합니다. 필수 서류 및 제출 자격은 공식 공고문 원본 링크를 직접 확인해 주세요.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href={url && url !== '#' ? url : 'https://www.gov.kr'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors shadow-xs group cursor-pointer"
                        >
                          <span>공고 원문 직접 확인하기</span>
                          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
                        <FileText className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>원문 확인 구비서류 ({summary.requiredDocuments.length}건)</span>
                      </div>
                      <a
                        href="https://www.gov.kr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 font-bold underline shrink-0"
                      >
                        <span>정부24 바로가기</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {summary.requiredDocuments.map((doc, idx) => {
                        const govDoc = resolveGovDocument(doc);
                        return (
                          <div
                            key={idx}
                            className="flex flex-col justify-between p-3 rounded-xl bg-white/95 border border-amber-200/80 text-xs text-amber-950 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-800 leading-snug block">
                                  {doc}
                                </span>
                                {govDoc.badge && (
                                  <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded">
                                    {govDoc.badge}
                                  </span>
                                )}
                              </div>
                            </div>

                            <a
                              href={govDoc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 w-full py-1.5 px-2.5 rounded-lg bg-amber-100/80 hover:bg-amber-600 hover:text-white text-amber-900 font-bold text-[11px] transition-colors mt-auto group cursor-pointer"
                              title={`${doc} - ${govDoc.source} 온라인 발급 및 신청 페이지로 이동`}
                            >
                              <span>{govDoc.source} {govDoc.source === '정부24' ? '신청·발급' : '바로가기'}</span>
                              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </a>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-amber-800/90 mt-3 pt-2 border-t border-amber-200/70 font-medium">
                      정부24 및 공공포털을 통해 주민등록등본, 소득금액증명원 등을 수수료 없이 즉시 온라인 발급 및 전자문서지갑으로 제출하실 수 있습니다.
                    </p>
                  </div>
                );
              })()}

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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              <span>공고 원문 바로가기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('open_ai_chat', {
                      detail: {
                        initialQuery: `${title} 혜택에 대해 1:1 상담받고 싶어요. 지원 요건과 필요 구비서류, 신청 방법을 자세히 알려주세요.`,
                        autoSend: true
                      }
                    })
                  );
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>1:1 AI 상담하기</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
