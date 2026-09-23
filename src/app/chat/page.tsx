'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Bot,
  Send,
  Sparkles,
  RotateCcw,
  ExternalLink,
  Layers,
  Bookmark,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { ChatMessage } from '@/lib/chatbot';

const PRESET_TOPICS = [
  {
    title: '청년 주거 & 월세 지원',
    desc: '순천시 거주 청년 월세 특별지원 및 보증금 대출 이자 지원',
    query: '순천에 거주하는 만 19세~34세 청년인데 월세 지원 혜택이 어떻게 되나요?'
  },
  {
    title: '신혼부부 정착 지원금',
    desc: '신혼부부 결혼 축하금 및 주거 디딤돌 대출',
    query: '순천시로 전입하는 신혼부부인데 정착 지원금 요건과 금액을 알려주세요.'
  },
  {
    title: '대학생 장학금 & 취업 지원',
    desc: '순천인재육성장학금 및 청년 자격증 응시료 지원',
    query: '순천 지역 대학생이 받을 수 있는 장학금이나 자격증 응시료 지원 사업이 있나요?'
  },
  {
    title: '청년 창업 & 소상공인 지원',
    desc: '순천 창업보육 및 소상공인 특례보증 대출 이자 지원',
    query: '순천에서 창업을 준비 중인데 받을 수 있는 창업 지원금이나 공간 대여 혜택이 궁금해요.'
  },
  {
    title: '임신·출산 축하금 및 보육',
    desc: '순천시 출생아 축하금 및 첫만남이용권 바우처',
    query: '순천시 출산 축하금 지원 금액과 신청 절차를 안내해 주세요.'
  }
];

const INITIAL_GREETING: ChatMessage = {
  id: 'init-fullscreen',
  role: 'assistant',
  content: '반갑습니다! 순천시민을 위한 1:1 맞춤 혜택 전문 AI 상담사입니다.\n\n나이, 직업, 주거 형태, 현재 겪고 계신 고민이나 지원이 필요한 분야에 대해 편안하게 말씀해 주시면, 150여 건의 순천시 공공 정책 DB를 정밀 분석하여 적합한 혜택을 1:1로 안내해 드리겠습니다.',
  createdAt: new Date().toISOString()
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedPolicyIds, setSavedPolicyIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const isLoadingRef = useRef<boolean>(isLoading);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('suncheon_saved_policies');
      if (raw) setSavedPolicyIds(JSON.parse(raw));
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const initialQ = params.get('q') || params.get('policy');
    if (initialQ) {
      setTimeout(() => {
        handleSend(`${initialQ} 혜택에 대해 1:1 상담받고 싶어요. 지원 요건과 필요 구비서류, 신청 방법을 자세히 알려주세요.`);
      }, 300);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
          content: data.error || '상담 답변을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error('Chat counseling error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '서버와의 통신이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-6xl flex flex-col">
        {/* Page Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>1:1 AI 맞춤 행정 복지 상담</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              순천 복지 도우미 <span className="text-emerald-600">1:1 실시간 상담</span>
            </h1>
          </div>

          <button
            onClick={() => setMessages([INITIAL_GREETING])}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>대화 내용 초기화</span>
          </button>
        </div>

        {/* Chat Layout: Left Presets Sidebar (Desktop) + Right Chat Window */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[620px]">
          {/* Sidebar: Recommended Topics */}
          <div className="hidden lg:flex lg:col-span-4 flex-col gap-3">
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>자주 묻는 상담 주제</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                주제를 클릭하시면 해당 내용으로 바로 상담이 시작됩니다.
              </p>

              <div className="space-y-2">
                {PRESET_TOPICS.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(topic.query)}
                    className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-700">
                        {topic.title}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-emerald-600 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {topic.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900 leading-relaxed">
              <span className="font-bold block mb-1">안내사항</span>
              순천시청, 청년센터, 문화재단 및 정부 복지 공공데이터 150여 건을 실시간 대조하여 답변합니다. 구체적인 조건은 공고 원문을 확인해 주세요.
            </div>

            <div className="p-4 rounded-3xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-950 leading-relaxed">
              <span className="font-bold block mb-1 text-amber-900">법적 책임 고지 및 유의사항</span>
              본 AI 상담은 공공데이터 안내를 돕는 참고용 서비스이며, 인공지능 특성상 부정확하거나 실수가 있을 수 있습니다. 본 서비스의 답변은 어떠한 법적 효력이나 책임을 지지 않으므로, 정확한 자격 요건 및 신청 절차는 반드시 지자체 및 관계 기관의 공식 공고를 확인하시기 바랍니다.
            </div>
          </div>

          {/* Main Chat Window */}
          <div className="lg:col-span-8 flex flex-col bg-white rounded-3xl border-2 border-emerald-200/90 shadow-md overflow-hidden min-h-[580px]">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>순천 복지 도우미 AI</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    1:1 실시간 맞춤 상담 진행 중
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/50">
              {messages.map((msg) => {
                const isBot = msg.role === 'assistant';

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isBot ? 'items-start' : 'items-end justify-end'}`}
                  >
                    {isBot && (
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[78%] space-y-3 ${isBot ? 'text-left' : 'text-right'}`}>
                      <div
                        className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                          isBot
                            ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                            : 'bg-emerald-600 text-white rounded-tr-xs font-medium'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Policy Recommendation Cards */}
                      {isBot && msg.suggestedPolicies && msg.suggestedPolicies.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-emerald-600" />
                            <span>추천 순천시 복지 혜택</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.suggestedPolicies.map((p) => {
                              const isSaved = savedPolicyIds.includes(p.id);

                              return (
                                <div
                                  key={p.id}
                                  className="p-3 rounded-2xl bg-white border border-emerald-200 shadow-2xs hover:border-emerald-400 transition-all text-left flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="text-[10px] font-bold text-emerald-800 mb-0.5">
                                      {p.org || '순천시'}
                                    </div>
                                    <h5 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                                      {p.title}
                                    </h5>
                                    {p.target && (
                                      <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                                        {p.target}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <button
                                      onClick={(e) => toggleBookmark(p.id, e)}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                                        isSaved
                                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-amber-600'
                                      }`}
                                    >
                                      <Bookmark className="w-3 h-3" />
                                      <span>{isSaved ? '보관됨' : '보관'}</span>
                                    </button>

                                    {p.url && (
                                      <Link
                                        href={p.url}
                                        target={p.url.startsWith('http') ? '_blank' : undefined}
                                        rel={p.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                                      >
                                        <span>공고 확인</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Bot className="w-4 h-4 animate-spin-slow" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-emerald-200 text-xs sm:text-sm text-slate-500 rounded-tl-xs flex items-center gap-2 shadow-2xs">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span>순천시 150+ 공공 정책 DB를 확인하여 상담 내용을 작성하고 있습니다...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-white border-t border-slate-200/90">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-3"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="예: 25살 취업 준비생인데 순천시에서 받을 수 있는 지원금 있어?"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-60 bg-slate-50/60"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">전송</span>
                </button>
              </form>
              <p className="mt-2 text-[11px] text-slate-400 text-center font-medium leading-relaxed">
                인공지능 모델 특성상 답변에 실수가 있을 수 있으며 어떠한 법적 효력이나 책임을 지지 않습니다. 최종 신청 전 순천시청 공식 공고문을 확인해 주세요.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
