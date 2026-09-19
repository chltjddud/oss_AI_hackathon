'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  speedX: number;
  speedY: number;
  swaySpeed: number;
  swayOffset: number;
  vx: number;
  vy: number;
}

interface WindBreeze {
  x: number;
  y: number;
  length: number;
  speed: number;
  amplitude: number;
  frequency: number;
  alpha: number;
  width: number;
}

interface AuroraBeam {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  targetRadius: number;
  intensity: number;
  targetIntensity: number;
  activeButton: 'notices' | 'policies' | null;
}

export default function SuncheonWindCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let time = 0;

    const mouse = {
      x: -1000,
      y: -1000,
      active: false,
    };

    // Aurora state for Option 4 (Button Focused Magnetic Aurora)
    const aurora: AuroraBeam = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      radius: 260,
      targetRadius: 260,
      intensity: 0.18,
      targetIntensity: 0.18,
      activeButton: null,
    };

    // Color palette: soft emerald, fresh mint, warm sunlight amber
    const particleColors = [
      '16, 185, 129',  // emerald-500
      '5, 150, 105',   // emerald-600
      '52, 211, 153',  // emerald-400
      '110, 231, 183', // emerald-300
      '245, 158, 11',  // amber-500 (따뜻한 햇살)
    ];

    const PARTICLE_COUNT = 52;
    const particles: Particle[] = [];
    const windBreezes: WindBreeze[] = [];

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas.parentElement;
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      // Default aurora resting position: center of the hero section
      aurora.x = width / 2;
      aurora.y = height * 0.58;
      aurora.targetX = width / 2;
      aurora.targetY = height * 0.58;
    };

    const createParticle = (randomY = true): Particle => {
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const baseAlpha = 0.25 + Math.random() * 0.45;
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : height + 15,
        radius: 2.2 + Math.random() * 4.2,
        color,
        alpha: baseAlpha,
        baseAlpha,
        speedX: 0.35 + Math.random() * 0.65,
        speedY: -(0.2 + Math.random() * 0.55),
        swaySpeed: 0.015 + Math.random() * 0.02,
        swayOffset: Math.random() * Math.PI * 2,
        vx: 0,
        vy: 0,
      };
    };

    const createWindBreeze = (randomX = true): WindBreeze => {
      return {
        x: randomX ? Math.random() * width : -150,
        y: Math.random() * height * 0.85,
        length: 80 + Math.random() * 140,
        speed: 1.2 + Math.random() * 1.6,
        amplitude: 8 + Math.random() * 14,
        frequency: 0.012 + Math.random() * 0.015,
        alpha: 0.06 + Math.random() * 0.10,
        width: 1.2 + Math.random() * 1.6,
      };
    };

    handleResize();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(true));
    }

    for (let i = 0; i < 6; i++) {
      windBreezes.push(createWindBreeze(true));
    }

    // Cache button elements for zero-overhead 60fps checks
    let heroButtons: HTMLElement[] = [];
    const refreshButtons = () => {
      heroButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-hero-btn]'));
    };
    refreshButtons();

    // Check button hover for Option 4 Aurora Focus
    const updateButtonFocus = () => {
      if (heroButtons.length === 0) {
        refreshButtons();
      }
      const canvasRect = canvas.getBoundingClientRect();
      let foundActive = false;

      heroButtons.forEach((btn) => {
        const rect = btn.getBoundingClientRect();
        const isHovered =
          mouse.active &&
          mouse.x >= rect.left - canvasRect.left - 20 &&
          mouse.x <= rect.right - canvasRect.left + 20 &&
          mouse.y >= rect.top - canvasRect.top - 20 &&
          mouse.y <= rect.bottom - canvasRect.top + 20;

        if (isHovered) {
          foundActive = true;
          const btnType = btn.getAttribute('data-hero-btn') as 'notices' | 'policies';
          aurora.activeButton = btnType;
          aurora.targetX = rect.left + rect.width / 2 - canvasRect.left;
          aurora.targetY = rect.top + rect.height / 2 - canvasRect.top;
          aurora.targetRadius = Math.max(rect.width, rect.height) * 0.95;
          aurora.targetIntensity = 0.42;
        }
      });

      if (!foundActive) {
        aurora.activeButton = null;
        aurora.targetX = width / 2 + Math.sin(time * 0.8) * 35;
        aurora.targetY = height * 0.58 + Math.cos(time * 0.7) * 20;
        aurora.targetRadius = 260;
        aurora.targetIntensity = 0.18;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.touches[0].clientX - rect.left;
        mouse.y = e.touches[0].clientY - rect.top;
        mouse.active = true;
      }
    };

    const handleTouchEnd = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchstart', handleTouchMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    // Render loop
    const render = () => {
      time += 0.018;
      ctx.clearRect(0, 0, width, height);
      updateButtonFocus();

      // Smooth lerp for Aurora position & intensity
      aurora.x += (aurora.targetX - aurora.x) * 0.08;
      aurora.y += (aurora.targetY - aurora.y) * 0.08;
      aurora.radius += (aurora.targetRadius - aurora.radius) * 0.08;
      aurora.intensity += (aurora.targetIntensity - aurora.intensity) * 0.08;

      // ==========================================
      // [Option 4] Button-Focused Aurora Halo Mesh
      // ==========================================
      const auroraGradient = ctx.createRadialGradient(
        aurora.x,
        aurora.y,
        0,
        aurora.x,
        aurora.y,
        aurora.radius * (1 + Math.sin(time * 2) * 0.08)
      );

      if (aurora.activeButton === 'notices') {
        // Notice focused: Fresh vibrant Emerald & Mint Aurora
        auroraGradient.addColorStop(0, `rgba(52, 211, 153, ${aurora.intensity * 0.95})`);
        auroraGradient.addColorStop(0.35, `rgba(16, 185, 129, ${aurora.intensity * 0.65})`);
        auroraGradient.addColorStop(0.7, `rgba(6, 95, 70, ${aurora.intensity * 0.25})`);
        auroraGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else if (aurora.activeButton === 'policies') {
        // Policy focused: Radiant Emerald with Golden Amber Sunlight Aurora
        auroraGradient.addColorStop(0, `rgba(251, 191, 36, ${aurora.intensity * 0.85})`);
        auroraGradient.addColorStop(0.35, `rgba(16, 185, 129, ${aurora.intensity * 0.65})`);
        auroraGradient.addColorStop(0.7, `rgba(5, 150, 105, ${aurora.intensity * 0.25})`);
        auroraGradient.addColorStop(1, 'rgba(5, 150, 105, 0)');
      } else {
        // Ambient resting aurora between the two buttons
        auroraGradient.addColorStop(0, `rgba(167, 243, 208, ${aurora.intensity * 0.8})`);
        auroraGradient.addColorStop(0.4, `rgba(52, 211, 153, ${aurora.intensity * 0.45})`);
        auroraGradient.addColorStop(0.75, `rgba(16, 185, 129, ${aurora.intensity * 0.15})`);
        auroraGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
      }

      ctx.beginPath();
      ctx.arc(aurora.x, aurora.y, aurora.radius * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = auroraGradient;
      ctx.fill();

      // ==========================================
      // [Option 1] Suncheon Bay Waves at bottom
      // ==========================================
      const waveConfigs = [
        {
          amplitude: 18,
          frequency: 0.0035,
          speed: 0.8,
          yOffset: height * 0.88,
          color: 'rgba(16, 185, 129, 0.06)',
        },
        {
          amplitude: 24,
          frequency: 0.0028,
          speed: -0.6,
          yOffset: height * 0.92,
          color: 'rgba(52, 211, 153, 0.05)',
        },
        {
          amplitude: 14,
          frequency: 0.0045,
          speed: 1.1,
          yOffset: height * 0.95,
          color: 'rgba(5, 150, 105, 0.06)',
        },
      ];

      waveConfigs.forEach((wave) => {
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, wave.yOffset);

        const step = 8;
        for (let x = 0; x <= width; x += step) {
          const y =
            wave.yOffset +
            Math.sin(x * wave.frequency + time * wave.speed) * wave.amplitude +
            Math.cos(x * wave.frequency * 0.6 + time * 0.4) * (wave.amplitude * 0.4);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = wave.color;
        ctx.fill();
      });

      // ==========================================
      // [Option 1] Wind Streamlines (바람결 곡선)
      // ==========================================
      windBreezes.forEach((breeze) => {
        breeze.x += breeze.speed;
        if (breeze.x > width + breeze.length) {
          breeze.x = -breeze.length - 20;
          breeze.y = Math.random() * height * 0.85;
        }

        ctx.beginPath();
        const startX = breeze.x;
        const endX = breeze.x + breeze.length;
        const startY = breeze.y + Math.sin(startX * breeze.frequency + time) * breeze.amplitude;
        ctx.moveTo(startX, startY);

        for (let px = startX; px <= endX; px += 10) {
          const py = breeze.y + Math.sin(px * breeze.frequency + time) * breeze.amplitude;
          ctx.lineTo(px, py);
        }

        const gradient = ctx.createLinearGradient(startX, breeze.y, endX, breeze.y);
        gradient.addColorStop(0, 'rgba(52, 211, 153, 0)');
        gradient.addColorStop(0.5, `rgba(16, 185, 129, ${breeze.alpha})`);
        gradient.addColorStop(1, 'rgba(52, 211, 153, 0)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = breeze.width;
        ctx.stroke();
      });

      // ==========================================
      // [Option 1 & 4 Combined] Spores with Wind & Magnetic Attraction
      // ==========================================
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Organic breeze movement
        const sway = Math.sin(time * 2 + p.swayOffset) * 0.85;
        p.x += p.speedX + sway + p.vx;
        p.y += p.speedY + p.vy;

        // Interaction A: Mouse wind repulsion (마우스 바람 흩날림)
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          const maxDist = 140;

          if (dist < maxDist && dist > 0) {
            const force = (1 - dist / maxDist) * 3.5;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Interaction B: Magnetic pull toward active button (버튼 집중 마그네틱 자석 인력)
        if (aurora.activeButton) {
          const adx = aurora.x - p.x;
          const ady = aurora.y - p.y;
          const adist = Math.hypot(adx, ady);
          const magneticRadius = aurora.radius * 1.3;

          if (adist < magneticRadius && adist > 40) {
            const magForce = (1 - adist / magneticRadius) * 0.45;
            p.vx += (adx / adist) * magForce;
            p.vy += (ady / adist) * magForce;
          }
        }

        // Friction dampening
        p.vx *= 0.92;
        p.vy *= 0.92;

        // Alpha breathing pulse
        p.alpha = p.baseAlpha + Math.sin(time * 3 + p.swayOffset) * 0.14;

        // Wrap around boundaries
        if (p.y < -20) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x > width + 20) {
          p.x = -10;
          p.y = Math.random() * height;
        }

        // Draw soft glowing particle
        const pGradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.radius * 2.2
        );
        pGradient.addColorStop(0, `rgba(${p.color}, ${Math.max(0, p.alpha)})`);
        pGradient.addColorStop(0.5, `rgba(${p.color}, ${Math.max(0, p.alpha * 0.4)})`);
        pGradient.addColorStop(1, `rgba(${p.color}, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = pGradient;
        ctx.fill();

        // Delicate inner core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, p.alpha + 0.25)})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
