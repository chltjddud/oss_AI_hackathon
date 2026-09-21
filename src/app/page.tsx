import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SuncheonWindCanvas from '@/components/SuncheonWindCanvas';
import { Bell, Layers, ArrowRight, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/40 via-white to-slate-50 text-slate-800 relative overflow-hidden">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 relative">
        <SuncheonWindCanvas />

        <div className="max-w-3xl w-full text-center relative z-10">
          {/* Suncheon City Logo Badge */}
          <div className="inline-flex items-center justify-center p-3 rounded-3xl bg-white border border-emerald-200/80 shadow-xs mb-8">
            <Image
              src="/suncheon-logo.svg"
              alt="순천시 로고"
              width={130}
              height={55}
              className="h-12 w-auto"
              priority
            />
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
            순천시 혜택 모음
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto mb-10 leading-relaxed">
            순천시민을 위한 실시간 시정 소식과 다양한 공공 지원 정책을 한곳에서 확인하세요.
          </p>

          {/* 1. AI 맞춤 검색하기 (전용 메인 버튼) */}
          <div className="mb-5 max-w-xl mx-auto">
            <Link
              href="/custom-search"
              prefetch={true}
              data-hero-btn="custom-search"
              className="group block p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-700/20 hover:shadow-2xl hover:shadow-emerald-700/30 transition-all duration-300 relative overflow-hidden hover:-translate-y-1 border-2 border-emerald-400/50 text-left"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 group-hover:rotate-6 transition-transform">
                    <Sparkles className="w-7 h-7 text-emerald-100 animate-pulse" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold text-white mb-1.5">
                      <span>AI 상황별 실시간 매칭</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      맞춤 검색하기
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                      자신의 상황을 검색하면 AI가 거기에 맞는 맞춤 공지나 혜택을 알려줍니다.
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white text-emerald-800 text-xs sm:text-sm font-extrabold shadow-sm group-hover:bg-emerald-50 transition-colors shrink-0">
                  <span>맞춤 검색 시작</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>

          {/* 2. 기존 공지보기 및 복지보기 2열 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl mx-auto">
            <Link
              href="/notices"
              prefetch={true}
              data-hero-btn="notices"
              className="group p-6 sm:p-7 rounded-3xl bg-white/95 backdrop-blur-xs border-2 border-emerald-200/90 hover:border-emerald-500 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center justify-between relative z-10 hover:-translate-y-1"
            >
              <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Bell className="w-6 h-6" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-1.5">
                순천시 공지보기
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                순천시청, 청년센터, 문화재단, 순천대의 실시간 공지사항을 확인합니다.
              </p>
              <div className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                <span>공지사항 바로가기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              href="/policies"
              prefetch={true}
              data-hero-btn="policies"
              className="group p-6 sm:p-7 rounded-3xl bg-white/95 backdrop-blur-xs border-2 border-emerald-200/90 hover:border-emerald-500 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center justify-between relative z-10 hover:-translate-y-1"
            >
              <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Layers className="w-6 h-6" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-1.5">
                순천시 복지보기
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                주거, 일자리, 문화, 보육 등 순천시와 정부의 맞춤 복지 정책을 확인합니다.
              </p>
              <div className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                <span>복지 정책 바로가기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
