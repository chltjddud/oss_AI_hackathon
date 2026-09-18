import React from 'react';
import { getCrawledData } from '@/lib/crawler';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NoticeSection from '@/components/NoticeSection';

export const revalidate = 600; // 10 minutes

export default async function NoticesPage() {
  const crawledData = await getCrawledData(false);
  const formattedTime = new Date(crawledData.timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="min-h-screen flex flex-col bg-emerald-50/40 text-slate-800">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8">
        <NoticeSection
          initialNotices={crawledData.notice}
          lastUpdated={formattedTime}
        />
      </main>
      <Footer />
    </div>
  );
}
