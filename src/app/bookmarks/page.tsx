import React from 'react';
import { fetchSuncheonApplicableBenefits } from '@/lib/api';
import { getMergedWelfare } from '@/lib/crawler';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BookmarkSection from '@/components/BookmarkSection';

export const revalidate = 300; // 5 minutes

export default async function BookmarksPage() {
  const [applicablePolicies, welfare] = await Promise.all([
    fetchSuncheonApplicableBenefits(),
    getMergedWelfare(false)
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50/30 via-white to-slate-50 text-slate-800">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <BookmarkSection
          initialWelfare={welfare}
          applicablePolicies={applicablePolicies}
        />
      </main>
      <Footer />
    </div>
  );
}
