import React, { useState, useEffect, useRef } from 'react';

/**
 * S.H.I.E.L.D OS Top Bar Component
 * Recreates the top bar from the reference HUD image:
 * - Golden S.H.I.E.L.D Emblem, "S.H.I.E.L.D OS", "Ver 1.2.0", "AGENT : ANUSHKA TIWARI" + Avatar
 * - "To do list" sticky widget
 * - Center quick-launch pills: Eclipse, Firefox, Update Code, iTunes, PC Off, Feed Reader, ImgBurn, PerfMon
 * - Top-right: Location ("Kottayam, India"), Live Time ("Currently at 11:30 PM"), Date Card ("03 JULY TUESDAY"),
 *   Weather Widget ("23° RealFeel 23° Haze") + 3-Day Forecast
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

const ShieldTopBar = ({
  blobColor = '#00f0ff',
  agentName = 'ANUSHKA TIWARI',
  locationName = 'Kottayam , India',
  onExecuteAction
}) => {
  const [time, setTime] = useState(new Date());
  const mainColor = blobColor || '#00f0ff';

  // Draggable top bar position
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_shield_topbar_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return { x: 16, y: 12 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  // To-Do list state
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_hud_todos');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { text: 'backup themes', done: false },
      { text: 'volume control', done: false },
      { text: 'winamp skin', done: true }
    ];
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: pos.x,
      initY: pos.y
    };
  };

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0 || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
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
        x: Math.max(-100, Math.min(window.innerWidth - 300, dragStartRef.current.initX + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - 80, dragStartRef.current.initY + deltaY))
      });
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;
      setPos({
        x: Math.max(-100, Math.min(window.innerWidth - 300, dragStartRef.current.initX + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - 80, dragStartRef.current.initY + deltaY))
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
      localStorage.setItem('jarvis_shield_topbar_pos', JSON.stringify(pos));
    } catch (e) {}
  }, [pos]);

  const toggleTodo = (index) => {
    const next = [...todos];
    next[index].done = !next[index].done;
    setTodos(next);
    try {
      localStorage.setItem('jarvis_hud_todos', JSON.stringify(next));
    } catch (e) {}
  };

  const handlePillClick = (actionName) => {
    if (onExecuteAction) {
      onExecuteAction(actionName);
    } else {
      if (actionName === 'PC Off') {
        fetch(`${API_BASE}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: { type: 'LOCK_SCREEN' } })
        }).catch(() => {});
      } else if (actionName === 'Firefox') {
        window.open('https://www.google.com', '_blank');
      } else if (actionName === 'Update Code') {
        window.open('https://github.com', '_blank');
      } else if (actionName === 'Feed Reader') {
        window.open('https://news.google.com', '_blank');
      } else if (actionName === 'PerfMon') {
        fetch(`${API_BASE}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: { type: 'OPEN_APP', target: 'taskmgr' } })
        }).catch(() => {});
      }
    }
  };

  // Date/Time formatting matching reference: "03", "JULY", "TUESDAY", "Currently at 11:30 PM"
  const dayNumber = String(time.getDate()).padStart(2, '0');
  const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const monthName = monthNames[time.getMonth()];
  const dayName = dayNames[time.getDay()];

  let hours = time.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const timeString = `${hours}:${minutes} ${ampm}`;

  const pillButtons = [
    { label: 'Eclipse', icon: '◐', color: '#ff8800' },
    { label: 'Firefox', icon: '🦊', color: '#ff6600' },
    { label: 'Update Code', icon: '⟳', color: '#00ccff' },
    { label: 'iTunes', icon: '♫', color: '#ff3366' },
    { label: 'PC Off', icon: '⏻', color: '#ff2233' },
    { label: 'Feed Reader', icon: '📰', color: '#ff9900' },
    { label: 'ImgBurn', icon: '🔥', color: '#ffaa00' },
    { label: 'PerfMon', icon: '📊', color: '#00ffaa' }
  ];

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: 'calc(100vw - 32px)',
        maxWidth: '1880px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        zIndex: isDragging ? 90 : 38,
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'default',
        fontFamily: "'Share Tech Mono', 'Orbitron', monospace, sans-serif"
      }}
    >
      {/* ── LEFT: S.H.I.E.L.D OS BADGE & TO-DO LIST ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(10, 16, 26, 0.75)',
            padding: '6px 14px',
            borderRadius: '8px',
            border: `1px solid ${hexToRgba(mainColor, 0.35)}`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: `0 0 14px rgba(0,0,0,0.6)`
          }}
        >
          {/* Golden S.H.I.E.L.D. Eagle Emblem */}
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #ffe066 10%, #d48800 65%, #663e00 100%)',
              border: '2px solid #ffd700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(255, 215, 0, 0.5)'
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#111111">
              <path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3zm0 2.18l7 2.33v4.49c0 4.48-3.04 8.68-7 9.87-3.96-1.19-7-5.39-7-9.87V6.51l7-2.33zM12 6.5l-3.5 3.5h2v4h3v-4h2L12 6.5z" />
            </svg>
          </div>

          {/* S.H.I.E.L.D OS Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  letterSpacing: '1.5px',
                  textShadow: '0 0 6px rgba(255,255,255,0.7)'
                }}
              >
                S.H.I.E.L.D OS
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '8.5px' }}>Ver 1.2.0</span>
            </div>
            <div style={{ color: mainColor, fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>
              AGENT : {agentName}
            </div>
          </div>

          {/* Iron Man Avatar Profile Badge */}
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              background: 'rgba(20, 30, 48, 0.8)',
              border: `1px solid ${mainColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 8px ${hexToRgba(mainColor, 0.4)}`
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill={mainColor}>
              <path d="M12 2C8 2 6 4 6 8v6c0 4 2 8 6 8s6-4 6-8V8c0-4-2-6-6-6zm-3 8h2v2H9v-2zm8 2h-2v-2h2v2zm-6 4h4v1h-4v-1z" />
            </svg>
          </div>
        </div>

        {/* Mini "To do list" widget */}
        <div
          style={{
            background: 'rgba(8, 14, 24, 0.7)',
            borderLeft: `2px solid ${hexToRgba(mainColor, 0.5)}`,
            padding: '4px 10px',
            borderRadius: '0 6px 6px 0',
            fontSize: '9px',
            color: 'rgba(220, 235, 250, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            maxWidth: '140px',
            backdropFilter: 'blur(4px)'
          }}
        >
          <span style={{ color: mainColor, fontWeight: 'bold', fontSize: '9.5px' }}>To do list</span>
          {todos.map((item, idx) => (
            <div
              key={idx}
              onClick={() => toggleTodo(idx)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: item.done ? 'line-through' : 'none',
                opacity: item.done ? 0.45 : 0.95
              }}
              title="Click to check/uncheck"
            >
              <span>-</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CENTER: QUICK LAUNCH PILL BUTTONS ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(6, 12, 22, 0.75)',
          padding: '4px 8px',
          borderRadius: '20px',
          border: `1px solid ${hexToRgba(mainColor, 0.25)}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 0 16px rgba(0,0,0,0.6)'
        }}
      >
        {pillButtons.map((btn) => (
          <button
            key={btn.label}
            onClick={() => handlePillClick(btn.label)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              borderRadius: '14px',
              background: 'rgba(18, 28, 44, 0.65)',
              border: `1px solid rgba(255, 255, 255, 0.15)`,
              color: '#ffffff',
              fontSize: '9.5px',
              fontFamily: "'Share Tech Mono', monospace",
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = btn.color;
              e.currentTarget.style.boxShadow = `0 0 10px ${btn.color}`;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: '11px' }}>{btn.icon}</span>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* ── RIGHT: LOCATION, LIVE DATE CARD & WEATHER FORECAST ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'rgba(8, 14, 24, 0.75)',
          padding: '6px 14px',
          borderRadius: '8px',
          border: `1px solid ${hexToRgba(mainColor, 0.35)}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 0 16px rgba(0,0,0,0.6)'
        }}
      >
        {/* City & Live Time */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <div style={{ color: '#ffffff', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.8px' }}>
            {locationName}
          </div>
          <div style={{ color: 'rgba(220, 240, 255, 0.75)', fontSize: '9px' }}>
            Currently at <span style={{ color: mainColor, fontWeight: 'bold' }}>{timeString}</span>
          </div>
        </div>

        {/* Large Reference Date Card: "03 JULY TUESDAY" */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(20,30,45,0.9), rgba(10,18,30,0.95))',
            border: `1px solid ${hexToRgba(mainColor, 0.4)}`,
            borderRadius: '6px',
            padding: '2px 8px',
            minWidth: '58px',
            boxShadow: `0 0 10px ${hexToRgba(mainColor, 0.25)}`
          }}
        >
          <span
            style={{
              fontSize: '22px',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: '1',
              fontFamily: "'Orbitron', sans-serif",
              textShadow: `0 0 8px ${mainColor}`
            }}
          >
            {dayNumber}
          </span>
          <div
            style={{
              width: '100%',
              height: '2px',
              background: 'linear-gradient(90deg, #ff8800, #ffaa00)',
              margin: '2px 0'
            }}
          />
          <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#ffaa00', letterSpacing: '1px' }}>
            {monthName}
          </span>
          <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
            {dayName}
          </span>
        </div>

        {/* Weather Badge & 3-Day Forecast */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Weather Icon (Golden Moon/Sun with Haze) */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #ffea88 20%, #ffaa00 70%, #994400 100%)',
              boxShadow: '0 0 14px rgba(255, 170, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '15px' }}>🌕</span>
          </div>

          {/* Temperature & Conditions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>23°</span>
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.6)' }}>RealFeel 23°</span>
            </div>
            <span style={{ fontSize: '8.5px', color: '#ffaa00', fontWeight: 'bold' }}>Haze</span>
          </div>

          {/* 3-Day Forecast mini columns */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              borderLeft: '1px solid rgba(255,255,255,0.15)',
              paddingLeft: '8px'
            }}
          >
            {[
              { day: 'Today', temp: '23°C', icon: '☀️' },
              { day: 'Wed', temp: '31°C', icon: '⛅' },
              { day: 'Thu', temp: '31°C', icon: '🌤️' }
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.6)' }}>{f.day}</span>
                <span style={{ fontSize: '9px' }}>{f.icon}</span>
                <span style={{ fontSize: '7.5px', color: mainColor, fontWeight: 'bold' }}>{f.temp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShieldTopBar;
