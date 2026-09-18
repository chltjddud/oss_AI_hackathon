import React from 'react';
import { fetchPublicBenefits } from '@/lib/api';
import { getCrawledData } from '@/lib/crawler';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PolicySection from '@/components/PolicySection';

export const revalidate = 600; // 10 minutes

export default async function PoliciesPage() {
  const benefitsData = await fetchPublicBenefits(1, 50, '순천');
  const items = benefitsData?.data || [];

  const crawledData = await getCrawledData(false);

  return (
    <div className="min-h-screen flex flex-col bg-emerald-50/40 text-slate-800">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8">
        <PolicySection
          initialWelfare={crawledData.welfare}
          gov24Items={items}
        />
      </main>
      <Footer />
    </div>
  );
}
