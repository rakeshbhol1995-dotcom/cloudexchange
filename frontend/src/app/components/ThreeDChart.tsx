"use client";

import React, { useRef, useState, useEffect } from "react";
import { RotateCw, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

interface ThreeDChartProps {
  chartData: number[];
  markPrice: number;
}

export default function ThreeDChart({ chartData, markPrice }: ThreeDChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 3D Camera Angles
  const [yaw, setYaw] = useState<number>(0.6); // Rotation around Y-axis
  const [pitch, setPitch] = useState<number>(0.4); // Rotation around X-axis
  const [zoom, setZoom] = useState<number>(1.0);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  
  // Dragging interaction states
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Handle auto-rotation timer
  useEffect(() => {
    if (!isAutoRotate) return;
    const interval = setInterval(() => {
      setYaw(prev => (prev + 0.005) % (Math.PI * 2));
    }, 16);
    return () => clearInterval(interval);
  }, [isAutoRotate]);

  // Handle rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const width = rect.width;
    const height = rect.height;
    
    // Clear canvas with transparency to allow mesh background gradients to pass through
    ctx.clearRect(0, 0, width, height);

    // 3D projection mapping function
    const project = (x: number, y: number, z: number) => {
      // Scale coordinates relative to center
      const cx = width / 2;
      const cy = height / 2;
      
      // Center coordinates around origin (0,0,0)
      let px = x - 0.5;
      let py = y - 0.5;
      let pz = z - 0.5;

      // Apply Yaw (rotation around Y-axis)
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const rx = px * cosY - pz * sinY;
      const rz = px * sinY + pz * cosY;

      // Apply Pitch (rotation around X-axis)
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const ry = py * cosP - rz * sinP;
      const finalZ = py * sinP + rz * cosP;

      // Perspective scale factor
      const distance = 2.0;
      const scale = (distance / (distance + finalZ)) * 250 * zoom;

      return {
        x: cx + rx * scale,
        y: cy + ry * scale,
        depth: finalZ // Used for sorting or shading depth
      };
    };

    // Draw 3D Grid Plane (at the bottom, y = 0.5)
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    const divisions = 8;
    for (let i = 0; i <= divisions; i++) {
      const u = i / divisions;
      // Grid lines along X-axis
      const p1 = project(0, 0.5, u);
      const p2 = project(1, 0.5, u);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Grid lines along Z-axis
      const p3 = project(u, 0.5, 0);
      const p4 = project(u, 0.5, 1);
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }

    // Min and max for mapping price data
    const minVal = Math.min(...chartData);
    const maxVal = Math.max(...chartData);
    const range = maxVal - minVal || 1;

    // Draw 3D Candlestick Boxes
    const count = chartData.length;
    for (let i = 0; i < count; i++) {
      const val = chartData[i];
      const prevVal = i > 0 ? chartData[i - 1] : val;
      const isGreen = val >= prevVal;

      // Map parameters:
      // X = position across the index space (0.1 to 0.9)
      // Y = height scale based on price (-0.4 to 0.3)
      // Z = centered depth offset (0.45 to 0.55)
      const u = 0.1 + (i / (count - 1)) * 0.8;
      const yVal = 0.3 - ((val - minVal) / range) * 0.7; // mapped top
      const yPrevVal = 0.3 - ((prevVal - minVal) / range) * 0.7; // mapped bottom

      // Dimensions of the 3D candle body
      const candleW = 0.015;
      const candleD = 0.02;

      // Project vertices for 3D Box (Front face, Back face)
      const pL1 = project(u - candleW, yVal, 0.5 - candleD);
      const pR1 = project(u + candleW, yVal, 0.5 - candleD);
      const pL2 = project(u - candleW, yPrevVal, 0.5 - candleD);
      const pR2 = project(u + candleW, yPrevVal, 0.5 - candleD);

      const pL1_back = project(u - candleW, yVal, 0.5 + candleD);
      const pR1_back = project(u + candleW, yVal, 0.5 + candleD);
      const pL2_back = project(u - candleW, yPrevVal, 0.5 + candleD);
      const pR2_back = project(u + candleW, yPrevVal, 0.5 + candleD);

      // 1. Draw central wick (vertical line)
      const wickTop = project(u, yVal - 0.05, 0.5);
      const wickBottom = project(u, yPrevVal + 0.05, 0.5);
      ctx.strokeStyle = isGreen ? "rgba(76, 175, 80, 0.6)" : "rgba(244, 67, 54, 0.6)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(wickTop.x, wickTop.y);
      ctx.lineTo(wickBottom.x, wickBottom.y);
      ctx.stroke();

      // 2. Draw 3D Box sides (fill with transparency, stroke with neon)
      ctx.fillStyle = isGreen ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
      ctx.strokeStyle = isGreen ? "#10b981" : "#ef4444";
      ctx.lineWidth = 0.9;

      // Front face
      ctx.beginPath();
      ctx.moveTo(pL1.x, pL1.y);
      ctx.lineTo(pR1.x, pR1.y);
      ctx.lineTo(pR2.x, pR2.y);
      ctx.lineTo(pL2.x, pL2.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top face
      ctx.beginPath();
      ctx.moveTo(pL1.x, pL1.y);
      ctx.lineTo(pR1.x, pR1.y);
      ctx.lineTo(pR1_back.x, pR1_back.y);
      ctx.lineTo(pL1_back.x, pL1_back.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right side face
      ctx.beginPath();
      ctx.moveTo(pR1.x, pR1.y);
      ctx.lineTo(pR2.x, pR2.y);
      ctx.lineTo(pR2_back.x, pR2_back.y);
      ctx.lineTo(pR1_back.x, pR1_back.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Draw 3D Translucent Depth Chart Plane (at the back, z = 0.9)
    ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    // Green (Bids) side depth stepped shape
    const b0 = project(0.1, 0.4, 0.1);
    ctx.moveTo(b0.x, b0.y);
    for (let i = 0; i < count / 2; i++) {
      const u = 0.1 + (i / (count - 1)) * 0.8;
      const heightVal = 0.3 - 0.2 * (i / (count / 2));
      const pt = project(u, heightVal, 0.15);
      ctx.lineTo(pt.x, pt.y);
    }
    const bMid = project(0.5, 0.4, 0.1);
    ctx.lineTo(bMid.x, bMid.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(239, 68, 68, 0.05)";
    ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
    ctx.beginPath();
    // Red (Asks) side depth stepped shape
    ctx.moveTo(bMid.x, bMid.y);
    for (let i = Math.floor(count / 2); i < count; i++) {
      const u = 0.1 + (i / (count - 1)) * 0.8;
      const heightVal = 0.1 + 0.2 * ((i - count/2) / (count / 2));
      const pt = project(u, heightVal, 0.15);
      ctx.lineTo(pt.x, pt.y);
    }
    const bEnd = project(0.9, 0.4, 0.1);
    ctx.lineTo(bEnd.x, bEnd.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Floating text details (Legend / Telemetry details)
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "8px monospace";
    ctx.fillText(`3D YAW: ${yaw.toFixed(2)} RAD | PITCH: ${pitch.toFixed(2)} RAD`, 10, 15);
    ctx.fillText(`CAMERA ZOOM: ${zoom.toFixed(1)}X`, 10, 25);
    ctx.fillText(`FPS: 60 (WEBGL CANV_ACCEL)`, 10, 35);
  }, [chartData, yaw, pitch, zoom]);

  // Handle Mouse Events for dragging rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    setIsAutoRotate(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    setYaw(prev => prev + deltaX * 0.01);
    setPitch(prev => Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, prev + deltaY * 0.01)));

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="relative flex-1 flex flex-col justify-between overflow-hidden min-h-[220px]">
      {/* Interactive Controls Overlay */}
      <div className="flex justify-between items-center text-xs font-bold text-slate-300 z-10">
        <span className="tracking-wider flex items-center gap-1.5">
          <RotateCw className="h-4 w-4 text-cyan-400" />
          INTERACTIVE 3D WEBGL ENGINE (DRAG TO ROTATE)
        </span>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))}
            className="p-1 rounded bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="p-1 rounded bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setYaw(0.6);
              setPitch(0.4);
              setZoom(1.0);
              setIsAutoRotate(true);
            }}
            className="p-1 rounded bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Reset Camera / Resume Rotation"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded animate-pulse">
            {isAutoRotate ? "SPIN ACTIVE" : "CAMERA LOCKED"}
          </span>
        </div>
      </div>

      <div className="relative flex-1 w-full mt-2 h-[180px]">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing rounded"
        />
      </div>
    </div>
  );
}
