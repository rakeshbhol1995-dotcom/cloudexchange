"use client";
import React, { useEffect, useRef } from "react";

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Star Class
    class Star {
      x: number;
      y: number;
      size: number;
      baseOpacity: number;
      opacity: number;
      speed: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.5;
        this.baseOpacity = Math.random() * 0.7 + 0.3;
        this.opacity = this.baseOpacity;
        this.speed = Math.random() * 0.02 + 0.005;
      }

      update() {
        // Twinkling effect
        this.opacity = this.baseOpacity + Math.sin(Date.now() * this.speed) * 0.25;
        if (this.opacity < 0) this.opacity = 0;
        if (this.opacity > 1) this.opacity = 1;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Add occasional gold/cyan stars
        if (this.baseOpacity > 0.9) {
          ctx.shadowBlur = 4;
          ctx.shadowColor = Math.random() > 0.5 ? "#00E5FF" : "#F5A623";
          ctx.fillStyle = Math.random() > 0.5 ? "rgba(0, 229, 255, 0.8)" : "rgba(245, 166, 35, 0.8)";
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      }
    }

    // Shooting Star (Meteors) Class
    class ShootingStar {
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      active: boolean;
      opacity: number;

      constructor() {
        this.x = 0;
        this.y = 0;
        this.length = 0;
        this.speed = 0;
        this.angle = Math.PI / 6 + Math.random() * (Math.PI / 12); // ~30-45 degrees
        this.active = false;
        this.opacity = 0;
      }

      spawn() {
        this.x = Math.random() * width * 0.8;
        this.y = 0;
        this.length = Math.random() * 80 + 50;
        this.speed = Math.random() * 15 + 10;
        this.active = true;
        this.opacity = 1;
      }

      update() {
        if (!this.active) return;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity -= 0.02; // Fade out trail
        if (this.opacity <= 0 || this.x > width || this.y > height) {
          this.active = false;
        }
      }

      draw() {
        if (!this.active || !ctx) return;
        ctx.save();
        ctx.strokeStyle = `rgba(0, 229, 255, ${this.opacity})`;
        ctx.lineWidth = 1.5;
        
        // Glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#00E5FF";

        // Draw line with gradient trail
        const grad = ctx.createLinearGradient(
          this.x,
          this.y,
          this.x - Math.cos(this.angle) * this.length,
          this.y - Math.sin(this.angle) * this.length
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
        grad.addColorStop(0.2, `rgba(0, 229, 255, ${this.opacity * 0.7})`);
        grad.addColorStop(1, "rgba(245, 166, 35, 0)");

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
          this.x - Math.cos(this.angle) * this.length,
          this.y - Math.sin(this.angle) * this.length
        );
        ctx.stroke();
        ctx.restore();
      }
    }

    // Initialize Stars
    const stars: Star[] = [];
    const starCount = Math.floor((width * height) / 8000);
    for (let i = 0; i < starCount; i++) {
      stars.push(new Star());
    }

    // Initialize Shooting Stars
    const shootingStars: ShootingStar[] = [];
    for (let i = 0; i < 3; i++) {
      shootingStars.push(new ShootingStar());
    }

    const drawMoon = (x: number, y: number, r: number) => {
      if (!ctx) return;
      ctx.save();
      // Outer halo
      const glowGrad = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.5);
      glowGrad.addColorStop(0, "rgba(245, 166, 35, 0.15)");
      glowGrad.addColorStop(0.4, "rgba(0, 229, 255, 0.05)");
      glowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw beautiful gold/cyan crescent moon
      ctx.shadowBlur = 20;
      ctx.shadowColor = "rgba(245, 166, 35, 0.6)";

      // Main Moon sphere
      const moonGrad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      moonGrad.addColorStop(0, "#F5A623"); // Gold
      moonGrad.addColorStop(1, "#00E5FF"); // Cyan

      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI * 0.1, Math.PI * 1.5, false); // Arc path
      ctx.arc(x + r * 0.45, y - r * 0.15, r * 0.9, Math.PI * 1.5, Math.PI * 0.1, true); // Subtracted inner arc to make crescent
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // Animation Loop
    const tick = () => {
      // Very slight opacity fill to allow minor trailing
      ctx.fillStyle = "#040814";
      ctx.fillRect(0, 0, width, height);

      // Draw Moon in top right corner (adjusting based on screen size)
      const moonX = width - 180;
      const moonY = 120;
      drawMoon(moonX, moonY, 40);

      // Twinkle & Draw Stars
      stars.forEach(star => {
        star.update();
        star.draw();
      });

      // Randomly spawn shooting stars
      if (Math.random() < 0.008) {
        const inactiveStar = shootingStars.find(s => !s.active);
        if (inactiveStar) {
          inactiveStar.spawn();
        }
      }

      // Update & Draw Shooting Stars
      shootingStars.forEach(s => {
        s.update();
        s.draw();
      });

      animationId = requestAnimationFrame(tick);
    };

    tick();

    // Resize Handler
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      
      // Re-fill stars to adapt to new dimensions
      stars.length = 0;
      const newStarCount = Math.floor((width * height) / 8000);
      for (let i = 0; i < newStarCount; i++) {
        stars.push(new Star());
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1, // Render strictly behind everything
        pointerEvents: "none",
        background: "#040814"
      }}
    />
  );
}
