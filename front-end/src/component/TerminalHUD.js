import React, { useState, useEffect, useRef } from 'react';

const HUD_CYAN = '#00f0ff';

const hexToRgba = (hex = '#00f0ff', alpha = 1) => {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(0, 240, 255, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TerminalHUD = ({
  logs = [],
  isProcessing = false,
  liveVoiceText = '',
  isListening = false,
  isOpen = true,
  onToggle,
  onStartListening,
  onSendPrompt
}) => {
  const bodyRef = useRef(null);
  const [inputText, setInputText] = useState('');

  // Draggable position for Terminal HUD
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_hud_terminal_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return {
      x: Math.max(20, window.innerWidth - 360),
      y: Math.max(100, window.innerHeight - 150)
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
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
      const newX = Math.max(10, Math.min(window.innerWidth - 150, dragStartRef.current.initX + deltaX));
      const newY = Math.max(70, Math.min(window.innerHeight - 80, dragStartRef.current.initY + deltaY));
      setPos({ x: newX, y: newY });
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 150, dragStartRef.current.initX + deltaX));
      const newY = Math.max(70, Math.min(window.innerHeight - 80, dragStartRef.current.initY + deltaY));
      setPos({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

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
      localStorage.setItem('jarvis_hud_terminal_pos', JSON.stringify(pos));
    } catch (e) {}
  }, [pos]);

  // Auto scroll
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs, isProcessing, liveVoiceText]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (trimmed && onSendPrompt) {
      onSendPrompt(trimmed);
      setInputText('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '330px',
        background: 'linear-gradient(145deg, rgba(8, 26, 46, 0.9) 0%, rgba(2, 14, 28, 0.96) 100%)',
        border: `1.5px solid ${hexToRgba(HUD_CYAN, 0.45)}`,
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: `0 0 25px ${hexToRgba(HUD_CYAN, 0.22)}, inset 0 0 15px ${hexToRgba(HUD_CYAN, 0.08)}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: isDragging ? 100 : 88,
        fontFamily: "'Share Tech Mono', 'Courier New', monospace, sans-serif",
        userSelect: 'none',
        boxSizing: 'border-box',
        transition: isDragging ? 'none' : 'box-shadow 0.3s ease, border-color 0.3s ease',
        animation: 'hudPanelFadeIn 0.8s ease-out'
      }}
    >
      {/* Draggable Header / Name Bar */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '6px',
          marginBottom: '8px',
          borderBottom: `1px solid ${hexToRgba(HUD_CYAN, 0.28)}`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        title="Drag by header to move"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isProcessing ? '#ffaa00' : isListening ? '#00ff88' : '#ff4444',
              boxShadow: isProcessing ? '0 0 8px #ffaa00' : isListening ? '0 0 8px #00ff88' : '0 0 8px #ff4444'
            }}
          />
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: '700',
              letterSpacing: '1.4px',
              color: HUD_CYAN,
              textShadow: `0 0 8px ${hexToRgba(HUD_CYAN, 0.7)}`
            }}
          >
            SYSTEM_LOG // J.A.R.V.I.S.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!isListening ? (
            <button
              onClick={onStartListening}
              style={{
                background: 'rgba(0, 255, 136, 0.15)',
                border: '1px solid #00ff88',
                borderRadius: '4px',
                color: '#00ff88',
                fontSize: '8px',
                padding: '2px 5px',
                cursor: 'pointer',
                letterSpacing: '0.5px'
              }}
              title="Activate Microphone"
            >
              🎤 MIC ON
            </button>
          ) : (
            <span style={{ fontSize: '8px', color: '#00ff88', letterSpacing: '0.8px' }}>
              {isProcessing ? 'THINKING' : 'ACTIVE'}
            </span>
          )}
          <span style={{ color: HUD_CYAN, fontSize: '10px', opacity: 0.7 }}>⋮⋮</span>
        </div>
      </div>

      {/* Terminal Log Area */}
      <div
        ref={bodyRef}
        style={{
          maxHeight: '75px',
          minHeight: '40px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontSize: '9.5px',
          letterSpacing: '0.5px',
          padding: '2px 0'
        }}
      >
        {logs.length === 0 && !liveVoiceText && (
          <div style={{ color: 'rgba(180, 220, 255, 0.55)', fontStyle: 'italic' }}>
            &gt; SYSTEM &gt; standing by for voice or text prompt...
          </div>
        )}

        {logs.map((log, idx) => (
          <div key={idx} style={{ lineHeight: '1.3' }}>
            <span
              style={{
                color: log.type === 'PROMPT' ? '#ff0055' : log.type === 'AI' ? '#00ff88' : HUD_CYAN,
                fontWeight: '700',
                marginRight: '5px'
              }}
            >
              &gt; {log.type === 'PROMPT' ? 'USER' : log.type === 'AI' ? 'JARVIS' : 'SYSTEM'} &gt;
            </span>
            <span
              style={{
                color: log.type === 'PROMPT' ? '#ffffff' : log.type === 'AI' ? '#d4f8ff' : 'rgba(200, 230, 255, 0.8)'
              }}
            >
              {log.text}
            </span>
          </div>
        ))}

        {liveVoiceText && (
          <div style={{ color: '#00ff88', fontStyle: 'italic' }}>
            &gt; LISTENING &gt; "{liveVoiceText}"
          </div>
        )}
      </div>

      {/* Quick Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', marginTop: '6px', gap: '4px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter command..."
          style={{
            flex: 1,
            background: 'rgba(2, 10, 22, 0.8)',
            border: `1px solid ${hexToRgba(HUD_CYAN, 0.3)}`,
            borderRadius: '4px',
            padding: '3px 6px',
            color: '#ffffff',
            fontSize: '9px',
            fontFamily: 'inherit',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          style={{
            background: hexToRgba(HUD_CYAN, 0.15),
            border: `1px solid ${hexToRgba(HUD_CYAN, 0.5)}`,
            borderRadius: '4px',
            color: HUD_CYAN,
            fontSize: '9px',
            padding: '3px 8px',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          SEND
        </button>
      </form>
    </div>
  );
};

export default TerminalHUD;
