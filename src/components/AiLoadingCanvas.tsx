'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, MousePointerClick } from 'lucide-react';

interface Orb {
  id: number;
  x: number;
  y: number;
  radius: number;
  label: string;
  vx: number;
  vy: number;
  color: string;
  borderColor: string;
  textColor: string;
  swayOffset: number;
  swaySpeed: number;
  popped: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  alpha: number;
  vy: number;
}

const BENEFIT_LABELS = [
  '월세 지원',
  '장학금',
  '창업 자금',
  '문화 패스',
  '교통비 지원',
  '신혼 정착금',
  '자격증 응시료',
  '청년 디딤돌',
  '출산 축하금',
  '공유 오피스',
  '취업 지원',
  '생활 안정'
];

const ORB_COLOR_THEMES = [
  { bg: 'rgba(16, 185, 129, 0.18)', border: '#10b981', text: '#065f46' }, // Emerald
  { bg: 'rgba(14, 165, 233, 0.18)', border: '#0ea5e9', text: '#0369a1' }, // Sky
  { bg: 'rgba(245, 158, 11, 0.18)', border: '#f59e0b', text: '#92400e' }, // Amber
  { bg: 'rgba(99, 102, 241, 0.18)', border: '#6366f1', text: '#3730a3' }, // Indigo
  { bg: 'rgba(20, 184, 166, 0.18)', border: '#14b8a6', text: '#115e59' }, // Teal
];

interface AiLoadingCanvasProps {
  loadingStep: number;
}

export default function AiLoadingCanvas({ loadingStep }: AiLoadingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let lastSpawnTime = 0;
    let time = 0;

    const orbs: Orb[] = [];
    const particles: Particle[] = [];
    const floatingTexts: FloatingText[] = [];

    const mouse = {
      x: -1000,
      y: -1000,
      isDown: false
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = Math.max(rect.height, 280);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Initial batch of orbs
    for (let i = 0; i < 6; i++) {
      const theme = ORB_COLOR_THEMES[i % ORB_COLOR_THEMES.length];
      const label = BENEFIT_LABELS[i % BENEFIT_LABELS.length];
      orbs.push({
        id: Math.random(),
        x: Math.random() * (width - 120) + 60,
        y: Math.random() * (height - 80) + 40,
        radius: 36,
        label,
        vx: 0,
        vy: -(0.5 + Math.random() * 0.6),
        color: theme.bg,
        borderColor: theme.border,
        textColor: theme.text,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.02,
        popped: false
      });
    }

    const spawnOrb = () => {
      if (orbs.filter(o => !o.popped).length >= 8) return;
      const theme = ORB_COLOR_THEMES[Math.floor(Math.random() * ORB_COLOR_THEMES.length)];
      const label = BENEFIT_LABELS[Math.floor(Math.random() * BENEFIT_LABELS.length)];

      orbs.push({
        id: Math.random(),
        x: Math.random() * (width - 120) + 60,
        y: height + 40,
        radius: 36,
        label,
        vx: 0,
        vy: -(0.7 + Math.random() * 0.8),
        color: theme.bg,
        borderColor: theme.border,
        textColor: theme.text,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.02,
        popped: false
      });
    };

    const popOrb = (orb: Orb) => {
      if (orb.popped) return;
      orb.popped = true;
      setScore(prev => prev + 1);

      // Spawn burst particles
      const count = 20;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 2 + Math.random() * 4.5;
        particles.push({
          x: orb.x,
          y: orb.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 2 + Math.random() * 3,
          color: orb.borderColor,
          alpha: 1,
          decay: 0.02 + Math.random() * 0.02
        });
      }

      // Add floating score text
      floatingTexts.push({
        x: orb.x,
        y: orb.y,
        text: `+1 ${orb.label}`,
        alpha: 1,
        vy: -1.2
      });
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      let hit = false;
      for (const orb of orbs) {
        if (orb.popped) continue;
        const dist = Math.hypot(orb.x - clickX, orb.y - clickY);
        if (dist <= orb.radius + 12) {
          popOrb(orb);
          hit = true;
          break;
        }
      }

      // If clicked empty space, spawn sparkle burst
      if (!hit) {
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 2.5;
          particles.push({
            x: clickX,
            y: clickY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 2,
            color: '#10b981',
            alpha: 1,
            decay: 0.04
          });
        }
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      mouse.x = clientX - rect.left;
      mouse.y = clientY - rect.top;
    };

    const handlePointerLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('touchmove', handlePointerMove, { passive: true });
    canvas.addEventListener('mouseleave', handlePointerLeave);

    const render = (timestamp: number) => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Spawn orbs periodically
      if (timestamp - lastSpawnTime > 1400) {
        spawnOrb();
        lastSpawnTime = timestamp;
      }

      // Draw neural interaction lines to mouse
      if (mouse.x > 0 && mouse.y > 0) {
        for (const orb of orbs) {
          if (orb.popped) continue;
          const dist = Math.hypot(orb.x - mouse.x, orb.y - mouse.y);
          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.45;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(orb.x, orb.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${lineAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Mouse glow cursor point
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Update & Draw Orbs
      for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i];
        if (orb.popped) {
          orbs.splice(i, 1);
          continue;
        }

        orb.y += orb.vy;
        orb.x += Math.sin(time * orb.swaySpeed + orb.swayOffset) * 0.7;

        // If drifted off top
        if (orb.y + orb.radius < -20) {
          orbs.splice(i, 1);
          continue;
        }

        // Draw bubble shadow & glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = orb.color;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = orb.borderColor;
        ctx.stroke();

        // Inner highlight for glassmorphic 3D orb feel
        ctx.beginPath();
        ctx.arc(orb.x - orb.radius * 0.35, orb.y - orb.radius * 0.35, orb.radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        // Text label inside orb
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = orb.textColor;
        ctx.fillText(orb.label, orb.x, orb.y);
        ctx.restore();
      }

      // Update & Draw Burst Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // subtle gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      }

      // Update & Draw Floating Text
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.025;

        if (ft.alpha <= 0) {
          floatingTexts.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(ft.alpha, 0);
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#065f46';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('touchstart', handlePointerDown);
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('touchmove', handlePointerMove);
      canvas.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 rounded-3xl border-2 border-emerald-200/90 shadow-lg p-6 sm:p-8 overflow-hidden my-8 select-none"
    >
      {/* Top Banner & Interactive Score Counter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 animate-spin" />
          </div>
          <div className="text-left">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
              AI가 맞춤 혜택을 정밀 분석하고 있습니다
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <MousePointerClick className="w-3.5 h-3.5 text-emerald-600" />
              <span>기다리는 동안 떠오르는 혜택 버블을 터뜨려보세요!</span>
            </p>
          </div>
        </div>

        {/* Score Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-600">수집한 혜택:</span>
          <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-black text-xs">
            {score}개
          </span>
        </div>
      </div>

      {/* Interactive HTML5 Canvas */}
      <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xs border border-emerald-100 shadow-inner">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
        />
      </div>

      {/* Step Status Bar */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10 text-left">
        <div
          className={`p-3 rounded-xl border transition-all text-xs font-semibold flex items-center gap-2 ${
            loadingStep >= 1
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              loadingStep >= 1 ? 'bg-emerald-600 animate-ping' : 'bg-slate-300'
            }`}
          />
          <span>1. 사용자 상황 분석</span>
        </div>

        <div
          className={`p-3 rounded-xl border transition-all text-xs font-semibold flex items-center gap-2 ${
            loadingStep >= 2
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              loadingStep >= 2 ? 'bg-emerald-600 animate-ping' : 'bg-slate-300'
            }`}
          />
          <span>2. 150+건 공공 DB 대조</span>
        </div>

        <div
          className={`p-3 rounded-xl border transition-all text-xs font-semibold flex items-center gap-2 ${
            loadingStep >= 3
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              loadingStep >= 3 ? 'bg-emerald-600 animate-ping' : 'bg-slate-300'
            }`}
          />
          <span>3. 맞춤 리포트 완성 중</span>
        </div>
      </div>
    </div>
  );
}
