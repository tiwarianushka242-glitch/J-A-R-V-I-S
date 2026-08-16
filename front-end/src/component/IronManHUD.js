import React, { useState, useEffect, useRef } from 'react';

/**
 * Iron Man Mark Blueprint HUD Component
 * Exact recreation of the reference Rainmeter S.H.I.E.L.D / Anushka Tiwari blueprint background:
 * - Center Mark Armor Wireframe Blueprint with glowing cyan eyes & Arc Reactor in chest
 * - Center-Left Mechanical Gears & Bearing Schematics
 * - Right Orthographic 3-View Armor Figures (Front, Profile, Back)
 * - Power level telemetry banner: "Currently power level is at X percent and holding steady."
 * - High-tech grid & carbon fiber dark background
 * - Draggable and fully adjustable with localStorage persistence
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

const IronManHUD = ({
  blobColor = '#00f0ff',
  isListening = false,
  isProcessing = false,
  isJarvisSpeaking = false,
  powerLevel = 98,
  statusText = ''
}) => {
  const mainColor = blobColor || '#00f0ff';
  const redAccent = '#ff3344';
  const glowColor = hexToRgba(mainColor, 0.75);

  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_ironman_blueprint_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return {
      x: Math.max(0, Math.floor((window.innerWidth - 1300) / 2)),
      y: Math.max(30, Math.floor((window.innerHeight - 740) / 2))
    };
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
        x: Math.max(-400, Math.min(window.innerWidth - 300, dragStartRef.current.initX + deltaX)),
        y: Math.max(-200, Math.min(window.innerHeight - 200, dragStartRef.current.initY + deltaY))
      });
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;
      setPos({
        x: Math.max(-400, Math.min(window.innerWidth - 300, dragStartRef.current.initX + deltaX)),
        y: Math.max(-200, Math.min(window.innerHeight - 200, dragStartRef.current.initY + deltaY))
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
      localStorage.setItem('jarvis_ironman_blueprint_pos', JSON.stringify(pos));
    } catch (e) {}
  }, [pos]);

  return (
    <div
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '1300px',
        height: '760px',
        pointerEvents: 'auto',
        zIndex: isDragging ? 75 : 15,
        userSelect: 'none',
        transition: isDragging ? 'none' : 'opacity 0.3s ease',
        filter: `drop-shadow(0 0 20px ${hexToRgba(mainColor, 0.25)})`
      }}
    >
      {/* Blueprint Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          position: 'absolute',
          top: '8px',
          left: '42%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '3px 16px',
          background: 'rgba(8, 14, 24, 0.75)',
          border: `1px solid ${hexToRgba(mainColor, 0.4)}`,
          borderRadius: '12px',
          cursor: isDragging ? 'grabbing' : 'grab',
          fontSize: '9px',
          letterSpacing: '2px',
          fontFamily: "'Share Tech Mono', monospace",
          color: '#ffffff',
          boxShadow: `0 0 12px ${hexToRgba(mainColor, 0.25)}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 30
        }}
        title="Drag anywhere on this handle to reposition the Iron Man Blueprint"
      >
        <span style={{ color: mainColor, fontWeight: 'bold' }}>❖ ANUSHKA TIWARI BLUEPRINT HUD</span>
        <span style={{ opacity: 0.55, fontSize: '8px' }}>[ DRAG ]</span>
      </div>

      <svg
        viewBox="0 0 1300 760"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible'
        }}
      >
        <defs>
          {/* Intense Neon Glow */}
          <filter id="ironNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Intense Arc Eye Glow */}
          <filter id="ironEyeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur1" />
            <feGaussianBlur stdDeviation="1.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Grid pattern for background */}
          <pattern id="anushkaGridPattern" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke={hexToRgba(mainColor, 0.08)} strokeWidth="0.7" />
          </pattern>

          {/* Dotted Grid Pattern */}
          <pattern id="anushkaDotPattern" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill={hexToRgba(mainColor, 0.15)} />
          </pattern>
        </defs>

        {/* ── BACKGROUND TECH MESH ── */}
        <rect x="0" y="0" width="1300" height="760" fill="url(#anushkaGridPattern)" opacity="0.85" />
        <rect x="0" y="0" width="1300" height="760" fill="url(#anushkaDotPattern)" opacity="0.5" />

        {/* ══════════════════════════════════════════════════════════════
            1. CENTER-LEFT: MECHANICAL GEARS & ROTATING SCHEMATICS
           ══════════════════════════════════════════════════════════════ */}
        <g transform="translate(360, 260)">
          {/* Anushka Tiwari Wordmark Logo */}
          <g transform="translate(-140, -135)">
            <polygon points="0,0 20,-10 180,-10 160,0" fill={hexToRgba(mainColor, 0.15)} stroke={mainColor} strokeWidth="1" />
            <text
              x="18"
              y="-1"
              fill={mainColor}
              fontSize="12"
              fontWeight="900"
              letterSpacing="3.5"
              fontFamily="'Orbitron', sans-serif"
              fontStyle="italic"
              style={{ textShadow: `0 0 8px ${glowColor}` }}
            >
              ANUSHKA TIWARI ⮞
            </text>
          </g>

          {/* Technical Dimension Arc Ticks */}
          <path d="M -90 -40 A 110 110 0 0 0 -90 90" fill="none" stroke={hexToRgba(mainColor, 0.4)} strokeWidth="1" strokeDasharray="3 3" />
          <path d="M -110 -20 A 130 130 0 0 0 -110 110" fill="none" stroke={hexToRgba(mainColor, 0.3)} strokeWidth="0.8" />
          <line x1="-90" y1="-40" x2="-65" y2="-40" stroke={mainColor} strokeWidth="1.2" />
          <line x1="-90" y1="90" x2="-65" y2="90" stroke={mainColor} strokeWidth="1.2" />

          {/* Rotating Main Gear */}
          <g style={{ animation: 'ironGearRotateClockwise 24s linear infinite', transformOrigin: '0 0' }}>
            <circle r="68" fill="none" stroke={mainColor} strokeWidth="1.8" filter="url(#ironNeonGlow)" />
            <circle r="48" fill="none" stroke={hexToRgba(mainColor, 0.6)} strokeWidth="1.2" strokeDasharray="4 4" />
            <circle r="22" fill="rgba(8, 18, 30, 0.8)" stroke={mainColor} strokeWidth="2" />
            <circle r="8" fill={mainColor} filter="url(#ironEyeGlow)" />

            {/* 12 Cog Teeth */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <g key={deg} transform={`rotate(${deg})`}>
                <rect x="-7" y="-78" width="14" height="12" fill={hexToRgba(mainColor, 0.25)} stroke={mainColor} strokeWidth="1.2" />
                <line x1="0" y1="-78" x2="0" y2="-22" stroke={hexToRgba(mainColor, 0.35)} strokeWidth="0.8" />
              </g>
            ))}
          </g>

          {/* Secondary Side Gear Spur (Orthographic side elevation) */}
          <g transform="translate(105, 0)">
            <rect x="-12" y="-70" width="24" height="140" fill="rgba(6, 14, 24, 0.7)" stroke={mainColor} strokeWidth="1.5" />
            <line x1="-12" y1="-50" x2="12" y2="-50" stroke={mainColor} strokeWidth="1" />
            <line x1="-12" y1="-30" x2="12" y2="-30" stroke={mainColor} strokeWidth="1" />
            <line x1="-12" y1="-10" x2="12" y2="-10" stroke={mainColor} strokeWidth="1" />
            <line x1="-12" y1="10" x2="12" y2="10" stroke={mainColor} strokeWidth="1" />
            <line x1="-12" y1="30" x2="12" y2="30" stroke={mainColor} strokeWidth="1" />
            <line x1="-12" y1="50" x2="12" y2="50" stroke={mainColor} strokeWidth="1" />
            <line x1="0" y1="-85" x2="0" y2="85" stroke={hexToRgba(mainColor, 0.5)} strokeWidth="0.8" strokeDasharray="4 2" />
          </g>

          {/* Technical Dimension Callouts */}
          <text x="-95" y="-60" fill={hexToRgba(mainColor, 0.75)} fontSize="8" fontFamily="'Share Tech Mono', monospace" letterSpacing="1">
            R=68.4mm • TORQUE 940Nm
          </text>
        </g>

        {/* ══════════════════════════════════════════════════════════════
            2. CENTER: IRON MAN MARK WIREFRAME BLUEPRINT BUST
           ══════════════════════════════════════════════════════════════ */}
        <g transform="translate(650, 390)">
          {/* Blueprint Coordinate Crosshairs */}
          <line x1="0" y1="-360" x2="0" y2="240" stroke={hexToRgba(mainColor, 0.25)} strokeWidth="0.8" strokeDasharray="8 4" />
          <line x1="-340" y1="-140" x2="340" y2="-140" stroke={hexToRgba(mainColor, 0.25)} strokeWidth="0.8" strokeDasharray="8 4" />

          {/* ── A. HELMET & FACEPLATE WIREFRAME ── */}
          <g transform="translate(0, -210)">
            {/* Outer Helmet Crown Dome */}
            <path
              d="M -75 -100 C -75 -155, 75 -155, 75 -100 L 78 -20 L 68 35 L 42 75 L 0 95 L -42 75 L -68 35 L -78 -20 Z"
              fill="rgba(4, 12, 22, 0.5)"
              stroke={mainColor}
              strokeWidth="2.2"
              filter="url(#ironNeonGlow)"
            />

            {/* Inner Crown Ridge */}
            <path
              d="M -50 -105 C -50 -140, 50 -140, 50 -105 L 54 -40 L 40 10 L 0 25 L -40 10 L -54 -40 Z"
              fill="none"
              stroke={mainColor}
              strokeWidth="1.2"
              strokeDasharray="14 3"
            />

            {/* Forehead Brow Plates */}
            <path
              d="M -60 -45 L -20 -40 L 0 -48 L 20 -40 L 60 -45 L 50 -25 L 0 -32 L -50 -25 Z"
              fill="rgba(10, 25, 45, 0.6)"
              stroke={mainColor}
              strokeWidth="1.8"
            />

            {/* GLOWING CYAN EYE VISORS (Exact Stark Slit Shape) */}
            <polygon
              points="-55,-22 -15,-18 -12,-28 -50,-32"
              fill="#ffffff"
              stroke={mainColor}
              strokeWidth="1.5"
              filter="url(#ironEyeGlow)"
              style={{
                animation: isJarvisSpeaking
                  ? 'anushkaEyePulse 0.4s ease-in-out infinite alternate'
                  : 'anushkaEyeSteady 3s ease-in-out infinite'
              }}
            />
            <polygon
              points="55,-22 15,-18 12,-28 50,-32"
              fill="#ffffff"
              stroke={mainColor}
              strokeWidth="1.5"
              filter="url(#ironEyeGlow)"
              style={{
                animation: isJarvisSpeaking
                  ? 'anushkaEyePulse 0.4s ease-in-out infinite alternate'
                  : 'anushkaEyeSteady 3s ease-in-out infinite'
              }}
            />

            {/* Cheek & Jaw Plates */}
            <path
              d="M -58 -10 L -42 40 L -22 65 L 0 72 L 22 65 L 42 40 L 58 -10 L 45 -12 L 32 30 L 0 45 L -32 30 L -45 -12 Z"
              fill="rgba(8, 20, 35, 0.55)"
              stroke={mainColor}
              strokeWidth="1.6"
            />

            {/* Chin Guard */}
            <polygon
              points="-20,68 0,78 20,68 15,88 0,94 -15,88"
              fill="rgba(20, 40, 65, 0.7)"
              stroke={mainColor}
              strokeWidth="1.5"
            />

            {/* Red Wireframe Accent Lines on Neck / Jaw */}
            <line x1="-35" y1="55" x2="-35" y2="85" stroke={redAccent} strokeWidth="1.8" />
            <line x1="35" y1="55" x2="35" y2="85" stroke={redAccent} strokeWidth="1.8" />
            <line x1="-18" y1="88" x2="-18" y2="105" stroke={redAccent} strokeWidth="1.5" />
            <line x1="18" y1="88" x2="18" y2="105" stroke={redAccent} strokeWidth="1.5" />
          </g>

          {/* ── B. NECK & CLAVICLE COLLAR ── */}
          <g transform="translate(0, -90)">
            {/* Trapezius & Neck Armor Ribs */}
            <path
              d="M -65 -15 L -35 15 L 0 0 L 35 15 L 65 -15 L 90 20 L 0 45 L -90 20 Z"
              fill="rgba(6, 16, 28, 0.6)"
              stroke={mainColor}
              strokeWidth="1.8"
            />
            {/* Red Accent Flaps */}
            <path d="M -40 10 L -20 32 L -20 52 L -40 25 Z" fill={hexToRgba(redAccent, 0.3)} stroke={redAccent} strokeWidth="1.5" />
            <path d="M 40 10 L 20 32 L 20 52 L 40 25 Z" fill={hexToRgba(redAccent, 0.3)} stroke={redAccent} strokeWidth="1.5" />
          </g>

          {/* ── C. CHEST PLATES & SHOULDER PODS (CHAMFERED WIDE BUST) ── */}
          <g transform="translate(0, 20)">
            {/* Left Shoulder Pauldron */}
            <path
              d="M -130 -110 L -270 -65 L -295 10 L -240 65 L -140 15 Z"
              fill="rgba(4, 12, 24, 0.65)"
              stroke={mainColor}
              strokeWidth="2.2"
              filter="url(#ironNeonGlow)"
            />
            <path d="M -260 -50 L -280 5 L -235 45" fill="none" stroke={hexToRgba(mainColor, 0.5)} strokeWidth="1.2" />

            {/* Right Shoulder Pauldron */}
            <path
              d="M 130 -110 L 270 -65 L 295 10 L 240 65 L 140 15 Z"
              fill="rgba(4, 12, 24, 0.65)"
              stroke={mainColor}
              strokeWidth="2.2"
              filter="url(#ironNeonGlow)"
            />
            <path d="M 260 -50 L 280 5 L 235 45" fill="none" stroke={hexToRgba(mainColor, 0.5)} strokeWidth="1.2" />

            {/* Left Pectoral Plate */}
            <path
              d="M -135 -105 L -35 -70 L -45 55 L -165 40 L -210 -35 Z"
              fill="rgba(8, 20, 36, 0.6)"
              stroke={mainColor}
              strokeWidth="2"
            />
            {/* Right Pectoral Plate */}
            <path
              d="M 135 -105 L 35 -70 L 45 55 L 165 40 L 210 -35 Z"
              fill="rgba(8, 20, 36, 0.6)"
              stroke={mainColor}
              strokeWidth="2"
            />

            {/* Red Accent Pectoral Borders */}
            <path d="M -130 50 L -90 120 L -45 60" fill="none" stroke={redAccent} strokeWidth="2.2" />
            <path d="M 130 50 L 90 120 L 45 60" fill="none" stroke={redAccent} strokeWidth="2.2" />
            <line x1="-120" y1="75" x2="-120" y2="135" stroke={redAccent} strokeWidth="1.8" />
            <line x1="120" y1="75" x2="120" y2="135" stroke={redAccent} strokeWidth="1.8" />

            {/* Sternum Center Frame */}
            <polygon
              points="-40,-68 0,-50 40,-68 45,60 0,95 -45,60"
              fill="rgba(4, 10, 20, 0.85)"
              stroke={mainColor}
              strokeWidth="2"
            />

            {/* ── ARC REACTOR (CHEST UNIBEAM CORE) ── */}
            <g transform="translate(0, 120)">
              {/* Outer Reactor Housing Ring */}
              <circle r="72" fill="rgba(3, 10, 20, 0.95)" stroke={mainColor} strokeWidth="2.8" filter="url(#ironNeonGlow)" />
              <circle r="60" fill="none" stroke={hexToRgba(mainColor, 0.6)} strokeWidth="1.5" strokeDasharray="6 3" />

              {/* Rotating Gear Ticks on Arc Core */}
              <g style={{ animation: 'ironGearRotateClockwise 16s linear infinite', transformOrigin: '0 0' }}>
                <circle r="48" fill="none" stroke={mainColor} strokeWidth="2" strokeDasharray="14 6" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <line
                    key={deg}
                    x1="0"
                    y1="-58"
                    x2="0"
                    y2="-44"
                    stroke={mainColor}
                    strokeWidth="3"
                    transform={`rotate(${deg})`}
                  />
                ))}
              </g>

              {/* Inner Glowing Reactor Ring */}
              <circle
                r="34"
                fill={hexToRgba(mainColor, 0.25)}
                stroke={mainColor}
                strokeWidth="3"
                filter="url(#ironEyeGlow)"
                style={{
                  animation: isJarvisSpeaking
                    ? 'arcReactorPulse 0.5s ease-in-out infinite alternate'
                    : 'arcReactorSteady 2.5s ease-in-out infinite'
                }}
              />
              <circle r="18" fill="#ffffff" filter="url(#ironEyeGlow)" />
              <circle r="7" fill={mainColor} />
            </g>
          </g>

          {/* ── D. POWER LEVEL TELEMETRY BANNER ── */}
          <g transform="translate(0, 235)">
            <text
              x="0"
              y="0"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="12.5"
              fontFamily="'Share Tech Mono', monospace"
              letterSpacing="2"
              fontWeight="bold"
              style={{ textShadow: `0 0 10px ${mainColor}, 0 0 20px ${hexToRgba(mainColor, 0.8)}` }}
            >
              {statusText || `Currently power level is at  ${powerLevel}  percent and holding steady.`}
            </text>
          </g>
        </g>

        {/* ══════════════════════════════════════════════════════════════
            3. RIGHT: ORTHOGRAPHIC 3-VIEW ARMOR FIGURES (FRONT, SIDE, BACK)
           ══════════════════════════════════════════════════════════════ */}
        <g transform="translate(1050, 310)">
          {/* Top Arc Reactor Component Schematic */}
          <g transform="translate(-130, -110)">
            <circle r="36" fill="none" stroke={mainColor} strokeWidth="1.8" filter="url(#ironNeonGlow)" />
            <circle r="26" fill="none" stroke={hexToRgba(mainColor, 0.7)} strokeWidth="1" strokeDasharray="3 3" />
            <circle r="10" fill={hexToRgba(mainColor, 0.4)} stroke={mainColor} strokeWidth="1.5" />
            {/* Cable feed lines */}
            <path d="M -36 5 C -65 15, -75 40, -100 45" fill="none" stroke={mainColor} strokeWidth="1.5" />
            <path d="M -30 15 C -55 25, -65 50, -90 60" fill="none" stroke={hexToRgba(mainColor, 0.6)} strokeWidth="1" />
          </g>

          {/* 3 Full-Body Wireframe Armor Views */}
          {/* Figure 1: 3/4 Front View */}
          <g transform="translate(-105, 0)">
            {/* Helmet */}
            <path d="M -8 -110 L 8 -110 L 10 -90 L 0 -82 L -10 -90 Z" fill="none" stroke={mainColor} strokeWidth="1.2" />
            <line x1="-5" y1="-95" x2="-1" y2="-95" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="1" y1="-95" x2="5" y2="-95" stroke="#ffffff" strokeWidth="1.5" />
            {/* Torso & Chest */}
            <path d="M -16 -82 L 16 -82 L 12 -40 L 0 -32 L -12 -40 Z" fill="none" stroke={mainColor} strokeWidth="1.2" />
            <circle cx="0" cy="-62" r="3" fill="#ffffff" filter="url(#ironEyeGlow)" />
            {/* Arms */}
            <line x1="-16" y1="-80" x2="-22" y2="-45" stroke={mainColor} strokeWidth="1.2" />
            <line x1="-22" y1="-45" x2="-20" y2="-15" stroke={mainColor} strokeWidth="1.2" />
            <line x1="16" y1="-80" x2="22" y2="-45" stroke={mainColor} strokeWidth="1.2" />
            <line x1="22" y1="-45" x2="20" y2="-15" stroke={mainColor} strokeWidth="1.2" />
            {/* Pelvis & Legs */}
            <path d="M -10 -32 L 10 -32 L 14 30 L 12 85 L 6 95 L -6 95 L -12 85 L -14 30 Z" fill="none" stroke={mainColor} strokeWidth="1.2" />
            <line x1="0" y1="-32" x2="0" y2="70" stroke={hexToRgba(mainColor, 0.4)} strokeWidth="0.8" />
            {/* Knee Plate Accent */}
            <rect x="-11" y="25" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="5" y="25" width="6" height="8" fill="#ffffff" opacity="0.9" />
          </g>

          {/* Figure 2: Profile Side View */}
          <g transform="translate(-40, 0)">
            <path d="M -4 -110 L 8 -108 L 10 -92 L 2 -82 L -6 -88 Z" fill="none" stroke={mainColor} strokeWidth="1.2" />
            <line x1="4" y1="-95" x2="8" y2="-95" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M -6 -82 L 12 -80 L 10 -35 L -8 -35 Z" fill="none" stroke={mainColor} strokeWidth="1.2" />
            <line x1="4" y1="-80" x2="4" y2="-15" stroke={mainColor} strokeWidth="1.2" />
            <path d="M -8 -35 L 8 -35 L 6 30 L 8 85 L 2 95 L -4 95 L -2 85 L -4 30 Z" fill="none" stroke={mainColor} strokeWidth="1.2" />
            <rect x="0" y="25" width="6" height="8" fill="#ffffff" opacity="0.9" />
          </g>

          {/* Figure 3: Rear Back View */}
          <g transform="translate(30, 0)">
            <path d="M -8 -110 L 8 -110 L 10 -90 L 0 -82 L -10 -90 Z" fill="none" stroke={mainColor} strokeWidth="1.2" />
            <path d="M -16 -82 L 16 -82 L 12 -40 L 0 -32 L -12 -40 Z" fill="none" stroke={mainColor} strokeWidth="1.2" />
            {/* Spine & Back Flaps */}
            <line x1="0" y1="-82" x2="0" y2="-32" stroke={redAccent} strokeWidth="2" />
            <path d="M -6 -70 L -12 -55" stroke={mainColor} strokeWidth="1.2" />
            <path d="M 6 -70 L 12 -55" stroke={mainColor} strokeWidth="1.2" />
            {/* Arms */}
            <line x1="-16" y1="-80" x2="-22" y2="-45" stroke={mainColor} strokeWidth="1.2" />
            <line x1="-22" y1="-45" x2="-20" y2="-15" stroke={mainColor} strokeWidth="1.2" />
            <line x1="16" y1="-80" x2="22" y2="-45" stroke={mainColor} strokeWidth="1.2" />
            <line x1="22" y1="-45" x2="20" y2="-15" stroke={mainColor} strokeWidth="1.2" />
            {/* Legs */}
            <path d="M -10 -32 L 10 -32 L 14 30 L 12 85 L 6 95 L -6 95 L -12 85 L -14 30 Z" fill="none" stroke={mainColor} strokeWidth="1.2" />
            <rect x="-11" y="25" width="6" height="8" fill="#ffffff" opacity="0.9" />
            <rect x="5" y="25" width="6" height="8" fill="#ffffff" opacity="0.9" />
          </g>
        </g>
      </svg>

      {/* ── CSS KEYFRAMES FOR SMOOTH REVOLUTION & GLOW ── */}
      <style>{`
        @keyframes ironGearRotateClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes anushkaEyePulse {
          0% { filter: drop-shadow(0 0 4px #00f0ff); opacity: 0.85; }
          100% { filter: drop-shadow(0 0 16px #ffffff) drop-shadow(0 0 28px #00f0ff); opacity: 1; }
        }
        @keyframes anushkaEyeSteady {
          0%, 100% { filter: drop-shadow(0 0 8px #00f0ff); opacity: 0.95; }
          50% { filter: drop-shadow(0 0 14px #ffffff) drop-shadow(0 0 20px #00f0ff); opacity: 1; }
        }
        @keyframes arcReactorPulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 8px #00f0ff); }
          100% { transform: scale(1.08); filter: drop-shadow(0 0 24px #ffffff) drop-shadow(0 0 35px #00f0ff); }
        }
        @keyframes arcReactorSteady {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
};

export default IronManHUD;
