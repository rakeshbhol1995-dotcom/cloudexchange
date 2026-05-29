"use client";
import React, { useEffect, useRef } from "react";

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext("2d");
    if (!rawCtx) return;
    const ctx: CanvasRenderingContext2D = rawCtx;

    let animId: number;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let t = 0;

    // ── STARS ────────────────────────────────────────────────
    interface StarObj {
      x: number; y: number; r: number;
      base: number; phase: number; speed: number;
      gold: boolean; cyan: boolean;
    }
    const STAR_COUNT = Math.floor((W * H) / 5500);
    const stars: StarObj[] = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.6 + 0.2,
      base: Math.random() * 0.55 + 0.25,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.025 + 0.006,
      gold: Math.random() < 0.04,
      cyan: Math.random() < 0.03,
    }));

    // ── SHOOTING STARS ────────────────────────────────────────
    interface Meteor {
      x: number; y: number; vx: number; vy: number;
      len: number; life: number; maxLife: number; active: boolean;
    }
    const meteors: Meteor[] = Array.from({ length: 4 }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, len: 0, life: 0, maxLife: 0, active: false,
    }));

    function spawnMeteor(m: Meteor) {
      const angle = (Math.PI / 6) + Math.random() * (Math.PI / 8);
      const speed = 14 + Math.random() * 12;
      m.x = Math.random() * W * 0.7;
      m.y = Math.random() * H * 0.3;
      m.vx = Math.cos(angle) * speed;
      m.vy = Math.sin(angle) * speed;
      m.len = 70 + Math.random() * 90;
      m.maxLife = 40 + Math.random() * 20;
      m.life = m.maxLife;
      m.active = true;
    }

    // ── NEBULA CLOUDS ─────────────────────────────────────────
    interface Nebula {
      x: number; y: number; rx: number; ry: number;
      color: string; alpha: number; phase: number;
    }
    const nebulae: Nebula[] = [
      { x: W * 0.75, y: H * 0.15, rx: 260, ry: 140, color: "0,229,255", alpha: 0.06, phase: 0 },
      { x: W * 0.18, y: H * 0.72, rx: 200, ry: 120, color: "245,166,35", alpha: 0.05, phase: 1.2 },
      { x: W * 0.5,  y: H * 0.45, rx: 300, ry: 160, color: "120,80,220", alpha: 0.04, phase: 2.5 },
    ];

    // ── FLOATING PARTICLES ────────────────────────────────────
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      r: number; life: number; maxLife: number; color: string;
    }
    const particles: Particle[] = [];
    function spawnParticle() {
      const colors = ["0,229,255", "245,166,35", "180,120,255"];
      particles.push({
        x: Math.random() * W,
        y: H + 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.3 + Math.random() * 0.5),
        r: 1 + Math.random() * 2,
        life: 0,
        maxLife: 180 + Math.random() * 120,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // ── AURORA BANDS ──────────────────────────────────────────
    function drawAurora() {
      const bandCount = 3;
      for (let b = 0; b < bandCount; b++) {
        const phase = t * 0.003 + b * 1.8;
        const yBase = H * 0.08 + b * 30;
        const grad = ctx.createLinearGradient(0, yBase, 0, yBase + 80);
        if (b === 0) {
          grad.addColorStop(0, `rgba(0,229,255,${0.025 + Math.sin(phase) * 0.015})`);
          grad.addColorStop(1, "rgba(0,229,255,0)");
        } else if (b === 1) {
          grad.addColorStop(0, `rgba(120,80,255,${0.02 + Math.sin(phase + 1) * 0.01})`);
          grad.addColorStop(1, "rgba(120,80,255,0)");
        } else {
          grad.addColorStop(0, `rgba(245,166,35,${0.015 + Math.sin(phase + 2) * 0.008})`);
          grad.addColorStop(1, "rgba(245,166,35,0)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= W; x += 60) {
          const wave = Math.sin((x / W) * Math.PI * 3 + phase) * 18;
          ctx.lineTo(x, yBase + wave);
        }
        ctx.lineTo(W, yBase + 80);
        ctx.lineTo(0, yBase + 80);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ── NEBULA DRAW ───────────────────────────────────────────
    function drawNebulae() {
      nebulae.forEach((n) => {
        const pulse = 0.85 + Math.sin(t * 0.004 + n.phase) * 0.15;
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.rx * pulse);
        grd.addColorStop(0, `rgba(${n.color},${n.alpha * pulse * 1.8})`);
        grd.addColorStop(0.45, `rgba(${n.color},${n.alpha * pulse})`);
        grd.addColorStop(1, `rgba(${n.color},0)`);
        ctx.save();
        ctx.scale(1, n.ry / n.rx);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(n.x, n.y * (n.rx / n.ry), n.rx * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // ── CONSTELLATION LINES ───────────────────────────────────
    const constStars = stars.filter((_, i) => i % 18 === 0).slice(0, 12);
    function drawConstellations() {
      for (let i = 0; i < constStars.length - 1; i++) {
        const a = constStars[i], b = constStars[i + 1];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < W * 0.22) {
          const alpha = (0.06 + Math.sin(t * 0.005 + i) * 0.03) * (1 - dist / (W * 0.22));
          ctx.strokeStyle = `rgba(0,229,255,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // ── CRESCENT MOON ─────────────────────────────────────────
    function drawMoon() {
      const mx = W - Math.min(200, W * 0.15);
      const my = 110;
      const mr = 38;

      // 1. Outer halo / glowing corona
      const halo = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.5);
      halo.addColorStop(0, "rgba(245, 166, 35, 0.18)");
      halo.addColorStop(0.35, "rgba(0, 229, 255, 0.05)");
      halo.addColorStop(0.75, "rgba(120, 80, 255, 0.02)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mx, my, mr * 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Pulsing aura ring
      const ringR = mr * (1.4 + Math.sin(t * 0.015) * 0.08);
      ctx.strokeStyle = `rgba(245, 166, 35, ${0.08 + Math.sin(t * 0.015) * 0.04})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mx, my, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Perfect mathematical crescent moon (using quadratic curves)
      ctx.save();
      ctx.shadowBlur = 25;
      ctx.shadowColor = "rgba(245, 166, 35, 0.65)";

      // Gold → Cyan premium linear gradient
      const moonGrad = ctx.createLinearGradient(mx - mr, my - mr, mx + mr, my + mr);
      moonGrad.addColorStop(0, "#F5C842");
      moonGrad.addColorStop(0.5, "#F5A623");
      moonGrad.addColorStop(1, "#00E5FF");
      ctx.fillStyle = moonGrad;

      ctx.beginPath();
      // Right-hand outer circle arc
      ctx.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2, false);
      // Smooth inner quadratic curve back to the top
      // Factor oscillates to change moon phase dynamically
      const phaseFactor = 0.12 + Math.sin(t * 0.006) * 0.35;
      ctx.quadraticCurveTo(mx + mr * phaseFactor, my, mx, my - mr);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 4. Crater overlay (only visible on the lit surface by using clipping/drawing on crescent)
      ctx.save();
      ctx.beginPath();
      ctx.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2, false);
      ctx.quadraticCurveTo(mx + mr * phaseFactor, my, mx, my - mr);
      ctx.closePath();
      ctx.clip();

      // Draw subtle dark craters
      [[mx - 5, my + 8, 2.8], [mx + 4, my - 12, 1.8], [mx - 12, my - 4, 1.5], [mx + 8, my + 14, 2.2]].forEach(([cx, cy, cr]) => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // 5. Orbiting cosmic dust particles (Space stardust rings)
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        const angle = (t * 0.012) + (i * Math.PI * 2) / particleCount;
        // Orbit path coordinates (ellipse)
        const ox = mx + Math.cos(angle) * (mr * 1.6);
        const oy = my + Math.sin(angle) * (mr * 0.7);
        // Particle size pulse
        const or = Math.max(0.6, 1.4 + Math.sin(angle) * 0.6);

        ctx.fillStyle = i % 2 === 0 ? "rgba(0, 229, 255, 0.75)" : "rgba(245, 166, 35, 0.75)";
        ctx.shadowBlur = 5;
        ctx.shadowColor = i % 2 === 0 ? "#00E5FF" : "#F5A623";
        ctx.beginPath();
        ctx.arc(ox, oy, or, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // ── PULSING ORBS ──────────────────────────────────────────
    const orbs = [
      { x: W * 0.08, y: H * 0.3,  r: 80, color: "0,229,255",  phase: 0 },
      { x: W * 0.92, y: H * 0.6,  r: 60, color: "245,166,35", phase: 1.5 },
      { x: W * 0.45, y: H * 0.85, r: 50, color: "120,80,255", phase: 3.0 },
    ];
    function drawOrbs() {
      orbs.forEach((o) => {
        const scale = 0.88 + Math.sin(t * 0.008 + o.phase) * 0.12;
        const gr = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * scale);
        gr.addColorStop(0, `rgba(${o.color},0.07)`);
        gr.addColorStop(0.6, `rgba(${o.color},0.025)`);
        gr.addColorStop(1, `rgba(${o.color},0)`);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * scale, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── GRID OVERLAY ──────────────────────────────────────────
    function drawGrid() {
      ctx.strokeStyle = "rgba(0,229,255,0.016)";
      ctx.lineWidth = 0.5;
      const step = 80;
      for (let x = 0; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    // ── MAIN ANIMATION LOOP ────────────────────────────────────
    const tick = () => {
      t++;

      // Background fill
      ctx.fillStyle = "#040814";
      ctx.fillRect(0, 0, W, H);

      drawGrid();
      drawAurora();
      drawNebulae();
      drawOrbs();
      drawConstellations();

      // Stars
      stars.forEach((s) => {
        const opc = Math.max(0, Math.min(1, s.base + Math.sin(t * s.speed + s.phase) * 0.3));
        const color = s.gold ? `rgba(245,166,35,${opc})` : s.cyan ? `rgba(0,229,255,${opc})` : `rgba(255,255,255,${opc})`;

        if (s.gold || s.cyan) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = s.gold ? "#F5A623" : "#00E5FF";
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Meteors
      if (Math.random() < 0.007) {
        const dead = meteors.find((m) => !m.active);
        if (dead) spawnMeteor(dead);
      }
      meteors.forEach((m) => {
        if (!m.active) return;
        m.life--;
        if (m.life <= 0 || m.x > W || m.y > H) { m.active = false; return; }
        const progress = m.life / m.maxLife;
        const tx = m.x - m.vx * (m.len / 14);
        const ty = m.y - m.vy * (m.len / 14);
        const mg = ctx.createLinearGradient(m.x, m.y, tx, ty);
        mg.addColorStop(0, `rgba(255,255,255,${progress})`);
        mg.addColorStop(0.3, `rgba(0,229,255,${progress * 0.7})`);
        mg.addColorStop(1, "rgba(245,166,35,0)");
        ctx.save();
        ctx.strokeStyle = mg;
        ctx.lineWidth = 1.8;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00E5FF";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.restore();
        m.x += m.vx;
        m.y += m.vy;
      });

      // Floating particles
      if (t % 8 === 0 && particles.length < 35) spawnParticle();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        if (p.life > p.maxLife) { particles.splice(i, 1); continue; }
        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.5;
        p.x += p.vx;
        p.y += p.vy;
        ctx.fillStyle = `rgba(${p.color},${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      drawMoon();

      animId = requestAnimationFrame(tick);
    };

    tick();

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      // redistribute stars
      stars.forEach((s) => { s.x = Math.random() * W; s.y = Math.random() * H; });
      nebulae[0].x = W * 0.75; nebulae[0].y = H * 0.15;
      nebulae[1].x = W * 0.18; nebulae[1].y = H * 0.72;
      nebulae[2].x = W * 0.5;  nebulae[2].y = H * 0.45;
      orbs[0].x = W * 0.08; orbs[1].x = W * 0.92; orbs[2].x = W * 0.45;
      orbs[0].y = H * 0.3;  orbs[1].y = H * 0.6;  orbs[2].y = H * 0.85;
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
        background: "#040814",
      }}
    />
  );
}
