import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-emerald-800/20 py-8 bg-emerald-950 text-emerald-100">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex flex-col gap-1 text-center md:text-left">
          <p className="font-semibold text-emerald-50 text-sm">
            순천시 혜택 모음
          </p>
          <p className="text-emerald-300/80">
            순천시청, 순천청년정책, 순천문화재단, 국립순천대학교 및 대한민국 공공서비스(보조금24) 공공데이터 연계 서비스
          </p>
        </div>
        <p className="text-emerald-400/80 text-center md:text-right">
          (C) 2026 순천시 혜택 모음. Open Source AI Hackathon.
        </p>
      </div>
    </footer>
  );
}
