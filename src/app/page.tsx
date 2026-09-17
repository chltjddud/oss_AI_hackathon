import React from 'react';
import Image from 'next/image';
import { fetchPublicBenefits } from '@/lib/api';
import { getCrawledData } from '@/lib/crawler';
import CrawledSection from '@/components/CrawledSection';

export const revalidate = 600; // 10 minutes

export default async function Home() {
  // Fetch real data from APIs
  const benefitsData = await fetchPublicBenefits(1, 18);
  const items = benefitsData?.data || [];

  const crawledData = await getCrawledData(false);
  const formattedTime = new Date(crawledData.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen flex flex-col bg-emerald-50 text-slate-800">
      <header className="sticky top-0 z-50 w-full border-b border-emerald-200 bg-white/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center px-4">
          <div className="flex items-center gap-3">
            <Image
              src="/suncheon-logo.svg"
              alt="순천시 CI 로고"
              width={75}
              height={32}
              style={{ width: 'auto', height: '32px' }}
              priority
            />
            <span className="font-bold text-lg text-emerald-700 tracking-tight">순천시 에코 혜택 모음</span>
          </div>
          <nav className="ml-auto flex items-center gap-4 text-sm font-medium">
            <a href="#" className="transition-colors hover:text-emerald-500 text-slate-600">맞춤혜택 찾기</a>
            <a href="#" className="transition-colors hover:text-emerald-500 text-slate-600">분야별 정책</a>
            <a href="#" className="transition-colors hover:text-emerald-500 text-slate-600">공지사항</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <section className="mb-12 text-center py-12 bg-white rounded-3xl mt-4 shadow-sm border border-emerald-100">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 text-slate-800">
            자연과 함께하는 <span className="text-emerald-500">순천의 혜택</span>
          </h1>
          <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto">
            순천시와 전국에서 지원하는 맞춤형 혜택들을 한눈에 확인하세요.
          </p>
          <div className="flex justify-center gap-4">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-emerald-500 text-white shadow hover:bg-emerald-600 h-10 px-8 py-2">
              내 맞춤 혜택 찾기
            </button>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-emerald-200 bg-white shadow-sm hover:bg-emerald-50 text-emerald-600 h-10 px-8 py-2">
              전체 혜택 보기
            </button>
          </div>
        </section>

        <section className="mb-12">
          <CrawledSection
            initialWelfare={crawledData.welfare}
            initialNotice={crawledData.notice}
            gov24Items={items}
            lastUpdated={formattedTime}
          />
        </section>
      </main>
      
      <footer className="border-t py-6 md:py-0 bg-emerald-900">
        <div className="container mx-auto flex flex-col items-center justify-center h-16 px-4 text-sm text-emerald-200">
          <p>
            © 2026 순천시 혜택 모음. Open Source AI Hackathon.
          </p>
        </div>
      </footer>
    </div>
  );
}
