import React, { useState, useEffect, useRef } from 'react';

/**
 * Movable J.A.R.V.I.S. Control Box
 * Replaces the wide top navbar with a compact, floating, draggable tech box
 * Contains: [ Home ], [ HUD Layout ], [ Settings ], [ Dashboard ], [ About ]
 * Fully movable anywhere according to user's need with localStorage persistence.
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

const Navbar = ({
    sensitivity = 2.0,
    onSensitivityChange,
    blobColor = '#00f0ff',
    onColorChange,
    blobSize = 2.0,
    onSizeChange,
    agentName = 'ANUSHKA TIWARI',
    onAgentNameChange,
    locationName = 'Kottayam , India',
    onLocationChange,
    hudVisibility = {},
    onVisibilityToggle,
    onResetLayout,
    onResetDefaults,
    onClearHistory,
    commandCount = 1
}) => {
    const [activeTab, setActiveTab] = useState('Home');
    const [activeModal, setActiveModal] = useState(null); // 'Settings' | 'HUD Layout' | 'Dashboard' | 'About' | null
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [memoryClearedStatus, setMemoryClearedStatus] = useState('');

    // Draggable position state for the compact floating control box
    const [pos, setPos] = useState(() => {
        try {
            const saved = localStorage.getItem('jarvis_nav_box_pos');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    return parsed;
                }
            }
        } catch (e) {}
        // Default position: top right area below the S.H.I.E.L.D header
        return {
            x: Math.max(20, window.innerWidth - 380),
            y: 80
        };
    });

    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

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
                x: Math.max(0, Math.min(window.innerWidth - 180, dragStartRef.current.initX + deltaX)),
                y: Math.max(0, Math.min(window.innerHeight - 60, dragStartRef.current.initY + deltaY))
            });
        };

        const handleTouchMove = (e) => {
            if (!e.touches || e.touches.length === 0) return;
            const touch = e.touches[0];
            const deltaX = touch.clientX - dragStartRef.current.startX;
            const deltaY = touch.clientY - dragStartRef.current.startY;
            setPos({
                x: Math.max(0, Math.min(window.innerWidth - 180, dragStartRef.current.initX + deltaX)),
                y: Math.max(0, Math.min(window.innerHeight - 60, dragStartRef.current.initY + deltaY))
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
            localStorage.setItem('jarvis_nav_box_pos', JSON.stringify(pos));
        } catch (e) {}
    }, [pos]);

    const navItems = [
        { name: 'Home', icon: '⌂' },
        { name: 'HUD Layout', icon: '◫' },
        { name: 'Settings', icon: '⚙' },
        { name: 'Dashboard', icon: '📊' },
        { name: 'About', icon: 'ℹ' }
    ];

    const handleTabClick = (item) => {
        setActiveTab(item);
        if (item === 'Home') {
            setActiveModal(null);
        } else {
            setActiveModal(item);
        }
    };

    const closeModal = () => {
        setActiveModal(null);
        setActiveTab('Home');
        setMemoryClearedStatus('');
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && activeModal) {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeModal]);

    const handleClearMemoryClick = async () => {
        setMemoryClearedStatus('Clearing memory...');
        if (onClearHistory) {
            await onClearHistory();
            setMemoryClearedStatus('Memory cleared successfully!');
            setTimeout(() => setMemoryClearedStatus(''), 3000);
        }
    };

    const colorPresets = [
        { name: 'Arc Reactor Red', hex: '#ff1e27' },
        { name: 'Electric Cyan', hex: '#00f0ff' },
        { name: 'Imperial Gold', hex: '#ffd700' },
        { name: 'Neon Purple', hex: '#a100ff' },
        { name: 'Plasma Pink', hex: '#ff007f' },
        { name: 'Cyber Emerald', hex: '#00ff88' },
        { name: 'Solar Amber', hex: '#ff9900' },
        { name: 'Pure White', hex: '#ffffff' }
    ];

    const widgetsList = [
      { key: 'blueprint', label: 'Iron Man Blueprint HUD' },
      { key: 'topBar', label: 'S.H.I.E.L.D OS Header Bar' },
      { key: 'bridgeControl', label: 'Left Bridge Control & Launchers' },
      { key: 'radarDial', label: 'Bottom-Left J.A.R.V.I.S. Radar Dial' },
      { key: 'radialHud', label: 'Bottom-Right Radial Dial & Shortcuts' },
      { key: 'telemetryBar', label: 'Bottom System Telemetry & Controls' },
      { key: 'biometrics', label: 'Biometric Face & Voice Scanner' },
      { key: 'blob', label: '3D Voice Assistant Sphere (Blob)' },
      { key: 'terminal', label: 'Floating Terminal Console' },
      { key: 'notifications', label: 'Incoming Message & Notification HUD' }
    ];

    return (
        <>
            {/* ══════════════════════════════════════════════════════════ */}
            {/* COMPACT MOVABLE FLOATING CONTROL BOX */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                style={{
                    position: 'fixed',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    zIndex: isDragging ? 100 : 85,
                    userSelect: 'none',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    fontFamily: "'Share Tech Mono', 'Orbitron', monospace, sans-serif"
                }}
                title="Click and drag anywhere on this box header to move the menu"
            >
                <div
                    style={{
                        background: 'linear-gradient(135deg, rgba(8, 18, 34, 0.9) 0%, rgba(4, 10, 20, 0.95) 100%)',
                        border: `1px solid ${hexToRgba(blobColor, 0.45)}`,
                        borderRadius: '10px',
                        padding: '6px 10px',
                        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.75), 0 0 16px ${hexToRgba(blobColor, 0.25)}`,
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        minWidth: '280px'
                    }}
                >
                    {/* Header Bar with Drag Handle & Brand */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: `1px solid ${hexToRgba(blobColor, 0.2)}`,
                            paddingBottom: '4px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: blobColor,
                                    boxShadow: `0 0 8px ${blobColor}`
                                }}
                            />
                            <span
                                style={{
                                    color: blobColor,
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    fontFamily: "'Orbitron', sans-serif",
                                    letterSpacing: '2px'
                                }}
                            >
                                J.A.R.V.I.S.
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '8px' }}>[ DRAG ]</span>
                        </div>

                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.6)',
                                cursor: 'pointer',
                                fontSize: '10px',
                                padding: '0 4px'
                            }}
                            title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                        >
                            {isCollapsed ? '▼' : '▲'}
                        </button>
                    </div>

                    {/* Compact Option Pills in a Single Row / Grid */}
                    {!isCollapsed && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {navItems.map((item) => {
                                const isActive = activeTab === item.name;
                                return (
                                    <button
                                        key={item.name}
                                        onClick={() => handleTabClick(item.name)}
                                        style={{
                                            flex: '1 1 auto',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            padding: '4px 8px',
                                            borderRadius: '5px',
                                            background: isActive ? hexToRgba(blobColor, 0.25) : 'rgba(255, 255, 255, 0.05)',
                                            border: `1px solid ${isActive ? blobColor : 'rgba(255, 255, 255, 0.15)'}`,
                                            color: isActive ? '#ffffff' : 'rgba(220, 240, 255, 0.8)',
                                            fontSize: '9.5px',
                                            fontFamily: "'Share Tech Mono', monospace",
                                            fontWeight: isActive ? 'bold' : 'normal',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isActive ? `0 0 10px ${hexToRgba(blobColor, 0.35)}` : 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = blobColor;
                                            e.currentTarget.style.color = '#ffffff';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                                e.currentTarget.style.color = 'rgba(220, 240, 255, 0.8)';
                                            }
                                        }}
                                    >
                                        <span style={{ fontSize: '10px', color: blobColor }}>{item.icon}</span>
                                        <span>{item.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* 1. HUD LAYOUT & ADJUSTABILITY MODAL */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeModal === 'HUD Layout' && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={styles.modalTitle}>HUD LAYOUT & ADJUSTABILITY</h3>
                                <p style={styles.modalSubtitle}>CUSTOMIZE WIDGETS & REPOSITIONING</p>
                            </div>
                            <button style={styles.closeIconButton} onClick={closeModal}>✕</button>
                        </div>

                        {/* Reset Draggable Layout Coordinates Button */}
                        <div style={styles.settingGroup}>
                            <label style={styles.settingLabel}>HUD REPOSITIONING</label>
                            <p style={{ fontSize: '10px', color: 'rgba(220,235,250,0.7)', margin: '4px 0 8px 0' }}>
                                All HUD elements (Blueprint, Top Bar, Sidebar, Radars, Telemetry, Menu Box, 3D Sphere) can be dragged across the screen. Click below to snap all elements back to their pristine reference layout.
                            </p>
                            <button
                                style={{
                                    ...styles.applyButton,
                                    width: '100%',
                                    background: 'linear-gradient(90deg, #00f0ff 0%, #0088ff 100%)',
                                    color: '#000000',
                                    fontWeight: 'bold',
                                    boxShadow: '0 0 15px rgba(0,240,255,0.4)'
                                }}
                                onClick={onResetLayout}
                            >
                                ↺ RESET HUD LAYOUT TO REFERENCE DEFAULT
                            </button>
                        </div>

                        {/* Widget Visibility Toggles */}
                        <div style={styles.settingGroup}>
                            <label style={styles.settingLabel}>ACTIVE HUD MODULES</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                                {widgetsList.map((w) => {
                                    const isVisible = hudVisibility[w.key] !== false;
                                    return (
                                        <button
                                            key={w.key}
                                            onClick={() => onVisibilityToggle && onVisibilityToggle(w.key)}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                background: isVisible ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                border: `1px solid ${isVisible ? blobColor : 'rgba(255,255,255,0.15)'}`,
                                                color: isVisible ? '#ffffff' : 'rgba(255,255,255,0.45)',
                                                fontSize: '9.5px',
                                                fontFamily: "'Share Tech Mono', monospace",
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <span>{w.label}</span>
                                            <span>{isVisible ? '● ON' : '○ OFF'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Agent & Location Customization */}
                        <div style={styles.settingGroup}>
                            <label style={styles.settingLabel}>AGENT & LOCATION SPECIFICATION</label>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.6)' }}>AGENT NAME:</span>
                                    <input
                                        type="text"
                                        value={agentName}
                                        onChange={(e) => onAgentNameChange && onAgentNameChange(e.target.value)}
                                        style={{
                                            width: '100%',
                                            marginTop: '3px',
                                            padding: '6px 8px',
                                            background: 'rgba(10,20,34,0.8)',
                                            border: `1px solid ${blobColor}`,
                                            borderRadius: '4px',
                                            color: '#ffffff',
                                            fontFamily: "'Share Tech Mono', monospace",
                                            fontSize: '11px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1.5 }}>
                                    <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.6)' }}>WEATHER LOCATION:</span>
                                    <input
                                        type="text"
                                        value={locationName}
                                        onChange={(e) => onLocationChange && onLocationChange(e.target.value)}
                                        style={{
                                            width: '100%',
                                            marginTop: '3px',
                                            padding: '6px 8px',
                                            background: 'rgba(10,20,34,0.8)',
                                            border: `1px solid ${blobColor}`,
                                            borderRadius: '4px',
                                            color: '#ffffff',
                                            fontFamily: "'Share Tech Mono', monospace",
                                            fontSize: '11px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button style={styles.applyButton} onClick={closeModal}>
                                SAVE & CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* 2. SETTINGS MODAL */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeModal === 'Settings' && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={styles.modalTitle}>JARVIS SYSTEM CONFIGURATION</h3>
                                <p style={styles.modalSubtitle}>AUDIO RESPONSIVENESS & 3D SPHERE VISUALS</p>
                            </div>
                            <button style={styles.closeIconButton} onClick={closeModal}>✕</button>
                        </div>

                        {/* Setting 1: Audio Sensitivity */}
                        <div style={styles.settingGroup}>
                            <div style={styles.settingLabelRow}>
                                <label style={styles.settingLabel}>AUDIO SENSITIVITY</label>
                                <span style={styles.settingValueBadge}>{sensitivity.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="3.5"
                                step="0.1"
                                value={sensitivity}
                                onChange={(e) => onSensitivityChange && onSensitivityChange(parseFloat(e.target.value))}
                                style={styles.rangeSlider}
                            />
                            <div style={styles.sliderLabels}>
                                <span>0.5x (Subtle)</span>
                                <span>2.0x (Optimal)</span>
                                <span>3.5x (High)</span>
                            </div>
                        </div>

                        {/* Setting 2: Blob Base Size */}
                        <div style={styles.settingGroup}>
                            <div style={styles.settingLabelRow}>
                                <label style={styles.settingLabel}>3D VOICE SPHERE SIZE</label>
                                <span style={styles.settingValueBadge}>{blobSize.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.8"
                                max="3.5"
                                step="0.1"
                                value={blobSize}
                                onChange={(e) => onSizeChange && onSizeChange(parseFloat(e.target.value))}
                                style={styles.rangeSlider}
                            />
                            <div style={styles.sliderLabels}>
                                <span>Compact</span>
                                <span>Standard</span>
                                <span>Expanded</span>
                            </div>
                        </div>

                        {/* Setting 3: Color Palette */}
                        <div style={styles.settingGroup}>
                            <div style={styles.settingLabelRow}>
                                <label style={styles.settingLabel}>HUD THEME PALETTE</label>
                                <div style={styles.customColorPickerWrapper}>
                                    <span style={styles.customColorText}>CUSTOM:</span>
                                    <input
                                        type="color"
                                        value={blobColor}
                                        onChange={(e) => onColorChange && onColorChange(e.target.value)}
                                        style={styles.colorInput}
                                        title="Pick Custom Hex Color"
                                    />
                                </div>
                            </div>

                            <div style={styles.presetGrid}>
                                {colorPresets.map((preset) => {
                                    const isSelected = blobColor.toLowerCase() === preset.hex.toLowerCase();
                                    return (
                                        <button
                                            key={preset.hex}
                                            onClick={() => onColorChange && onColorChange(preset.hex)}
                                            style={{
                                                ...styles.presetSwatch,
                                                backgroundColor: preset.hex,
                                                boxShadow: isSelected
                                                    ? `0 0 16px ${preset.hex}, 0 0 2px #fff`
                                                    : 'none',
                                                border: isSelected
                                                    ? '2px solid #ffffff'
                                                    : '1px solid rgba(255, 255, 255, 0.2)'
                                            }}
                                            title={preset.name}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Setting 4: Memory & Quick Actions */}
                        <div style={styles.settingGroup}>
                            <label style={styles.settingLabel}>SYSTEM MEMORY & DEFAULTS</label>
                            <div style={styles.actionButtonGroup}>
                                <button
                                    style={styles.secondaryButton}
                                    onClick={handleClearMemoryClick}
                                    title="Reset AI conversation memory"
                                >
                                    🗑️ CLEAR CHAT MEMORY
                                </button>
                                <button
                                    style={styles.secondaryButton}
                                    onClick={onResetDefaults}
                                    title="Reset all settings to default values"
                                >
                                    ↺ RESTORE DEFAULTS
                                </button>
                            </div>
                            {memoryClearedStatus && (
                                <p style={styles.statusSuccessNotice}>{memoryClearedStatus}</p>
                            )}
                        </div>

                        <div style={styles.modalFooter}>
                            <button style={styles.applyButton} onClick={closeModal}>
                                SAVE & CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* 3. DASHBOARD MODAL */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeModal === 'Dashboard' && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={styles.modalTitle}>JARVIS SYSTEM DASHBOARD</h3>
                                <p style={styles.modalSubtitle}>REAL-TIME ARCHITECTURE & DIAGNOSTICS</p>
                            </div>
                            <button style={styles.closeIconButton} onClick={closeModal}>✕</button>
                        </div>

                        <div style={styles.dashboardGrid}>
                            <div style={styles.dashboardCard}>
                                <span style={styles.dashCardLabel}>LLM INFERENCE ENGINE</span>
                                <span style={styles.dashCardValue}>Groq Llama-3.3-70b</span>
                                <span style={styles.dashCardSub}>Status: Ultra-Fast Online</span>
                            </div>
                            <div style={styles.dashboardCard}>
                                <span style={styles.dashCardLabel}>SPEECH-TO-TEXT ENGINE</span>
                                <span style={styles.dashCardValue}>Continuous Web Speech</span>
                                <span style={styles.dashCardSub}>Sub-50ms Carrier KeepAlive</span>
                            </div>
                            <div style={styles.dashboardCard}>
                                <span style={styles.dashCardLabel}>NEURAL TTS SYNTHESIS</span>
                                <span style={styles.dashCardValue}>Christopher Neural</span>
                                <span style={styles.dashCardSub}>Humanoid 24kHz Audio</span>
                            </div>
                            <div style={styles.dashboardCard}>
                                <span style={styles.dashCardLabel}>TOTAL COMMANDS</span>
                                <span style={styles.dashCardValue}>{commandCount} Processed</span>
                                <span style={styles.dashCardSub}>Zero Runtime Errors</span>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button style={styles.applyButton} onClick={closeModal}>
                                CLOSE DASHBOARD
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* 4. ABOUT MODAL */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeModal === 'About' && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={styles.modalTitle}>JARVIS AI ASSISTANT DOSSIER</h3>
                                <p style={styles.modalSubtitle}>SYSTEM GENESIS & CREATOR SPECIFICATIONS</p>
                            </div>
                            <button style={styles.closeIconButton} onClick={closeModal}>✕</button>
                        </div>

                        <div style={styles.aboutCard}>
                            <p style={styles.aboutText}>
                                <strong style={{ color: blobColor }}>JARVIS</strong> was created and engineered by{' '}
                                <strong style={{ color: '#ffffff' }}>Anushka Tiwari</strong>, a brilliant student of
                                Artificial Intelligence and Machine Learning.
                            </p>
                            <p style={styles.aboutText}>
                                Built with state-of-the-art neural AI and futuristic holographic interfaces, Anushka completed JARVIS on{' '}
                                <strong style={{ color: blobColor }}>August 14, 2026</strong> after 30 hours of continuous,
                                untiring development.
                            </p>
                            <div style={styles.techStackRow}>
                                <span style={styles.techTag}>React 18</span>
                                <span style={styles.techTag}>Three.js WebGL</span>
                                <span style={styles.techTag}>Python 3.12</span>
                                <span style={styles.techTag}>Groq LLM</span>
                                <span style={styles.techTag}>Edge-TTS</span>
                                <span style={styles.techTag}>Win32 Automation</span>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button style={styles.applyButton} onClick={closeModal}>
                                RETURN TO HUD
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const styles = {
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 16, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
    },
    modalContent: {
        width: '100%',
        maxWidth: '520px',
        backgroundColor: 'rgba(6, 18, 38, 0.95)',
        border: '1px solid rgba(0, 240, 255, 0.4)',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 240, 255, 0.25)',
        fontFamily: "'Share Tech Mono', monospace",
        color: '#ffffff',
        maxHeight: '90vh',
        overflowY: 'auto'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid rgba(0, 240, 255, 0.25)',
        paddingBottom: '16px',
        marginBottom: '20px'
    },
    modalTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '900',
        fontFamily: "'Orbitron', sans-serif",
        color: '#ffffff',
        letterSpacing: '1.5px'
    },
    modalSubtitle: {
        margin: '4px 0 0 0',
        fontSize: '10px',
        color: '#00f0ff',
        letterSpacing: '1px'
    },
    closeIconButton: {
        background: 'none',
        border: 'none',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '18px',
        cursor: 'pointer',
        padding: '4px 8px',
        lineHeight: 1
    },
    settingGroup: {
        marginBottom: '20px'
    },
    settingLabelRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
    },
    settingLabel: {
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '1.5px',
        color: 'rgba(220, 245, 255, 0.9)'
    },
    settingValueBadge: {
        fontSize: '11px',
        color: '#00f0ff',
        fontWeight: 'bold',
        background: 'rgba(0, 240, 255, 0.12)',
        padding: '2px 8px',
        borderRadius: '4px',
        border: '1px solid rgba(0, 240, 255, 0.3)'
    },
    rangeSlider: {
        width: '100%',
        accentColor: '#00f0ff',
        cursor: 'pointer'
    },
    sliderLabels: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '9px',
        color: 'rgba(255, 255, 255, 0.45)',
        marginTop: '4px'
    },
    customColorPickerWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    customColorText: {
        fontSize: '9px',
        color: 'rgba(255, 255, 255, 0.6)'
    },
    colorInput: {
        width: '24px',
        height: '24px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        background: 'transparent'
    },
    presetGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '8px',
        marginTop: '8px'
    },
    presetSwatch: {
        height: '28px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'transform 0.15s ease'
    },
    actionButtonGroup: {
        display: 'flex',
        gap: '10px',
        marginTop: '8px'
    },
    secondaryButton: {
        flex: 1,
        padding: '8px 12px',
        borderRadius: '6px',
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#ffffff',
        fontSize: '10px',
        fontFamily: "'Share Tech Mono', monospace",
        cursor: 'pointer',
        transition: 'background 0.2s ease'
    },
    statusSuccessNotice: {
        fontSize: '10px',
        color: '#00ff88',
        margin: '6px 0 0 0'
    },
    modalFooter: {
        borderTop: '1px solid rgba(0, 240, 255, 0.2)',
        paddingTop: '16px',
        display: 'flex',
        justifyContent: 'flex-end'
    },
    applyButton: {
        padding: '10px 24px',
        borderRadius: '8px',
        background: 'linear-gradient(90deg, #00f0ff 0%, #0088ff 100%)',
        border: 'none',
        color: '#000000',
        fontSize: '12px',
        fontWeight: '900',
        fontFamily: "'Orbitron', sans-serif",
        letterSpacing: '1px',
        cursor: 'pointer',
        boxShadow: '0 0 16px rgba(0, 240, 255, 0.4)'
    },
    dashboardGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '20px'
    },
    dashboardCard: {
        background: 'rgba(10, 25, 48, 0.6)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    dashCardLabel: {
        fontSize: '8.5px',
        color: '#00f0ff',
        letterSpacing: '1px'
    },
    dashCardValue: {
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#ffffff'
    },
    dashCardSub: {
        fontSize: '8px',
        color: 'rgba(255, 255, 255, 0.5)'
    },
    aboutCard: {
        background: 'rgba(10, 25, 48, 0.6)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
    },
    aboutText: {
        fontSize: '12px',
        lineHeight: '1.6',
        color: 'rgba(230, 245, 255, 0.9)',
        margin: '0 0 12px 0'
    },
    techStackRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '12px'
    },
    techTag: {
        fontSize: '9px',
        background: 'rgba(0, 240, 255, 0.12)',
        border: '1px solid rgba(0, 240, 255, 0.35)',
        padding: '3px 8px',
        borderRadius: '4px',
        color: '#00f0ff'
    }
};

export default Navbar;
