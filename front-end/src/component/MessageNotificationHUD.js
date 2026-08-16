import React, { useState, useEffect, useRef } from 'react';

/**
 * Holographic Message & Notification HUD Popup
 * Displays incoming messages from Instagram, WhatsApp, Email, Telegram, System:
 * - Floating futuristic HUD Glassmorphism card with platform cyber glow
 * - Web Audio API sci-fi chime synthesizer on message arrival
 * - Sender details, avatar, message snippet, and quick actions ("Open App", "Mark Read", "Dismiss")
 * - Collapsible Notification Center tray with unread counter & live simulation trigger
 * - Draggable with localStorage persistence
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

// Play a futuristic sci-fi holographic notification chime using Web Audio API
const playHUDChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First tone (high harmonic)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (resonant tech chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, now + 0.08); // E6
    osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.22);
    gain2.gain.setValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (e) {}
};

const MessageNotificationHUD = ({
  notifications = [],
  activePopup = null,
  blobColor = '#00f0ff',
  onOpenApp,
  onMarkRead,
  onDismissPopup,
  onSimulateMessage,
  onClearAll
}) => {
  const mainColor = blobColor || '#00f0ff';
  const [isOpenDrawer, setIsOpenDrawer] = useState(false);

  // Sound trigger on new active popup
  const lastActiveIdRef = useRef(null);
  useEffect(() => {
    if (activePopup && activePopup.id !== lastActiveIdRef.current) {
      lastActiveIdRef.current = activePopup.id;
      playHUDChime();
    }
  }, [activePopup]);

  // Draggable position for the notification badge & popup
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_notif_hud_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return {
      x: Math.max(20, window.innerWidth - 380),
      y: 135
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'INPUT') return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: pos.x,
      initY: pos.y
    };
  };

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0 || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
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
        x: Math.max(10, Math.min(window.innerWidth - 320, dragStartRef.current.initX + deltaX)),
        y: Math.max(10, Math.min(window.innerHeight - 120, dragStartRef.current.initY + deltaY))
      });
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;
      setPos({
        x: Math.max(10, Math.min(window.innerWidth - 320, dragStartRef.current.initX + deltaX)),
        y: Math.max(10, Math.min(window.innerHeight - 120, dragStartRef.current.initY + deltaY))
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
      localStorage.setItem('jarvis_notif_hud_pos', JSON.stringify(pos));
    } catch (e) {}
  }, [pos]);

  const unreadList = notifications.filter(n => !n.read);
  const unreadCount = unreadList.length;

  const getPlatformStyle = (platform = '') => {
    const p = platform.toLowerCase();
    if (p.includes('instagram') || p === 'ig') {
      return { color: '#e1306c', bg: 'linear-gradient(135deg, rgba(225,48,108,0.2) 0%, rgba(131,58,180,0.25) 100%)', badge: 'INSTAGRAM', icon: '📸' };
    }
    if (p.includes('whatsapp') || p === 'wa') {
      return { color: '#25d366', bg: 'linear-gradient(135deg, rgba(37,211,102,0.2) 0%, rgba(18,140,126,0.25) 100%)', badge: 'WHATSAPP', icon: '💬' };
    }
    if (p.includes('email') || p.includes('gmail') || p === 'mail') {
      return { color: '#ea4335', bg: 'linear-gradient(135deg, rgba(234,67,53,0.2) 0%, rgba(251,188,4,0.15) 100%)', badge: 'EMAIL', icon: '✉️' };
    }
    return { color: mainColor, bg: 'linear-gradient(135deg, rgba(0,240,255,0.2) 0%, rgba(0,120,255,0.25) 100%)', badge: 'SYSTEM', icon: '⚡' };
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        zIndex: 95,
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'default',
        fontFamily: "'Share Tech Mono', 'Orbitron', monospace, sans-serif"
      }}
    >
      {/* ── TOP: COMPACT FLOATING NOTIFICATION TRAY BAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, rgba(12,20,32,0.92) 0%, rgba(6,12,22,0.95) 100%)',
          border: `1px solid ${hexToRgba(mainColor, 0.45)}`,
          borderTop: `2px solid ${unreadCount > 0 ? '#ff5500' : mainColor}`,
          borderRadius: '8px',
          padding: '5px 10px',
          boxShadow: `0 4px 20px rgba(0,0,0,0.8), 0 0 14px ${hexToRgba(mainColor, unreadCount > 0 ? 0.4 : 0.2)}`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          maxWidth: '340px'
        }}
      >
        {/* Pulsing Alert Radar */}
        <div style={{ position: 'relative', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: unreadCount > 0 ? '#ff3344' : '#00ff88',
              boxShadow: `0 0 8px ${unreadCount > 0 ? '#ff3344' : '#00ff88'}`
            }}
          />
          {unreadCount > 0 && (
            <div
              style={{
                position: 'absolute',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: '1px solid #ff3344',
                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
              }}
            />
          )}
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(255,255,255,0.95)', letterSpacing: '1px' }}>
            INCOMING TRANSMISSIONS
          </span>
          <span style={{ fontSize: '7.5px', color: unreadCount > 0 ? '#ffaa00' : 'rgba(0,240,255,0.7)' }}>
            {unreadCount > 0 ? `${unreadCount} UNREAD ALERTS` : 'ALL CHANNELS CLEAR'}
          </span>
        </div>

        {/* Action Pills */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => onSimulateMessage && onSimulateMessage()}
            title="Simulate incoming transmission"
            style={{
              background: 'rgba(0,240,255,0.12)',
              border: `1px solid ${hexToRgba(mainColor, 0.4)}`,
              borderRadius: '4px',
              color: mainColor,
              fontSize: '8px',
              padding: '2px 6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = hexToRgba(mainColor, 0.3); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,240,255,0.12)'; }}
          >
            + TEST MSG
          </button>

          <button
            onClick={() => setIsOpenDrawer(!isOpenDrawer)}
            style={{
              background: isOpenDrawer ? hexToRgba(mainColor, 0.3) : 'rgba(255,255,255,0.08)',
              border: `1px solid rgba(255,255,255,0.2)`,
              borderRadius: '4px',
              color: '#ffffff',
              fontSize: '8px',
              padding: '2px 6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            {isOpenDrawer ? 'HIDE' : `LOG (${notifications.length})`}
          </button>
        </div>
      </div>

      {/* ── ACTIVE POPUP BANNER (WHEN A NEW MESSAGE ARRIVES) ── */}
      {activePopup && (
        <div
          style={{
            marginTop: '8px',
            width: '330px',
            background: 'linear-gradient(135deg, rgba(14,24,40,0.96) 0%, rgba(6,14,26,0.98) 100%)',
            border: `1px solid ${activePopup.color || mainColor}`,
            borderLeft: `4px solid ${activePopup.color || mainColor}`,
            borderRadius: '10px',
            padding: '10px 12px',
            boxShadow: `0 8px 32px rgba(0,0,0,0.9), 0 0 24px ${hexToRgba(activePopup.color || mainColor, 0.45)}`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            animation: 'fadeInSlide 0.3s ease-out',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top holographic accent line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: `linear-gradient(90deg, ${activePopup.color || mainColor} 0%, transparent 100%)`
            }}
          />

          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>{activePopup.avatar || getPlatformStyle(activePopup.platform).icon}</span>
              <span
                style={{
                  fontSize: '8px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  padding: '2px 5px',
                  borderRadius: '3px',
                  background: hexToRgba(activePopup.color || mainColor, 0.25),
                  color: activePopup.color || mainColor,
                  border: `1px solid ${hexToRgba(activePopup.color || mainColor, 0.5)}`
                }}
              >
                {activePopup.title || getPlatformStyle(activePopup.platform).badge}
              </span>
              <span style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.5)' }}>{activePopup.time || 'Just now'}</span>
            </div>

            <button
              onClick={() => onDismissPopup && onDismissPopup(activePopup.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: '1'
              }}
              title="Dismiss alert"
            >
              ✕
            </button>
          </div>

          {/* Sender & Body */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffffff', marginBottom: '2px' }}>
              {activePopup.sender}
            </div>
            <div
              style={{
                fontSize: '9.5px',
                color: 'rgba(220,235,255,0.9)',
                lineHeight: '1.35',
                maxHeight: '48px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              "{activePopup.message}"
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => {
                if (onOpenApp) onOpenApp(activePopup);
                if (onDismissPopup) onDismissPopup(activePopup.id);
              }}
              style={{
                flex: 1,
                padding: '4px 8px',
                background: `linear-gradient(90deg, ${hexToRgba(activePopup.color || mainColor, 0.3)} 0%, ${hexToRgba(activePopup.color || mainColor, 0.5)} 100%)`,
                border: `1px solid ${activePopup.color || mainColor}`,
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '8.5px',
                fontWeight: 'bold',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                boxShadow: `0 0 10px ${hexToRgba(activePopup.color || mainColor, 0.3)}`,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1.0)'; }}
            >
              OPEN {activePopup.platform ? activePopup.platform.toUpperCase() : 'CHAT'} ↗
            </button>

            <button
              onClick={() => {
                if (onMarkRead) onMarkRead(activePopup.id);
                if (onDismissPopup) onDismissPopup(activePopup.id);
              }}
              style={{
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '8.5px',
                cursor: 'pointer'
              }}
            >
              MARK READ
            </button>
          </div>
        </div>
      )}

      {/* ── NOTIFICATION DRAWER / HISTORY TRAY ── */}
      {isOpenDrawer && (
        <div
          style={{
            marginTop: '8px',
            width: '330px',
            maxHeight: '280px',
            background: 'linear-gradient(180deg, rgba(10,18,30,0.96) 0%, rgba(4,10,20,0.98) 100%)',
            border: `1px solid ${hexToRgba(mainColor, 0.4)}`,
            borderRadius: '8px',
            padding: '10px',
            boxShadow: `0 8px 30px rgba(0,0,0,0.9), 0 0 16px ${hexToRgba(mainColor, 0.2)}`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
            <span style={{ fontSize: '8.5px', color: mainColor, fontWeight: 'bold' }}>
              TRANSMISSION LOG ({notifications.length})
            </span>
            {notifications.length > 0 && (
              <button
                onClick={() => onClearAll && onClearAll()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff4444',
                  fontSize: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                CLEAR ALL
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>
              No transmissions in log buffer.
            </div>
          ) : (
            notifications.map((notif) => {
              const pStyle = getPlatformStyle(notif.platform);
              return (
                <div
                  key={notif.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '6px 8px',
                    background: notif.read ? 'rgba(255,255,255,0.03)' : hexToRgba(notif.color || pStyle.color, 0.12),
                    borderLeft: `3px solid ${notif.color || pStyle.color}`,
                    borderRadius: '4px',
                    border: notif.read ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${hexToRgba(notif.color || pStyle.color, 0.3)}`,
                    gap: '2px',
                    cursor: 'pointer'
                  }}
                  onClick={() => onOpenApp && onOpenApp(notif)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px' }}>{notif.avatar || pStyle.icon}</span>
                      <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#ffffff' }}>{notif.sender}</span>
                      <span style={{ fontSize: '7px', color: notif.color || pStyle.color, background: 'rgba(0,0,0,0.4)', padding: '1px 4px', borderRadius: '2px' }}>
                        {notif.title || pStyle.badge}
                      </span>
                    </div>
                    <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)' }}>{notif.time || 'Just now'}</span>
                  </div>
                  <div style={{ fontSize: '8px', color: 'rgba(220,235,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {notif.message}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default MessageNotificationHUD;
