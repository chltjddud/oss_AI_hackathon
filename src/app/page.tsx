import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SuncheonWindCanvas from '@/components/SuncheonWindCanvas';
import { Bell, Layers, ArrowRight } from 'lucide-react';

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

          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto mb-12 leading-relaxed">
            순천시민을 위한 실시간 시정 소식과 다양한 공공 지원 정책을 한곳에서 확인하세요.
          </p>

          {/* Exactly TWO Main Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl mx-auto">
            <Link
              href="/notices"
              data-hero-btn="notices"
              className="group p-6 sm:p-8 rounded-3xl bg-white/95 backdrop-blur-xs border-2 border-emerald-200/90 hover:border-emerald-500 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center justify-between relative z-10 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Bell className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-2">
                순천시 공지보기
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                순천시청, 청년센터, 문화재단, 순천대학교의 실시간 공지사항을 확인합니다.
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                <span>공지사항 바로가기</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <Link
              href="/policies"
              data-hero-btn="policies"
              className="group p-6 sm:p-8 rounded-3xl bg-white/95 backdrop-blur-xs border-2 border-emerald-200/90 hover:border-emerald-500 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center justify-between relative z-10 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Layers className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-2">
                순천시 지원보기
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                주거, 일자리, 문화, 보육 등 순천시와 중앙정부의 맞춤 지원 정책을 확인합니다.
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                <span>지원 정책 바로가기</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
