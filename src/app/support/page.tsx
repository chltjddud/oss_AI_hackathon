import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CitizenRequestSection from '@/components/CitizenRequestSection';

export const metadata = {
  title: '순천에 이런 지원 필요해요 | 순천시민 정책 제안',
  description: '순천시민이 직접 제안하는 맞춤형 지원 및 복지 정책 창구',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8">
        <CitizenRequestSection />
      </main>
      <Footer />
    </div>
  );
}
