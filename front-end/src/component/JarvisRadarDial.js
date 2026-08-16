import React, { useState, useEffect, useRef } from 'react';

/**
 * Bottom-Left J.A.R.V.I.S. Reactor Core & Concentric Radar Dial
 * Recreates the bottom-left circular HUD from the reference image:
 * - Concentric calibrated rings with cyan, orange, and blue arc segments
 * - Central "J.A.R.V.I.S." typography
 * - Rotating radar sweep and outer orbital ticks
 * - Fully draggable & adjustable
 */

const hexToRgba = (hex = '#00f0ff', alpha = 1) => {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(0, 240, 255, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const JarvisRadarDial = ({
  blobColor = '#00f0ff',
  isListening = false,
  isJarvisSpeaking = false
}) => {
  const mainColor = blobColor || '#00f0ff';
  const orangeAccent = '#ff8800';

  // Draggable position
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_radar_dial_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return { x: 140, y: Math.max(380, window.innerHeight - 360) };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: pos.x,
      initY: pos.y
    };
  };

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initX: pos.x,
      initY: pos.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;
      setPos({
        x: Math.max(-80, Math.min(window.innerWidth - 180, dragStartRef.current.initX + deltaX)),
        y: Math.max(50, Math.min(window.innerHeight - 180, dragStartRef.current.initY + deltaY))
      });
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;
      setPos({
        x: Math.max(-80, Math.min(window.innerWidth - 180, dragStartRef.current.initX + deltaX)),
        y: Math.max(50, Math.min(window.innerHeight - 180, dragStartRef.current.initY + deltaY))
      });
    };

    const handleEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  useEffect(() => {
    try {
      localStorage.setItem('jarvis_radar_dial_pos', JSON.stringify(pos));
    } catch (e) {}
  }, [pos]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '230px',
        height: '230px',
        zIndex: isDragging ? 90 : 36,
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        filter: `drop-shadow(0 0 16px ${hexToRgba(mainColor, 0.35)})`
      }}
      title="Click and drag anywhere to move the J.A.R.V.I.S. Core Radar Dial"
    >
      <svg viewBox="0 0 240 240" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <filter id="radarNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="radarArcGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="60%" stopColor="#0088ff" />
            <stop offset="100%" stopColor="#ff8800" />
          </linearGradient>
        </defs>

        <g transform="translate(120, 120)">
          {/* Background Core Plate */}
          <circle r="105" fill="rgba(4, 10, 20, 0.85)" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />

          {/* Outer Segmented Calibrated Ring */}
          <circle
            r="98"
            fill="none"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.2"
            strokeDasharray="2 6"
            style={{ animation: 'radarClockwise 40s linear infinite', transformOrigin: '0 0' }}
          />

          {/* Outer Heavy Orange/Cyan Arc */}
          <path
            d="M 65 -70 A 95 95 0 0 1 90 30"
            fill="none"
            stroke={orangeAccent}
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#radarNeonGlow)"
          />
          <path
            d="M -90 -30 A 95 95 0 0 1 -30 -90"
            fill="none"
            stroke={mainColor}
            strokeWidth="4.5"
            filter="url(#radarNeonGlow)"
          />

          {/* Bottom Arc Segmented Blocks */}
          <path
            d="M -60 70 A 92 92 0 0 0 60 70"
            fill="none"
            stroke={mainColor}
            strokeWidth="6"
            strokeDasharray="10 6"
            filter="url(#radarNeonGlow)"
          />

          {/* Mid Layer Ring */}
          <circle
            r="75"
            fill="none"
            stroke={hexToRgba(mainColor, 0.7)}
            strokeWidth="1.5"
            strokeDasharray="14 6 4 6"
            style={{ animation: 'radarCounter 25s linear infinite', transformOrigin: '0 0' }}
          />

          {/* Secondary Concentric Ring */}
          <circle r="56" fill="rgba(8, 20, 36, 0.6)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" strokeDasharray="4 3" />

          {/* Cyan Inner Ring with Radar Reticle */}
          <circle r="42" fill="rgba(4, 12, 24, 0.9)" stroke={mainColor} strokeWidth="2" filter="url(#radarNeonGlow)" />

          {/* Rotating Radar Sweep Arm */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-72"
            stroke={mainColor}
            strokeWidth="1.8"
            filter="url(#radarNeonGlow)"
            style={{ animation: 'radarClockwise 4s linear infinite', transformOrigin: '0 0' }}
          />

          {/* Center J.A.R.V.I.S. Text */}
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="12"
            fontWeight="900"
            fontFamily="'Orbitron', sans-serif"
            letterSpacing="2.5"
            style={{ textShadow: `0 0 8px ${mainColor}, 0 0 16px ${hexToRgba(mainColor, 0.8)}` }}
          >
            J.A.R.V.I.S.
          </text>

          {/* Subtext */}
          <text
            x="0"
            y="18"
            textAnchor="middle"
            fill={orangeAccent}
            fontSize="6.5"
            fontWeight="bold"
            letterSpacing="1.5"
            fontFamily="'Share Tech Mono', monospace"
          >
            CORE RADAR
          </text>

          {/* Target Blip Dots */}
          <circle cx="28" cy="-28" r="2.5" fill="#ffffff" filter="url(#radarNeonGlow)" />
          <circle cx="-32" cy="18" r="2" fill={orangeAccent} />
        </g>
      </svg>

      <style>{`
        @keyframes radarClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes radarCounter {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  );
};

export default JarvisRadarDial;
