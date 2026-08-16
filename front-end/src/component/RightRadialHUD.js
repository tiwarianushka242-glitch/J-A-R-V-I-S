import React, { useState, useEffect, useRef } from 'react';

/**
 * Bottom-Right Radial HUD & Quick Launcher Dial
 * Recreates the bottom-right circular HUD from the reference screenshot:
 * - Concentric arc dials with rotating orange, white, and cyan sectors
 * - Quick Link Nodes: IMDb, Gmail, Facebook, GoodReads, Science News, Ctrl-Alt-Del
 * - Live Time ("11:55 PM") + Weekday Row (Su Mo Tu We Th Fr Sa) + Days Matrix (01 02 03...)
 * - Bottom Radial Category Pills: Downloads, Pics, Staff, Work, Rainmeter
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

const API_BASE = window.location.port === '3000' ? 'http://localhost:5000' : '';

const RightRadialHUD = ({
  blobColor = '#00f0ff',
  onTriggerShortcut
}) => {
  const [time, setTime] = useState(new Date());
  const mainColor = blobColor || '#00f0ff';
  const orangeAccent = '#ff5500';

  // Draggable position
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_radial_hud_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return { x: Math.max(780, window.innerWidth - 450), y: Math.max(340, window.innerHeight - 400) };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.tagName === 'BUTTON') return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: pos.x,
      initY: pos.y
    };
  };

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0 || e.target.tagName === 'BUTTON') return;
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
        x: Math.max(-100, Math.min(window.innerWidth - 200, dragStartRef.current.initX + deltaX)),
        y: Math.max(50, Math.min(window.innerHeight - 200, dragStartRef.current.initY + deltaY))
      });
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;
      setPos({
        x: Math.max(-100, Math.min(window.innerWidth - 200, dragStartRef.current.initX + deltaX)),
        y: Math.max(50, Math.min(window.innerHeight - 200, dragStartRef.current.initY + deltaY))
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
      localStorage.setItem('jarvis_radial_hud_pos', JSON.stringify(pos));
    } catch (e) {}
  }, [pos]);

  const handleNodeClick = (node) => {
    if (onTriggerShortcut) {
      onTriggerShortcut(node);
      return;
    }
    if (node.url) {
      window.open(node.url, '_blank');
    } else if (node.type === 'execute') {
      fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: { type: 'OPEN_APP', target: 'taskmgr' } })
      }).catch(() => {});
    }
  };

  const arcLinks = [
    { label: 'IMDb', url: 'https://www.imdb.com', color: '#f5c518' },
    { label: 'Gmail', url: 'https://mail.google.com', color: '#ea4335' },
    { label: 'Facebook', url: 'https://www.facebook.com', color: '#1877f2' },
    { label: 'GoodReads', url: 'https://www.goodreads.com', color: '#75420e' },
    { label: 'Science News', url: 'https://www.sciencedaily.com', color: '#00ccff' },
    { label: 'Ctrl - Alt - Del', type: 'execute', color: '#ff4444' }
  ];

  const bottomPills = ['Downloads', 'Pics', 'Staff', 'Work', 'Rainmeter'];

  let hours = time.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const timeDisplay = `${hours}:${minutes}`;

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const currentDayIdx = time.getDay();

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '380px',
        height: '340px',
        zIndex: isDragging ? 90 : 36,
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        fontFamily: "'Share Tech Mono', 'Orbitron', monospace, sans-serif"
      }}
      title="Click and drag anywhere to move the Radial HUD"
    >
      {/* ── CONCENTRIC ARC SVG DIAL ── */}
      <svg
        viewBox="0 0 380 340"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
          filter: `drop-shadow(0 0 16px ${hexToRgba(mainColor, 0.3)})`
        }}
      >
        <defs>
          <filter id="rightRadialGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform="translate(240, 160)">
          {/* Outer Heavy Orange Arc */}
          <path
            d="M -110 -100 A 150 150 0 0 1 70 -130"
            fill="none"
            stroke={orangeAccent}
            strokeWidth="14"
            strokeLinecap="round"
            filter="url(#rightRadialGlow)"
          />

          {/* Calibrated Ticks along outer arc */}
          <circle
            r="165"
            fill="none"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1"
            strokeDasharray="2 5"
          />

          {/* Mid Layer Dark Track */}
          <circle r="130" fill="rgba(8, 16, 26, 0.85)" stroke={hexToRgba(mainColor, 0.5)} strokeWidth="1.5" />

          {/* Segmented Light Grey Arc */}
          <path
            d="M 20 -125 A 130 130 0 0 1 125 -20"
            fill="none"
            stroke="rgba(200, 215, 230, 0.7)"
            strokeWidth="20"
            strokeDasharray="30 4"
          />

          {/* Inner Concentric Rings */}
          <circle r="100" fill="rgba(4, 10, 18, 0.9)" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" />
          <circle r="75" fill="none" stroke={mainColor} strokeWidth="1.5" strokeDasharray="6 3" />
          <circle r="50" fill="rgba(8, 18, 30, 0.95)" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />
          <circle r="22" fill={hexToRgba(mainColor, 0.2)} stroke={mainColor} strokeWidth="1.5" />
          <circle r="4" fill="#ffffff" />

          {/* Crosshairs */}
          <line x1="-95" y1="0" x2="95" y2="0" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.8" />
          <line x1="0" y1="-95" x2="0" y2="95" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.8" />
        </g>
      </svg>

      {/* ── TIME & WEEKDAY TRACKER (CENTER-LEFT OF RADIAL) ── */}
      <div
        style={{
          position: 'absolute',
          left: '20px',
          top: '110px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '3px',
          background: 'rgba(8, 14, 24, 0.8)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: `1px solid ${hexToRgba(mainColor, 0.3)}`,
          backdropFilter: 'blur(6px)'
        }}
      >
        {/* Time with AM/PM pill */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span
            style={{
              fontSize: '19px',
              fontWeight: '900',
              color: '#ffffff',
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: '1px'
            }}
          >
            {timeDisplay}
          </span>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: orangeAccent }}>{ampm}</span>
        </div>

        {/* Weekdays Row: Su Mo Tu We Th Fr Sa */}
        <div style={{ display: 'flex', gap: '5px' }}>
          {weekdays.map((d, i) => (
            <span
              key={d}
              style={{
                fontSize: '8px',
                fontWeight: i === currentDayIdx ? 'bold' : 'normal',
                color: i === currentDayIdx ? '#00f0ff' : 'rgba(255, 255, 255, 0.45)',
                borderBottom: i === currentDayIdx ? '2px solid #00f0ff' : 'none'
              }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Day Numbers Matrix: 01 02 03 04 05 06 07 */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
          {['01', '02', '03', '04', '05', '06', '07'].map((num, i) => (
            <span
              key={num}
              style={{
                fontSize: '7.5px',
                color: i === 2 ? '#ffaa00' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: i === 2 ? 'bold' : 'normal'
              }}
            >
              {num}
            </span>
          ))}
        </div>
      </div>

      {/* ── RIGHT ARC SHORTCUT NODES ── */}
      <div
        style={{
          position: 'absolute',
          right: '8px',
          top: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          alignItems: 'flex-start'
        }}
      >
        {arcLinks.map((node) => (
          <div
            key={node.label}
            onClick={() => handleNodeClick(node)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '9.5px',
              color: 'rgba(235, 245, 255, 0.9)',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(10, 18, 30, 0.65)',
              borderLeft: `2px solid ${node.color || mainColor}`,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(4px)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.boxShadow = `0 0 8px ${node.color || mainColor}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.color = 'rgba(235, 245, 255, 0.9)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '7px', color: node.color || mainColor }}>▶</span>
            <span>{node.label}</span>
          </div>
        ))}
      </div>

      {/* ── BOTTOM RADIAL PILLS ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '50px',
          display: 'flex',
          gap: '5px'
        }}
      >
        {bottomPills.map((pill) => (
          <button
            key={pill}
            onClick={() => {
              if (pill === 'Downloads') {
                window.open('https://drive.google.com', '_blank');
              } else if (pill === 'Pics') {
                window.open('https://photos.google.com', '_blank');
              }
            }}
            style={{
              padding: '3px 9px',
              borderRadius: '12px',
              background: 'rgba(22, 34, 52, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: '8.5px',
              fontFamily: "'Share Tech Mono', monospace",
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = mainColor;
              e.currentTarget.style.boxShadow = `0 0 8px ${mainColor}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {pill}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RightRadialHUD;
