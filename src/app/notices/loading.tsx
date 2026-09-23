import React from 'react';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';

export default function NoticesLoading() {
  return (
    <div className="flex-1 flex flex-col bg-emerald-50/40 text-slate-800">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header Skeleton */}
        <div className="mb-8 text-center py-10 bg-white rounded-3xl shadow-xs border border-emerald-100 animate-pulse">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            순천시 주요 공지사항 불러오는 중...
          </div>
          <div className="h-9 bg-slate-200 rounded-xl w-64 mx-auto mb-3"></div>
          <div className="h-4 bg-slate-100 rounded-md w-96 mx-auto"></div>
        </div>

        {/* Filter Bar Skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs animate-pulse">
          <div className="flex gap-2 overflow-hidden">
            <div className="h-9 bg-slate-200 rounded-xl w-24"></div>
            <div className="h-9 bg-slate-100 rounded-xl w-28"></div>
            <div className="h-9 bg-slate-100 rounded-xl w-28"></div>
          </div>
        </div>

        {/* Notice Items Skeleton List */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse flex flex-col sm:flex-row justify-between gap-4"
            >
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="h-5 bg-slate-200 rounded-md w-20"></div>
                  <div className="h-5 bg-slate-100 rounded-md w-24"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded-md w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded-md w-40"></div>
              </div>
              <div className="flex sm:flex-col justify-between sm:justify-center gap-2">
                <div className="h-8 bg-slate-200 rounded-xl w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
