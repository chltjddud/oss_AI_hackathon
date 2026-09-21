'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  RotateCcw,
  ExternalLink,
  Layers,
  ChevronDown,
  Maximize2,
  Bot,
  User,
  Bookmark
} from 'lucide-react';
import { ChatMessage } from '@/lib/chatbot';

const ICEBREAKER_PROMPTS = [
  '만 19~34세 청년이 받을 수 있는 순천시 주거 혜택은?',
  '순천시 신혼부부 정착 지원금 조건과 금액 알려줘',
  '대학생 장학금이나 자격증 응시료 지원 사업 있어?',
  '소상공인이나 청년 창업자 지원금 신청 방법'
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init-1',
  role: 'assistant',
  content: '안녕하세요! 순천시민을 위한 1:1 맞춤 혜택 전문 AI 상담사입니다.\n\n나이, 직업, 가구 형태나 현재 고민 중이신 분야(월세 지원, 창업 자금, 장학금, 출산/보육 등)에 대해 자유롭게 질문해 주시면, 150여 건의 순천시 공공 정책 DB와 대조하여 가장 적합한 혜택을 1:1로 안내해 드립니다.',
  createdAt: new Date().toISOString()
};

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedPolicyIds, setSavedPolicyIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load saved bookmarks for quick save action
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('suncheon_saved_policies');
      if (raw) setSavedPolicyIds(JSON.parse(raw));
    } catch {}
  }, [isOpen]);

  const messagesRef = useRef<ChatMessage[]>(messages);
  const isLoadingRef = useRef<boolean>(isLoading);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Listen to open_ai_chat event from anywhere (e.g. Policy cards, AI Summary modal)
  useEffect(() => {
    const handleOpenChatEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ initialQuery?: string; autoSend?: boolean }>;
      const { initialQuery, autoSend } = customEvent.detail || {};
      setIsOpen(true);
      if (initialQuery) {
        if (autoSend) {
          setTimeout(() => {
            handleSend(initialQuery);
          }, 200);
        } else {
          setInputValue(initialQuery);
        }
      }
    };

    window.addEventListener('open_ai_chat', handleOpenChatEvent);
    return () => {
      window.removeEventListener('open_ai_chat', handleOpenChatEvent);
    };
  }, []);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoadingRef.current) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      createdAt: new Date().toISOString()
    };

    const newHistory = [...messagesRef.current, userMsg];
    setMessages(newHistory);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory })
      });

      const data = await res.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          suggestedPolicies: data.suggestedPolicies || [],
          suggestedNotices: data.suggestedNotices || [],
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: data.error || '답변을 생성하는 도중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '네트워크 연결 상태가 불안정합니다. 잠시 후 다시 시도해 주세요.',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = savedPolicyIds.includes(id)
      ? savedPolicyIds.filter(x => x !== id)
      : [...savedPolicyIds, id];
    setSavedPolicyIds(next);
    localStorage.setItem('suncheon_saved_policies', JSON.stringify(next));
    window.dispatchEvent(new Event('bookmark_changed'));
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group border border-emerald-400/40"
          title="1:1 AI 혜택 상담 챗봇 열기"
          aria-label="1:1 AI 혜택 상담 챗봇"
        >
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-emerald-700 animate-ping" />
          </div>
          <span className="text-sm font-extrabold tracking-tight pr-1">
            1:1 AI 혜택 상담
          </span>
        </button>
      )}

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] h-[590px] max-h-[88vh] bg-white rounded-3xl border-2 border-emerald-300/80 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 text-slate-800 select-none">
          {/* Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
                <Bot className="w-5 h-5 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-900" />
              </div>
              <div className="text-left">
                <div className="font-black text-sm flex items-center gap-1.5">
                  <span>순천 복지 도우미 AI</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/40 font-bold border border-emerald-300/30">
                    1:1 상담
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100/90 font-medium">
                  순천시민 맞춤 혜택 전문 비서
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
                title="전체화면 상담 페이지로 이동"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
              <button
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="대화 새로고침"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="창 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
            {messages.map((msg) => {
              const isBot = msg.role === 'assistant';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isBot ? 'items-start' : 'items-end justify-end'}`}
                >
                  {isBot && (
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2.5 ${isBot ? 'text-left' : 'text-right'}`}>
                    {/* Chat Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                        isBot
                          ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                          : 'bg-emerald-600 text-white rounded-tr-xs font-medium'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Policy / Notice Recommended Cards */}
                    {isBot && msg.suggestedPolicies && msg.suggestedPolicies.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          <span>추천 복지 혜택</span>
                        </div>
                        {msg.suggestedPolicies.map((p) => {
                          const isSaved = savedPolicyIds.includes(p.id);

                          return (
                            <div
                              key={p.id}
                              className="p-2.5 rounded-xl bg-white border border-emerald-200/90 shadow-2xs hover:border-emerald-400 transition-all text-left"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="text-[10px] font-bold text-emerald-800 mb-0.5">
                                    {p.org || '순천시'}
                                  </div>
                                  <h5 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                                    {p.title}
                                  </h5>
                                  {p.target && (
                                    <p className="text-[11px] text-slate-500 line-clamp-1">
                                      대상: {p.target}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={(e) => toggleBookmark(p.id, e)}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                      isSaved
                                        ? 'bg-amber-50 text-amber-600 border-amber-300'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-600'
                                    }`}
                                    title={isSaved ? '보관함 해제' : '보관함 담기'}
                                  >
                                    <Bookmark className="w-3.5 h-3.5" />
                                  </button>
                                  {p.url && (
                                    <Link
                                      href={p.url}
                                      target={p.url.startsWith('http') ? '_blank' : undefined}
                                      rel={p.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                      title="원문 공고 확인"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="p-3 rounded-2xl bg-white border border-emerald-200 text-xs text-slate-500 rounded-tl-xs flex items-center gap-2 shadow-2xs">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>순천시 공공 DB 대조 중...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Icebreaker Prompts (shown when only initial message exists) */}
          {messages.length === 1 && (
            <div className="px-4 py-2 bg-white border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 mb-1.5 text-left">
                추천 질문
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ICEBREAKER_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 text-[11px] font-semibold text-left transition-all cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200/90">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="예: 25살 대학생인데 월세 지원돼?"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-60 bg-slate-50/50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
                title="메시지 전송"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-1.5 text-[10px] text-slate-400 text-center">
              순천시 공공 정책 및 실시간 공지사항 150+건 기반 실시간 상담
            </div>
          </div>
        </div>
      )}
    </>
  );
}
