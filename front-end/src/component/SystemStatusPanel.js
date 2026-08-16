import React, { useState, useEffect, useRef } from 'react';

/**
 * HUD Theme Palette — Matching Background Sci-Fi Cyan/Teal
 */
const HUD_CYAN = '#00f0ff';
const HUD_EMERALD = '#00ff88';

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

const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🇮🇳';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const useDraggablePanel = (storageKey, defaultPos) => {
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return defaultPos;
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
      const newX = Math.max(10, Math.min(window.innerWidth - 120, dragStartRef.current.initX + deltaX));
      const newY = Math.max(70, Math.min(window.innerHeight - 100, dragStartRef.current.initY + deltaY));
      setPos({ x: newX, y: newY });
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 120, dragStartRef.current.initX + deltaX));
      const newY = Math.max(70, Math.min(window.innerHeight - 100, dragStartRef.current.initY + deltaY));
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
      localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch (e) {}
  }, [pos, storageKey]);

  return { pos, isDragging, handleMouseDown, handleTouchStart };
};

const SystemStatusPanel = ({
  isListening,
  isProcessing,
  isJarvisSpeaking,
  commandCount = 1,
  hudGreeting
}) => {

  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: '30°C', condition: 'CLEAR', city: 'Bengaluru' });
  const [sessionStartTime] = useState(() => Date.now() - (10 * 3600 * 1000));

  const [locationData, setLocationData] = useState({
    city: 'Bengaluru',
    region: 'Karnataka',
    country: 'India',
    countryCode: 'IN',
    lat: 12.9057,
    lon: 77.6107
  });

  const [battery, setBattery] = useState({ level: 62, charging: false });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('4G');
  const [bluetoothStatus] = useState('READY');

  // Activity Monitor Event Log
  const [activityHistory, setActivityHistory] = useState([
    { time: '16:16:11', label: 'RESPONDING', color: '#ff9900' },
    { time: '16:16:06', label: 'LISTENING', color: '#00f0ff' },
    { time: '16:16:04', label: 'COMMAND RECEIVED', color: '#00ff88' },
    { time: '16:16:03', label: 'PROCESSING', color: '#00aaff' },
    { time: '16:15:51', label: 'LISTENING', color: '#00f0ff' },
    { time: '16:15:47', label: 'RESPONDING', color: '#ff9900' },
    { time: '16:15:46', label: 'LISTENING', color: '#00f0ff' }
  ]);

  // Movable Card Positions
  const locCard = useDraggablePanel('jarvis_hud_loc_pos', { x: 24, y: 88 });
  const sysGridCard = useDraggablePanel('jarvis_hud_sysgrid_pos', { x: 24, y: 260 });
  const activityCard = useDraggablePanel('jarvis_hud_activity_pos', { x: 24, y: 435 });
  const greetingCard = useDraggablePanel('jarvis_hud_greet_pos', {
    x: Math.max(20, Math.floor(window.innerWidth / 2 - 130)),
    y: Math.max(200, window.innerHeight - 200)
  });
  const sysLedCard = useDraggablePanel('jarvis_hud_sysled_pos', {
    x: Math.max(100, window.innerWidth - 225),
    y: 88
  });
  const sysInfoCard = useDraggablePanel('jarvis_hud_sysinfo_pos', {
    x: Math.max(100, window.innerWidth - 225),
    y: 315
  });

  // Track real-time events for Activity Monitor
  useEffect(() => {
    const formatCurrentTime = () => new Date().toTimeString().split(' ')[0];
    let newEntry = null;

    if (isJarvisSpeaking) {
      newEntry = { time: formatCurrentTime(), label: 'RESPONDING', color: '#ff9900' };
    } else if (isProcessing) {
      newEntry = { time: formatCurrentTime(), label: 'PROCESSING', color: '#00aaff' };
    } else if (isListening) {
      newEntry = { time: formatCurrentTime(), label: 'LISTENING', color: '#00f0ff' };
    }

    if (newEntry) {
      setActivityHistory((prev) => [newEntry, ...prev.slice(0, 8)]);
    }
  }, [isJarvisSpeaking, isProcessing, isListening]);

  useEffect(() => {
    if (commandCount > 1) {
      const formatCurrentTime = () => new Date().toTimeString().split(' ')[0];
      setActivityHistory((prev) => [
        { time: formatCurrentTime(), label: 'COMMAND RECEIVED', color: '#00ff88' },
        ...prev.slice(0, 8)
      ]);
    }
  }, [commandCount]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async (lat, lon, cityName) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        if (res.ok) {
          const data = await res.json();
          if (data.current_weather && isMounted) {
            const tempVal = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;
            let cond = 'CLEAR';
            if (code >= 1 && code <= 3) cond = 'CLOUDY';
            else if (code >= 45 && code <= 48) cond = 'FOGGY';
            else if (code >= 51 && code <= 67) cond = 'RAIN';
            else if (code >= 71 && code <= 77) cond = 'SNOW';
            else if (code >= 80 && code <= 82) cond = 'SHOWERS';
            else if (code >= 95) cond = 'STORM';

            setWeather({ temp: `${tempVal}°C`, condition: cond, city: cityName });
          }
        }
      } catch (e) {}
    };

    const resolveLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            let city = 'Bengaluru';
            let region = 'Karnataka';
            let country = 'India';
            let countryCode = 'IN';

            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
              if (res.ok) {
                const d = await res.json();
                city = d.address?.city || d.address?.town || d.address?.state_district || 'Bengaluru';
                region = d.address?.state || 'Karnataka';
                country = d.address?.country || 'India';
                countryCode = d.address?.country_code?.toUpperCase() || 'IN';
              }
            } catch (err) {}

            if (isMounted) {
              setLocationData({ city, region, country, countryCode, lat, lon });
              fetchWeather(lat, lon, city);
            }
          },
          async () => {
            try {
              const ipRes = await fetch('https://ipwho.is/');
              if (ipRes.ok) {
                const d = await ipRes.json();
                if (isMounted && d.success !== false) {
                  setLocationData({
                    city: d.city || 'Bengaluru',
                    region: d.region || 'Karnataka',
                    country: d.country || 'India',
                    countryCode: d.country_code || 'IN',
                    lat: d.latitude || 12.9057,
                    lon: d.longitude || 77.6107
                  });
                  fetchWeather(d.latitude || 12.9057, d.longitude || 77.6107, d.city || 'Bengaluru');
                }
              }
            } catch (e) {}
          },
          { timeout: 5000, enableHighAccuracy: true }
        );
      }
    };

    resolveLocation();
    const interval = setInterval(resolveLocation, 300000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then((bm) => {
        const update = () => setBattery({ level: Math.round(bm.level * 100), charging: bm.charging });
        update();
        bm.addEventListener('levelchange', update);
        bm.addEventListener('chargingchange', update);
      }).catch(() => {});
    }

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    if (navigator.connection) {
      const updateConn = () => {
        const type = navigator.connection.effectiveType?.toUpperCase() || '4G';
        setConnectionType(type.includes('4G') ? '4G' : type.includes('5G') ? '5G' : 'WIFI');
      };
      updateConn();
      navigator.connection.addEventListener('change', updateConn);
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const currentHour = time.getHours();
  let greetingPeriod = 'Afternoon';
  if (currentHour >= 5 && currentHour < 12) greetingPeriod = 'Morning';
  else if (currentHour >= 12 && currentHour < 17) greetingPeriod = 'Afternoon';
  else if (currentHour >= 17 && currentHour < 22) greetingPeriod = 'Evening';
  else greetingPeriod = 'Night';

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dateString = `${days[time.getDay()]}, ${months[time.getMonth()]} ${time.getDate()}`;
  const elapsedHours = Math.max(10, Math.floor((Date.now() - sessionStartTime) / (1000 * 60 * 60)));

  let weatherEmoji = '☀️';
  if (weather.condition === 'CLOUDY') weatherEmoji = '⛅';
  else if (weather.condition === 'RAIN' || weather.condition === 'SHOWERS') weatherEmoji = '🌧️';
  else if (weather.condition === 'SNOW') weatherEmoji = '❄️';
  else if (weather.condition === 'STORM') weatherEmoji = '⛈️';
  else if (weather.condition === 'FOGGY') weatherEmoji = '🌫️';

  const flag = getFlagEmoji(locationData.countryCode);
  const formattedLat = Number(locationData.lat).toFixed(4);
  const formattedLon = Number(locationData.lon).toFixed(4);

  // Active status indicator details
  const activeStatusLabel = isJarvisSpeaking ? 'RESPONDING' : isProcessing ? 'PROCESSING' : isListening ? 'LISTENING' : 'RESPONDING';
  const activeStatusColor = isJarvisSpeaking ? '#ff9900' : isProcessing ? '#00aaff' : isListening ? '#00f0ff' : '#ff9900';

  const getCardStyle = (pos, isDragging, width = '220px') => ({
    position: 'fixed',
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    width,
    background: 'linear-gradient(145deg, rgba(8, 26, 46, 0.88) 0%, rgba(2, 14, 28, 0.95) 100%)',
    border: `1.5px solid ${hexToRgba(HUD_CYAN, 0.42)}`,
    borderRadius: '14px',
    padding: '12px 14px',
    boxShadow: `0 0 25px ${hexToRgba(HUD_CYAN, 0.2)}, inset 0 0 15px ${hexToRgba(HUD_CYAN, 0.07)}`,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    zIndex: isDragging ? 100 : 85,
    fontFamily: "'Share Tech Mono', 'Courier New', monospace, sans-serif",
    userSelect: 'none',
    boxSizing: 'border-box',
    transition: isDragging ? 'none' : 'box-shadow 0.3s ease, border-color 0.3s ease',
    animation: 'hudPanelFadeIn 0.8s ease-out'
  });

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          1. LEFT TOP: 📍 LOCATION HUD CARD
         ══════════════════════════════════════════════════════════ */}
      <div style={getCardStyle(locCard.pos, locCard.isDragging, '220px')}>
        <div
          onMouseDown={locCard.handleMouseDown}
          onTouchStart={locCard.handleTouchStart}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '6px',
            marginBottom: '8px',
            borderBottom: `1px solid ${hexToRgba(HUD_CYAN, 0.28)}`,
            cursor: locCard.isDragging ? 'grabbing' : 'grab'
          }}
          title="Drag by name bar to move"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', filter: 'drop-shadow(0 0 4px rgba(255, 70, 70, 0.8))' }}>📍</span>
            <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '1.6px', color: HUD_CYAN }}>
              LOCATION
            </span>
          </div>
          <span style={{ color: HUD_CYAN, fontSize: '10px', opacity: 0.7 }}>⋮⋮</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '22px' }}>{flag}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px', color: HUD_CYAN }}>
              {locationData.city}
            </span>
            <span style={{ fontSize: '9.5px', color: 'rgba(210, 235, 255, 0.75)', marginTop: '1px' }}>
              {locationData.region}, {locationData.country}
            </span>
          </div>
        </div>

        <div
          style={{
            padding: '4px 6px',
            background: hexToRgba(HUD_CYAN, 0.07),
            borderRadius: '6px',
            border: `1px solid ${hexToRgba(HUD_CYAN, 0.2)}`,
            textAlign: 'center',
            fontSize: '9px',
            letterSpacing: '1px',
            color: 'rgba(210, 240, 255, 0.85)'
          }}
        >
          LAT: {formattedLat}° LNG: {formattedLon}°
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. LEFT MIDDLE: SYSTEM STATUS 2x2 GRID CARD
         ══════════════════════════════════════════════════════════ */}
      <div style={getCardStyle(sysGridCard.pos, sysGridCard.isDragging, '220px')}>
        <div
          onMouseDown={sysGridCard.handleMouseDown}
          onTouchStart={sysGridCard.handleTouchStart}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '6px',
            marginBottom: '10px',
            borderBottom: `1px solid ${hexToRgba(HUD_CYAN, 0.28)}`,
            cursor: sysGridCard.isDragging ? 'grabbing' : 'grab'
          }}
          title="Drag by name bar to move"
        >
          <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '1.6px', color: HUD_CYAN }}>
            SYSTEM STATUS
          </span>
          <span style={{ color: HUD_CYAN, fontSize: '10px', opacity: 0.7 }}>⋮⋮</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* BATTERY */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 8px',
              background: 'rgba(4, 18, 36, 0.65)',
              borderRadius: '8px',
              border: `1px solid ${hexToRgba(HUD_CYAN, 0.25)}`
            }}
          >
            <span style={{ fontSize: '15px' }}>🔋</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '7.5px', letterSpacing: '1px', color: 'rgba(180, 220, 255, 0.7)' }}>BATTERY</span>
              <span style={{ fontSize: '10.5px', fontWeight: '700', color: HUD_EMERALD }}>{battery.level}%</span>
            </div>
          </div>

          {/* NETWORK */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 8px',
              background: 'rgba(4, 18, 36, 0.65)',
              borderRadius: '8px',
              border: `1px solid ${hexToRgba(HUD_CYAN, 0.25)}`
            }}
          >
            <span style={{ fontSize: '15px' }}>📶</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '7.5px', letterSpacing: '1px', color: 'rgba(180, 220, 255, 0.7)' }}>NETWORK</span>
              <span style={{ fontSize: '10.5px', fontWeight: '700', color: isOnline ? HUD_EMERALD : '#ff4444' }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* CONNECTION */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 8px',
              background: 'rgba(4, 18, 36, 0.65)',
              borderRadius: '8px',
              border: `1px solid ${hexToRgba(HUD_CYAN, 0.25)}`
            }}
          >
            <span style={{ fontSize: '15px' }}>📡</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '7.5px', letterSpacing: '1px', color: 'rgba(180, 220, 255, 0.7)' }}>CONNECTION</span>
              <span style={{ fontSize: '10.5px', fontWeight: '700', color: HUD_CYAN }}>{connectionType}</span>
            </div>
          </div>

          {/* BLUETOOTH */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 8px',
              background: 'rgba(4, 18, 36, 0.65)',
              borderRadius: '8px',
              border: `1px solid ${hexToRgba(HUD_CYAN, 0.25)}`
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: HUD_CYAN,
                boxShadow: `0 0 8px ${HUD_CYAN}`,
                display: 'inline-block',
                margin: '2px'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '7.5px', letterSpacing: '1px', color: 'rgba(180, 220, 255, 0.7)' }}>BLUETOOTH</span>
              <span style={{ fontSize: '10.5px', fontWeight: '700', color: HUD_EMERALD }}>{bluetoothStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          3. LEFT BOTTOM: 💬 ACTIVITY MONITOR HUD CARD
         ══════════════════════════════════════════════════════════ */}
      <div style={getCardStyle(activityCard.pos, activityCard.isDragging, '220px')}>
        <div
          onMouseDown={activityCard.handleMouseDown}
          onTouchStart={activityCard.handleTouchStart}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '6px',
            marginBottom: '8px',
            borderBottom: `1px solid ${hexToRgba(HUD_CYAN, 0.28)}`,
            cursor: activityCard.isDragging ? 'grabbing' : 'grab'
          }}
          title="Drag by name bar to move"
        >
          <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.4px', color: HUD_CYAN }}>
            ACTIVITY MONITOR
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: HUD_CYAN,
                boxShadow: `0 0 6px ${HUD_CYAN}`
              }}
            />
            <span style={{ color: HUD_CYAN, fontSize: '10px', opacity: 0.7 }}>⋮⋮</span>
          </div>
        </div>

        {/* Highlighted Active Status Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px',
            background: 'rgba(4, 18, 36, 0.75)',
            border: `1px solid ${hexToRgba(activeStatusColor, 0.4)}`,
            borderRadius: '8px',
            boxShadow: `0 0 12px ${hexToRgba(activeStatusColor, 0.2)}`,
            marginBottom: '8px'
          }}
        >
          <span style={{ fontSize: '16px' }}>💬</span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '1px',
              color: activeStatusColor,
              textShadow: `0 0 10px ${hexToRgba(activeStatusColor, 0.8)}`
            }}
          >
            {activeStatusLabel}
          </span>
        </div>

        {/* Activity Timeline List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {activityHistory.slice(0, 7).map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '8.5px',
                letterSpacing: '0.6px'
              }}
            >
              <span style={{ color: 'rgba(180, 220, 245, 0.7)', fontFamily: 'inherit' }}>
                {item.time}
              </span>
              <span style={{ color: 'rgba(100, 200, 230, 0.4)', margin: '0 4px' }}>
                ⇀
              </span>
              <span
                style={{
                  fontWeight: '700',
                  color: item.color,
                  textShadow: `0 0 6px ${hexToRgba(item.color, 0.4)}`,
                  textAlign: 'right',
                  flex: 1
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          4. CENTER BOTTOM: GREETING HUD CARD
         ══════════════════════════════════════════════════════════ */}
      <div style={getCardStyle(greetingCard.pos, greetingCard.isDragging, '260px')}>
        <div
          onMouseDown={greetingCard.handleMouseDown}
          onTouchStart={greetingCard.handleTouchStart}
          style={{
            cursor: greetingCard.isDragging ? 'grabbing' : 'grab',
            textAlign: 'center',
            padding: '4px 0'
          }}
          title="Drag by card to move"
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: '800',
              letterSpacing: '0.8px',
              color: HUD_CYAN,
              textShadow: `0 0 10px ${hexToRgba(HUD_CYAN, 0.7)}`,
              marginBottom: '4px'
            }}
          >
            {hudGreeting?.title || `Good ${greetingPeriod}, Ma'am`}
          </div>
          <div
            style={{
              fontSize: '9.5px',
              letterSpacing: '0.8px',
              color: 'rgba(210, 235, 255, 0.7)',
              marginBottom: '4px',
              padding: '0 4px',
              lineHeight: '1.3'
            }}
          >
            {hudGreeting?.subtitle || 'Standing by for instructions.'}
          </div>

          <div
            style={{
              fontSize: '8.5px',
              letterSpacing: '1.5px',
              color: hexToRgba(HUD_CYAN, 0.8),
              fontWeight: '700'
            }}
          >
            — J.A.R.V.I.S.
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          5. RIGHT TOP: SYSTEM STATUS LED INDICATORS CARD
         ══════════════════════════════════════════════════════════ */}
      <div style={getCardStyle(sysLedCard.pos, sysLedCard.isDragging, '190px')}>
        <div
          onMouseDown={sysLedCard.handleMouseDown}
          onTouchStart={sysLedCard.handleTouchStart}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '6px',
            marginBottom: '8px',
            borderBottom: `1px solid ${hexToRgba(HUD_CYAN, 0.28)}`,
            cursor: sysLedCard.isDragging ? 'grabbing' : 'grab'
          }}
          title="Drag by name bar to move"
        >
          <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.4px', color: HUD_CYAN }}>
            SYSTEM STATUS
          </span>
          <span style={{ color: HUD_CYAN, fontSize: '10px', opacity: 0.7 }}>⋮⋮</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {[
            { label: 'SYSTEM ONLINE', active: true },
            { label: 'J.A.R.V.I.S. ACTIVE', active: true },
            { label: 'MICROPHONE', active: isListening },
            { label: 'MIC PERMISSION', active: true },
            { label: 'TTS SPEAKING', active: isJarvisSpeaking },
            { label: 'WAKE DETECTED', active: isProcessing },
            { label: 'API CONNECTION', active: isOnline }
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '8.5px',
                letterSpacing: '0.8px',
                color: item.active ? 'rgba(220, 245, 255, 0.85)' : 'rgba(150, 180, 200, 0.45)'
              }}
            >
              <span>{item.label}</span>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: item.active ? HUD_EMERALD : 'rgba(100, 120, 140, 0.4)',
                  boxShadow: item.active ? `0 0 8px ${HUD_EMERALD}` : 'none'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          6. RIGHT MIDDLE: SYSTEM_INFO (Clock, Weather & Stats)
         ══════════════════════════════════════════════════════════ */}
      <div style={getCardStyle(sysInfoCard.pos, sysInfoCard.isDragging, '190px')}>
        <div
          onMouseDown={sysInfoCard.handleMouseDown}
          onTouchStart={sysInfoCard.handleTouchStart}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '6px',
            marginBottom: '8px',
            borderBottom: `1px solid ${hexToRgba(HUD_CYAN, 0.28)}`,
            cursor: sysInfoCard.isDragging ? 'grabbing' : 'grab'
          }}
          title="Drag by name bar to move"
        >
          <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.4px', color: HUD_CYAN }}>
            SYSTEM_INFO
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: HUD_CYAN,
                boxShadow: `0 0 6px ${HUD_CYAN}`
              }}
            />
            <span style={{ color: HUD_CYAN, fontSize: '10px', opacity: 0.7 }}>⋮⋮</span>
          </div>
        </div>

        {/* Digital Clock */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: HUD_CYAN,
                textShadow: `0 0 14px ${hexToRgba(HUD_CYAN, 0.8)}`
              }}
            >
              {hours}:{minutes}
            </span>
            <span
              style={{
                fontSize: '12px',
                color: hexToRgba(HUD_CYAN, 0.7),
                marginLeft: '2px'
              }}
            >
              :{seconds}
            </span>
          </div>
          <div style={{ fontSize: '9px', letterSpacing: '1px', color: 'rgba(210, 240, 255, 0.8)' }}>
            {dateString}
          </div>
        </div>

        {/* Weather */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '4px 0',
            borderTop: `1px solid ${hexToRgba(HUD_CYAN, 0.15)}`,
            borderBottom: `1px solid ${hexToRgba(HUD_CYAN, 0.15)}`,
            margin: '6px 0'
          }}
        >
          <span style={{ fontSize: '15px' }}>{weatherEmoji}</span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: HUD_CYAN }}>{weather.temp}</span>
          <span style={{ fontSize: '8px', color: 'rgba(210, 240, 255, 0.75)' }}>{weather.condition}</span>
        </div>

        {/* Location Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '3px 6px',
            background: hexToRgba(HUD_CYAN, 0.08),
            borderRadius: '6px',
            fontSize: '9px',
            color: HUD_CYAN,
            marginBottom: '6px'
          }}
        >
          <span>📍</span>
          <span>{weather.city}</span>
        </div>

        {/* Uptime & Commands */}
        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '8px', color: 'rgba(200, 230, 255, 0.7)' }}>
          <div style={{ textAlign: 'center' }}>
            <div>UPTIME</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: HUD_CYAN }}>{elapsedHours}h</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div>COMMANDS</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: HUD_CYAN }}>{commandCount}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SystemStatusPanel;
