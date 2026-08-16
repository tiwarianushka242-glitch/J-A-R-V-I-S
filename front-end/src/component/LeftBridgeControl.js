import React, { useState, useEffect, useRef } from 'react';

/**
 * Left Sidebar: Bridge Control & Quick Launchers
 * Recreates the left HUD wing from the reference screenshot:
 * - Chamfered metallic bracket with vertical "BRIDGE CONTROL" text & status LEDs
 * - Vertical RAM / Battery Usage meter with 0-100 graduated tick scale & level bar
 * - Futuristic app launch tabs: Chrome, IE / Edge, uTorrent, Trillian / Chat, ADL Acc Chk, Mobility Ctrl
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

const LeftBridgeControl = ({
  blobColor = '#00f0ff',
  ramPercent = 54,
  onLaunchApp,
  unreadCounts = {},
  onClearPlatformBadge
}) => {
  const mainColor = blobColor || '#00f0ff';
  const amberColor = '#ff8800';

  // Draggable position
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_bridge_control_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return { x: 12, y: 150 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

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
        y: Math.max(50, Math.min(window.innerHeight - 300, dragStartRef.current.initY + deltaY))
      });
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;
      setPos({
        x: Math.max(-100, Math.min(window.innerWidth - 200, dragStartRef.current.initX + deltaX)),
        y: Math.max(50, Math.min(window.innerHeight - 300, dragStartRef.current.initY + deltaY))
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
      localStorage.setItem('jarvis_bridge_control_pos', JSON.stringify(pos));
    } catch (e) {}
  }, [pos]);

  const launchItem = (tab) => {
    if (tab.platformKey && onClearPlatformBadge) {
      onClearPlatformBadge(tab.platformKey);
    }
    if (onLaunchApp) {
      onLaunchApp(tab.name, tab.url, tab.appKey);
      return;
    }
    if (tab.url) {
      window.open(tab.url, '_blank');
    } else if (tab.appKey) {
      fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: { type: 'OPEN_APP', target: tab.appKey } })
      }).catch(() => {});
    }
  };

  const appTabs = [
    { name: 'Chrome', icon: '🌐', url: 'https://www.google.com', appKey: 'chrome', color: '#ff4444' },
    { name: 'IE / Edge', icon: '🌍', url: 'https://www.bing.com', appKey: 'msedge', color: '#00aaff' },
    { name: 'Instagram', icon: '📸', url: 'https://www.instagram.com', appKey: 'instagram', color: '#e1306c', platformKey: 'instagram' },
    { name: 'Email / Gmail', icon: '✉️', url: 'https://mail.google.com', appKey: 'gmail', color: '#ea4335', platformKey: 'email' },
    { name: 'WhatsApp', icon: '💬', url: 'https://web.whatsapp.com', appKey: 'whatsapp', color: '#25d366', platformKey: 'whatsapp' },
    { name: 'uTorrent', icon: '⚡', appKey: 'utorrent', color: '#00cc66' },
    { name: 'ADL Acc Chk', icon: '📈', appKey: 'calc', color: '#ffaa00' },
    { name: 'Mobility Ctrl', icon: '💻', appKey: 'cmd', color: '#aa00ff' }
  ];

  const ticks = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        zIndex: isDragging ? 90 : 36,
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'default',
        fontFamily: "'Share Tech Mono', 'Orbitron', monospace, sans-serif"
      }}
    >
      {/* ── LEFT: VERTICAL BRIDGE CONTROL BRACKET & USAGE GAUGE ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(14,22,34,0.85) 0%, rgba(6,12,20,0.92) 100%)',
          border: `1px solid ${hexToRgba(mainColor, 0.4)}`,
          borderLeft: `3px solid ${mainColor}`,
          borderRadius: '12px',
          padding: '12px 8px',
          boxShadow: `0 0 18px rgba(0,0,0,0.7), inset 0 0 10px ${hexToRgba(mainColor, 0.15)}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          width: '56px'
        }}
      >
        {/* Top LEDs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: amberColor, boxShadow: `0 0 6px ${amberColor}` }} />
        </div>

        {/* Vertical BRIDGE CONTROL Title */}
        <div
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            color: 'rgba(220,235,250,0.85)',
            fontSize: '8.5px',
            fontWeight: 'bold',
            letterSpacing: '3px',
            margin: '8px 0',
            textShadow: `0 0 6px ${hexToRgba(mainColor, 0.6)}`
          }}
        >
          BRIDGE CONTROL
        </div>

        {/* RAM Usage Heading */}
        <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.7)', marginTop: '12px', textAlign: 'center' }}>
          RAM USAGE
        </div>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: amberColor, marginBottom: '6px' }}>
          {ramPercent}%
        </div>

        {/* Vertical Graduated Tick Gauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Vertical Bar Meter */}
          <div
            style={{
              width: '6px',
              height: '140px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '3px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${Math.min(100, Math.max(0, ramPercent))}%`,
                background: `linear-gradient(0deg, ${mainColor} 0%, ${amberColor} 80%, #ff2233 100%)`,
                boxShadow: `0 0 8px ${amberColor}`,
                transition: 'height 0.4s ease'
              }}
            />
          </div>

          {/* Graduated Numerical Scale (100 down to 0) */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '140px' }}>
            {ticks.map((t) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <div
                  style={{
                    width: t % 20 === 0 ? '5px' : '3px',
                    height: '1px',
                    background: t <= ramPercent ? amberColor : 'rgba(255,255,255,0.25)'
                  }}
                />
                <span
                  style={{
                    fontSize: '6.5px',
                    color: t <= ramPercent ? amberColor : 'rgba(255,255,255,0.4)',
                    fontWeight: t % 20 === 0 ? 'bold' : 'normal'
                  }}
                >
                  {t}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: CHAMFERED QUICK LAUNCH TABS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {appTabs.map((tab) => {
          const badgeCount = tab.platformKey ? (unreadCounts[tab.platformKey] || (tab.platformKey === 'email' ? unreadCounts['gmail'] : 0) || 0) : 0;
          return (
            <button
              key={tab.name}
              onClick={() => launchItem(tab)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '132px',
                padding: '6px 12px',
                background: 'linear-gradient(90deg, rgba(14,24,38,0.92) 0%, rgba(8,16,28,0.85) 85%, rgba(0,0,0,0.6) 100%)',
                border: `1px solid ${badgeCount > 0 ? tab.color : 'rgba(255, 255, 255, 0.15)'}`,
                borderLeft: `3px solid ${tab.color}`,
                clipPath: 'polygon(0% 0%, 90% 0%, 100% 30%, 100% 100%, 0% 100%)',
                color: '#ffffff',
                fontSize: '10px',
                fontFamily: "'Share Tech Mono', monospace",
                cursor: 'pointer',
                outline: 'none',
                boxShadow: badgeCount > 0 ? `0 0 12px ${tab.color}` : '0 2px 8px rgba(0,0,0,0.5)',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tab.color;
                e.currentTarget.style.boxShadow = `0 0 16px ${tab.color}`;
                e.currentTarget.style.transform = 'translateX(6px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = badgeCount > 0 ? tab.color : 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.boxShadow = badgeCount > 0 ? `0 0 12px ${tab.color}` : '0 2px 8px rgba(0,0,0,0.5)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>{tab.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {badgeCount > 0 && (
                  <span
                    style={{
                      background: tab.color,
                      color: '#ffffff',
                      fontSize: '8.5px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      padding: '1px 5px',
                      boxShadow: `0 0 8px ${tab.color}`,
                      border: '1px solid rgba(255,255,255,0.7)',
                      lineHeight: '1.2'
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
                <span style={{ fontSize: '12px' }}>{tab.icon}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeftBridgeControl;
