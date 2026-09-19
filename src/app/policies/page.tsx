import React from 'react';
import { fetchSuncheonApplicableBenefits } from '@/lib/api';
import { getMergedWelfare } from '@/lib/crawler';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PolicySection from '@/components/PolicySection';

export const revalidate = 600; // 10 minutes

export default async function PoliciesPage() {
  const [applicablePolicies, welfare] = await Promise.all([
    fetchSuncheonApplicableBenefits(),
    getMergedWelfare(false)
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-emerald-50/40 text-slate-800">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8">
        <PolicySection
          initialWelfare={welfare}
          applicablePolicies={applicablePolicies}
        />
      </main>
      <Footer />
    </div>
  );
}
