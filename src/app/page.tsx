import React from 'react';
import Image from 'next/image';
import { fetchPublicBenefits, fetchYouthPolicies } from '@/lib/api';

export default async function Home() {
  // Fetch real data from APIs
  const benefitsData = await fetchPublicBenefits(1, 6);
  // Optional: fetch youth policies as well
  // const youthData = await fetchYouthPolicies(1, 6);

  // Extract the list from the public data portal response
  // Typically it's in data.data or data.response.body.items
  const items = benefitsData?.data || [];

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

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.length > 0 ? (
            items.map((item: any, index: number) => (
              <div key={index} className="rounded-xl border border-emerald-100 bg-white text-slate-800 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between">
                <div className="flex flex-col space-y-2 p-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                      {item.소관기관명 || item.jrsdDptAllNm || '국가/지자체'}
                    </span>
                    {item.서비스분야 && (
                      <span className="text-xs text-slate-400">
                        {item.서비스분야}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg leading-snug break-keep text-emerald-800 pt-1">
                    {item.서비스명 || item.svcNm || '정책 이름 없음'}
                  </h3>
                  <p className="text-sm text-slate-600 pt-1 line-clamp-3 leading-relaxed">
                    {item.서비스목적요약 || item.서비스목적 || item.지원내용 || item.svcPpo || '상세 내용이 제공되지 않았습니다.'}
                  </p>
                </div>
                <div className="p-6 pt-0 flex items-center justify-between gap-2 border-t border-slate-50 mt-auto pt-4">
                  {item.지원유형 ? (
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 border-slate-200">
                      {item.지원유형}
                    </span>
                  ) : <span />}
                  {item.상세조회URL && (
                    <a
                      href={item.상세조회URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      상세보기 &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 text-slate-500">
              데이터를 불러오는 중이거나 아직 API 키 승인이 완료되지 않았습니다.
            </div>
          )}
        </section>
      </main>
      
      <footer className="border-t py-6 md:py-0 bg-muted/20">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4 text-sm text-muted-foreground">
          <p>
            © 2026 순천시 혜택 모음. Open Source AI Hackathon.
          </p>
        </div>
      </footer>
    </div>
  );
}
