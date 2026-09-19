import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';

export default function PoliciesLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-emerald-50/40 text-slate-800">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8">
        {/* Hero Header Skeleton */}
        <div className="mb-8 text-center py-10 bg-white rounded-3xl shadow-xs border border-emerald-100 animate-pulse">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            순천시 지원 정책 불러오는 중...
          </div>
          <div className="h-9 bg-slate-200 rounded-xl w-64 mx-auto mb-3"></div>
          <div className="h-4 bg-slate-100 rounded-md w-96 mx-auto"></div>
        </div>

        {/* Tab & Filter Bar Skeletons */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs animate-pulse">
          <div className="flex gap-2 overflow-hidden">
            <div className="h-9 bg-slate-200 rounded-xl w-28"></div>
            <div className="h-9 bg-slate-100 rounded-xl w-32"></div>
            <div className="h-9 bg-slate-100 rounded-xl w-32"></div>
            <div className="h-9 bg-slate-100 rounded-xl w-36"></div>
          </div>
        </div>

        {/* Cards Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse flex flex-col justify-between h-56"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="h-5 bg-slate-200 rounded-md w-20"></div>
                  <div className="h-5 bg-slate-100 rounded-md w-16"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded-md w-5/6 mb-3"></div>
                <div className="h-16 bg-slate-50 rounded-xl w-full"></div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <div className="h-4 bg-slate-100 rounded-md w-24"></div>
                <div className="h-4 bg-slate-200 rounded-md w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
