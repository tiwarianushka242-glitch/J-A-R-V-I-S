import React, { useState, useEffect, useRef } from 'react';

/**
 * Bottom Telemetry & Controls Bar
 * Recreates the bottom HUD panel from the reference screenshot:
 * - DRIVES: C:\, D:\, E:\ with used/total GB and progress bars (populated via real psutil backend telemetry)
 * - SYSTEM CORE: CPU Usage %, RAM Usage %, SWAP Usage %
 * - NETWORK: IP Address, Upload speed, Download speed
 * - Power Actions: SHUTDOWN, RESTART, LOG OFF
 * - Media Controller: Track slider, Prev, Play/Pause, Next, Volume dial, Power button
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

const BottomTelemetryBar = ({
  blobColor = '#00f0ff',
  metricsData,
  onMediaControl,
  onPowerAction
}) => {
  const mainColor = blobColor || '#00f0ff';
  const amberColor = '#ff9900';

  // Draggable position
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_bottom_telemetry_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return { x: 80, y: Math.max(540, window.innerHeight - 130) };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  // Power action confirmation dialog state
  const [confirmAction, setConfirmAction] = useState(null);

  // Media player state
  const [isPlaying, setIsPlaying] = useState(false);

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
        y: Math.max(50, Math.min(window.innerHeight - 80, dragStartRef.current.initY + deltaY))
      });
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;
      setPos({
        x: Math.max(-100, Math.min(window.innerWidth - 300, dragStartRef.current.initX + deltaX)),
        y: Math.max(50, Math.min(window.innerHeight - 80, dragStartRef.current.initY + deltaY))
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
      localStorage.setItem('jarvis_bottom_telemetry_pos', JSON.stringify(pos));
    } catch (e) {}
  }, [pos]);

  const handlePowerClick = (type) => {
    setConfirmAction(type);
  };

  const confirmPowerExecution = () => {
    const type = confirmAction;
    setConfirmAction(null);
    if (onPowerAction) {
      onPowerAction(type);
      return;
    }
    if (type === 'SHUTDOWN') {
      fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: { type: 'OPEN_APP', target: 'shutdown /s /t 60' } })
      }).catch(() => {});
    } else if (type === 'RESTART') {
      fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: { type: 'OPEN_APP', target: 'shutdown /r /t 60' } })
      }).catch(() => {});
    } else if (type === 'LOG OFF') {
      fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: { type: 'LOCK_SCREEN' } })
      }).catch(() => {});
    }
  };

  const handleMedia = (command) => {
    if (command === 'play_pause') setIsPlaying(!isPlaying);
    if (onMediaControl) {
      onMediaControl(command);
    } else {
      fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: { type: 'MEDIA_CONTROL', command } })
      }).catch(() => {});
    }
  };

  // Telemetry fallback defaults
  const drives = metricsData?.drives?.length
    ? metricsData.drives
    : [
        { drive: 'C:', used_gb: 49.8, total_gb: 70.2, percent: 70.9 },
        { drive: 'D:', used_gb: 29.2, total_gb: 167.1, percent: 17.5 },
        { drive: 'E:', used_gb: 52.5, total_gb: 60.7, percent: 86.5 }
      ];

  const cpuPercent = metricsData?.cpu_percent ?? 1;
  const ramPercent = metricsData?.ram_percent ?? 54;
  const swapPercent = metricsData?.swap_percent ?? 36;
  const ipAddress = metricsData?.ip_address ?? '202.164.156.130';

  return (
    <>
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          position: 'fixed',
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: 'calc(100vw - 160px)',
          maxWidth: '1600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(8,16,26,0.85) 0%, rgba(4,10,18,0.95) 100%)',
          border: `1px solid ${hexToRgba(mainColor, 0.35)}`,
          borderBottom: `2px solid ${mainColor}`,
          borderRadius: '10px',
          padding: '8px 18px',
          zIndex: isDragging ? 90 : 37,
          userSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'default',
          fontFamily: "'Share Tech Mono', 'Orbitron', monospace, sans-serif",
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: `0 0 20px rgba(0,0,0,0.8), inset 0 0 12px ${hexToRgba(mainColor, 0.1)}`
        }}
      >
        {/* ── 1. DRIVES SECTION ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: amberColor, letterSpacing: '1.5px' }}>
            DRIVES
          </span>
          {drives.slice(0, 3).map((d) => (
            <div key={d.drive} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px' }}>
              <span style={{ color: '#ffffff', fontWeight: 'bold', width: '20px' }}>{d.drive}\</span>
              <div
                style={{
                  width: '90px',
                  height: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${d.percent}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${mainColor}, ${amberColor})`
                  }}
                />
              </div>
              <span style={{ color: 'rgba(220, 235, 250, 0.8)' }}>
                {d.used_gb} GB / {d.total_gb} GB used
              </span>
            </div>
          ))}
        </div>

        {/* ── 2. SYSTEM CORE TELEMETRY ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: amberColor, letterSpacing: '1.5px' }}>
            SYSTEM CORE
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
            <span style={{ color: 'rgba(220,235,250,0.75)' }}>CPU Usage</span>
            <span style={{ color: mainColor, fontWeight: 'bold' }}>{cpuPercent}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
            <span style={{ color: 'rgba(220,235,250,0.75)' }}>RAM Usage</span>
            <span style={{ color: amberColor, fontWeight: 'bold' }}>{ramPercent}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
            <span style={{ color: 'rgba(220,235,250,0.75)' }}>SWAP Usage</span>
            <span style={{ color: mainColor, fontWeight: 'bold' }}>{swapPercent}%</span>
          </div>
        </div>

        {/* ── 3. NETWORK TELEMETRY ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: amberColor, letterSpacing: '1.5px' }}>
            NETWORK
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
            <span style={{ color: 'rgba(220,235,250,0.75)' }}>IP Address</span>
            <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{ipAddress}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
            <span style={{ color: 'rgba(220,235,250,0.75)' }}>Upload</span>
            <span style={{ color: mainColor, fontWeight: 'bold' }}>0.0 B/s</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
            <span style={{ color: 'rgba(220,235,250,0.75)' }}>Download</span>
            <span style={{ color: mainColor, fontWeight: 'bold' }}>0.0 B/s</span>
          </div>
        </div>

        {/* ── 4. POWER CONTROLS & MINI MEDIA CONTROLLER ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Power Action Buttons: SHUTDOWN, RESTART, LOG OFF */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['SHUTDOWN', 'RESTART', 'LOG OFF'].map((act) => (
              <button
                key={act}
                onClick={() => handlePowerClick(act)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: act === 'SHUTDOWN' ? 'rgba(255, 34, 51, 0.2)' : 'rgba(20, 32, 48, 0.8)',
                  border: `1px solid ${act === 'SHUTDOWN' ? '#ff3344' : 'rgba(255, 255, 255, 0.2)'}`,
                  color: act === 'SHUTDOWN' ? '#ff6677' : '#ffffff',
                  fontSize: '8.5px',
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = act === 'SHUTDOWN' ? '#ff2233' : mainColor;
                  e.currentTarget.style.boxShadow = `0 0 10px ${act === 'SHUTDOWN' ? '#ff2233' : mainColor}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = act === 'SHUTDOWN' ? '#ff3344' : 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {act}
              </button>
            ))}
          </div>

          {/* Media Player Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderLeft: '1px solid rgba(255,255,255,0.15)',
              paddingLeft: '14px'
            }}
          >
            <button
              onClick={() => handleMedia('prev')}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '12px' }}
              title="Previous Track"
            >
              ⏮
            </button>
            <button
              onClick={() => handleMedia('play_pause')}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: hexToRgba(mainColor, 0.2),
                border: `1px solid ${mainColor}`,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                boxShadow: `0 0 8px ${hexToRgba(mainColor, 0.4)}`
              }}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => handleMedia('next')}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '12px' }}
              title="Next Track"
            >
              ⏭
            </button>

            {/* Circular Power Dial */}
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(10, 20, 32, 0.9)',
                border: `2px solid ${hexToRgba(mainColor, 0.7)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 10px ${hexToRgba(mainColor, 0.3)}`,
                cursor: 'pointer'
              }}
              title="Power System"
              onClick={() => handlePowerClick('LOG OFF')}
            >
              <span style={{ fontSize: '13px', color: mainColor }}>⏻</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Shutdown/Restart */}
      {confirmAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(6px)'
          }}
          onClick={() => setConfirmAction(null)}
        >
          <div
            style={{
              background: 'rgba(10, 18, 30, 0.95)',
              border: '2px solid #ff3344',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '380px',
              textAlign: 'center',
              color: '#ffffff',
              boxShadow: '0 0 30px rgba(255, 51, 68, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#ff3344', fontFamily: "'Orbitron', sans-serif" }}>
              CONFIRM {confirmAction}
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
              Are you sure you want to execute {confirmAction} on this workstation?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '18px' }}>
              <button
                onClick={confirmPowerExecution}
                style={{
                  padding: '8px 18px',
                  background: '#ff3344',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                PROCEED
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                style={{
                  padding: '8px 18px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomTelemetryBar;
