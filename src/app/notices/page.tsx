import React from 'react';
import { getMergedNotices } from '@/lib/crawler';
import Footer from '@/components/Footer';
import NoticeSection from '@/components/NoticeSection';

export const revalidate = 600; // 10 minutes

export default async function NoticesPage() {
  const notices = await getMergedNotices(false);
  const formattedTime = new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="flex-1 flex flex-col bg-emerald-50/40 text-slate-800">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <NoticeSection
          initialNotices={notices}
          lastUpdated={formattedTime}
        />
      </main>
      <Footer />
    </div>
  );
}
