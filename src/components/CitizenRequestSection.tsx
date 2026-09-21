'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MessageSquarePlus,
  Plus,
  ThumbsUp,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  User,
  AlertCircle
} from 'lucide-react';

export interface CitizenRequest {
  id: string;
  title: string;
  category: string;
  content: string;
  expected_effect?: string;
  author_name: string;
  likes_count: number;
  status: '접수완료' | '검토중' | '시정반영';
  created_at: string;
}

const INITIAL_MOCK_REQUESTS: CitizenRequest[] = [
  {
    id: 'req-1',
    title: '순천 원도심 청년 1인 가구를 위한 공유 커뮤니티 및 공구 대여소 지원',
    category: '청년·주거',
    content: '혼자 자취하는 청년들이 자주 쓰지 않는 전동드릴이나 사다리 등 생활공구를 대여하고, 함께 정보를 나눌 수 있는 거점 공간 지원이 필요합니다.',
    expected_effect: '청년들의 주거비용 및 생활용품 구매비 절감, 지역 청년 네트워크 활성화',
    author_name: '순천청년A',
    likes_count: 28,
    status: '검토중',
    created_at: '2026-09-18',
  },
  {
    id: 'req-2',
    title: '맞벌이 가정을 위한 야간 및 주말 긴급 아이돌봄 바우처 확대',
    category: '육아·교육',
    content: '주말이나 늦은 저녁 급한 야근이 발생할 때 믿고 맡길 수 있는 순천시 지정 긴급 돌봄센터 및 바우처 지원 시간이 늘어났으면 좋겠습니다.',
    expected_effect: '맞벌이 부부의 육아 부담 경감 및 순천시 출산 친화 환경 조성',
    author_name: '해룡면시민',
    likes_count: 42,
    status: '접수완료',
    created_at: '2026-09-17',
  },
  {
    id: 'req-3',
    title: '어르신 대상 스마트폰 및 디지털 키오스크 1:1 방문 교육 지원',
    category: '어르신·복지',
    content: '병원 예약이나 버스 예매 등 디지털화로 불편을 겪는 독거 어르신들을 위해 복지관과 연계한 1:1 찾아가는 스마트 교육 프로그램이 필요합니다.',
    expected_effect: '고령층의 디지털 소외 해소 및 필수 공공 서비스 이용 편의 증대',
    author_name: '조곡동주민',
    likes_count: 35,
    status: '시정반영',
    created_at: '2026-09-15',
  },
  {
    id: 'req-4',
    title: '순천만국가정원 인근 청년 로컬 크리에이터 팝업 스토어 지원',
    category: '일자리·창업',
    content: '순천의 특산물과 생태 자원을 활용해 창업한 청년 소상공인들이 관광객을 대상으로 상품을 홍보하고 판매할 수 있는 주말 플리마켓/팝업 공간을 지원해주세요.',
    expected_effect: '청년 창업가 판로 개척 및 순천 생태 관광 상품 다양화',
    author_name: '청년창업가',
    likes_count: 19,
    status: '검토중',
    created_at: '2026-09-14',
  }
];

const CATEGORIES = [
  '전체 분야',
  '청년·주거',
  '육아·교육',
  '일자리·창업',
  '어르신·복지',
  '교통·안전',
  '문화·체육',
  '환경·생태'
];

export default function CitizenRequestSection() {
  const [requests, setRequests] = useState<CitizenRequest[]>(INITIAL_MOCK_REQUESTS);
  const [selectedCategory, setSelectedCategory] = useState('전체 분야');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [likedMap, setLikedMap] = useState<{ [id: string]: boolean }>({});

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '청년·주거',
    content: '',
    expected_effect: '',
    author_name: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load from Supabase (with fallback to localStorage)
  useEffect(() => {
    async function loadRequests() {
      try {
        const { data, error } = await supabase
          .from('citizen_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setRequests(data);
          return;
        }
      } catch (err) {
        console.log('Supabase load note:', err);
      }

      // Check localStorage fallback
      const saved = localStorage.getItem('suncheon_citizen_requests');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRequests(parsed);
          }
        } catch (e) {
          // ignore
        }
      }
    }

    loadRequests();
  }, []);

  const handleLike = async (id: string) => {
    if (likedMap[id]) return;

    setLikedMap(prev => ({ ...prev, [id]: true }));
    setRequests(prev =>
      prev.map(item =>
        item.id === id ? { ...item, likes_count: (item.likes_count || 0) + 1 } : item
      )
    );

    // Try Supabase update if possible
    try {
      const target = requests.find(r => r.id === id);
      if (target) {
        await supabase
          .from('citizen_requests')
          .update({ likes_count: (target.likes_count || 0) + 1 })
          .eq('id', id);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    setSubmitting(true);
    setStatusMsg(null);

    const newRequest: CitizenRequest = {
      id: `req-${Date.now()}`,
      title: formData.title,
      category: formData.category,
      content: formData.content,
      expected_effect: formData.expected_effect,
      author_name: formData.author_name || '순천시민',
      likes_count: 0,
      status: '접수완료',
      created_at: new Date().toISOString().split('T')[0],
    };

    // Try Supabase insertion
    try {
      const { error } = await supabase.from('citizen_requests').insert([
        {
          title: newRequest.title,
          category: newRequest.category,
          content: newRequest.content,
          expected_effect: newRequest.expected_effect,
          author_name: newRequest.author_name,
          likes_count: 0,
          status: '접수완료'
        }
      ]);

      if (error) {
        console.warn('Supabase not yet configured, saving locally:', error.message);
      }
    } catch (err) {
      console.warn('Supabase request note:', err);
    }

    // Save locally
    const updated = [newRequest, ...requests];
    setRequests(updated);
    localStorage.setItem('suncheon_citizen_requests', JSON.stringify(updated));

    setStatusMsg({
      type: 'success',
      text: '지원 요청이 성공적으로 접수되었습니다. 순천시정 검토에 소중히 활용됩니다.'
    });

    setFormData({
      title: '',
      category: '청년·주거',
      content: '',
      expected_effect: '',
      author_name: '',
    });

    setTimeout(() => {
      setIsModalOpen(false);
      setStatusMsg(null);
    }, 1200);

    setSubmitting(false);
  };

  const filteredRequests = requests.filter(req => {
    const matchesCategory = selectedCategory === '전체 분야' || req.category === selectedCategory;
    const lowerQ = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      req.title.toLowerCase().includes(lowerQ) ||
      req.content.toLowerCase().includes(lowerQ) ||
      req.author_name.toLowerCase().includes(lowerQ);

    return matchesCategory && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    if (status === '시정반영') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          시정반영
        </span>
      );
    }
    if (status === '검토중') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3 text-amber-600" />
          검토중
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
        접수완료
      </span>
    );
  };

  return (
    <div className="w-full text-slate-800">
      {/* Header Banner */}
      <div className="text-center py-10 bg-white rounded-3xl border border-emerald-100 shadow-xs mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          순천시민 정책 제안 창구
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          순천에 <span className="text-emerald-600">이런 복지 필요해요</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto px-4 mb-6">
          시민의 일상에서 꼭 필요한 맞춤 복지 정책을 직접 제안해주세요. 시민 공감도가 높은 제안은 순천시정에 적극 검토됩니다.
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          복지 정책 제안하기
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="제안 제목, 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req, idx) => (
            <div
              key={`req-${req.id}-${idx}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-emerald-300 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {req.category}
                  </span>
                  {getStatusBadge(req.status)}
                </div>
                <span className="text-xs text-slate-400">{req.created_at}</span>
              </div>

              <h3 className="font-bold text-base sm:text-lg text-slate-900 mb-2">
                {req.title}
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {req.content}
              </p>

              {req.expected_effect && (
                <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <span className="font-bold text-slate-800 mr-1.5">기대 효과:</span>
                  <span>{req.expected_effect}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>작성자: {req.author_name}</span>
                </div>

                <button
                  onClick={() => handleLike(req.id)}
                  disabled={likedMap[req.id]}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    likedMap[req.id]
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-slate-200 hover:border-emerald-300 hover:text-emerald-700 bg-white'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${likedMap[req.id] ? 'fill-emerald-600 text-emerald-600' : ''}`} />
                  <span>공감 {req.likes_count}</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <p className="font-medium text-slate-600 mb-2">등록된 제안이 없습니다.</p>
            <p className="text-xs text-slate-400 mb-4">순천시에 바라는 첫 번째 지원 제안을 남겨보세요.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700"
            >
              새로운 제안 작성하기
            </button>
          </div>
        )}
      </div>

      {/* Modal: Write Proposal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">순천시에 복지 제안하기</h2>
              <p className="text-xs text-slate-500 mt-1">
                순천시와 함께 만들어갈 실질적인 복지 및 혜택 아이디어를 자유롭게 제안해 주세요.
              </p>
            </div>

            {statusMsg && (
              <div className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 border ${
                statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  제안 제목 <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 청년 1인 가구를 위한 생활공구 대여소 지원"
                  value={formData.title}
                  onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    지원 희망 분야 <span className="text-emerald-600">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    {CATEGORIES.filter(c => c !== '전체 분야').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">작성자 닉네임</label>
                  <input
                    type="text"
                    placeholder="예: 순천시민"
                    value={formData.author_name}
                    onChange={(e) => setFormData(p => ({ ...p, author_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  필요한 지원 내용 <span className="text-emerald-600">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="어떤 지원이 왜 필요한지 구체적인 상황을 적어주세요."
                  value={formData.content}
                  onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  기대 효과 (선택사항)
                </label>
                <input
                  type="text"
                  placeholder="이 지원이 시행되면 어떤 점이 좋아지나요?"
                  value={formData.expected_effect}
                  onChange={(e) => setFormData(p => ({ ...p, expected_effect: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-all shadow-xs"
                >
                  {submitting ? '등록 중...' : '제안 등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
