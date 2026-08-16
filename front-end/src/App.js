import React, { useState, useEffect, useRef, useMemo } from 'react';
import AIAssistantBubble from './component/blob';
import Navbar from './component/Navbar';
import TerminalHUD from './component/TerminalHUD';
import AnimatedBackground from './component/AnimatedBackground';
import IronManHUD from './component/IronManHUD';
import ShieldTopBar from './component/ShieldTopBar';
import LeftBridgeControl from './component/LeftBridgeControl';
import JarvisRadarDial from './component/JarvisRadarDial';
import RightRadialHUD from './component/RightRadialHUD';
import BottomTelemetryBar from './component/BottomTelemetryBar';
import BiometricScanner from './component/BiometricScanner';
import MessageNotificationHUD from './component/MessageNotificationHUD';
import './App.css';

const API_BASE = window.location.port === '3000' ? 'http://localhost:5000' : '';

function App() {
  const [sensitivity, setSensitivity] = useState(() => {
    const saved = localStorage.getItem('jarvis_blob_sensitivity');
    return saved ? parseFloat(saved) : 2.0;
  });

  const [blobColor, setBlobColor] = useState(() => {
    return localStorage.getItem('jarvis_blob_color') || '#00f0ff';
  });

  const [blobSize, setBlobSize] = useState(() => {
    const saved = localStorage.getItem('jarvis_blob_size');
    return saved ? parseFloat(saved) : 2.0;
  });

  const [agentName, setAgentName] = useState(() => {
    return localStorage.getItem('jarvis_agent_name') || 'ANUSHKA TIWARI';
  });

  const [locationName, setLocationName] = useState(() => {
    return localStorage.getItem('jarvis_location_name') || 'Kottayam , India';
  });

  // Biometric Security & Guest Mode State
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  // HUD Widget Visibility Configuration
  const [hudVisibility, setHudVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_hud_visibility');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      blueprint: true,
      topBar: true,
      bridgeControl: true,
      radarDial: true,
      radialHud: true,
      telemetryBar: true,
      biometrics: true,
      blob: true,
      terminal: true,
      notifications: true
    };
  });

  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [liveVoiceText, setLiveVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [commandCount, setCommandCount] = useState(() => {
    const saved = localStorage.getItem('jarvis_cmd_count');
    return saved ? parseInt(saved, 10) : 1;
  });

  // Real-time System Metrics from Backend
  const [systemMetrics, setSystemMetrics] = useState(null);

  // Holographic Notifications & Incoming Transmissions Engine
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_hud_notifications');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'notif-init-1',
        platform: 'instagram',
        sender: 'Sarah Jenkins',
        avatar: '📸',
        title: 'Instagram Direct',
        message: 'Hey Anushka! Loved the latest AI project demo you posted!',
        time: 'Just now',
        timestamp: Date.now(),
        read: false,
        url: 'https://www.instagram.com/direct/inbox/',
        color: '#e1306c'
      },
      {
        id: 'notif-init-2',
        platform: 'email',
        sender: 'Tony Stark / Stark Industries',
        avatar: '✉️',
        title: 'Email / Gmail',
        message: 'JARVIS Mark VII neural protocol update is ready for deployment.',
        time: '5m ago',
        timestamp: Date.now() - 300000,
        read: false,
        url: 'https://mail.google.com',
        color: '#ea4335'
      },
      {
        id: 'notif-init-3',
        platform: 'whatsapp',
        sender: 'Alex & Project Team',
        avatar: '💬',
        title: 'WhatsApp Web',
        message: 'Meeting scheduled at 4 PM to review the HUD dashboard telemetry.',
        time: '12m ago',
        timestamp: Date.now() - 720000,
        read: false,
        url: 'https://web.whatsapp.com',
        color: '#25d366'
      }
    ];
  });

  const [activeNotificationPopup, setActiveNotificationPopup] = useState(null);
  const popupTimerRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('jarvis_hud_notifications', JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  // Unread badge calculations for sidebar & widgets
  const unreadCounts = useMemo(() => {
    return {
      instagram: notifications.filter(n => !n.read && n.platform === 'instagram').length,
      email: notifications.filter(n => !n.read && (n.platform === 'email' || n.platform === 'gmail' || n.platform === 'mail')).length,
      whatsapp: notifications.filter(n => !n.read && n.platform === 'whatsapp').length
    };
  }, [notifications]);

  const recognitionRef = useRef(null);
  const openedTabsRef = useRef([]); // track windows opened by the UI so we can close them by index
  const autoClearTimerRef = useRef(null);
  const currentAudioRef = useRef(null);
  const isProcessingRef = useRef(false);
  const chatHistoryRef = useRef([]);

  const handleSensitivityChange = (val) => {
    setSensitivity(val);
    localStorage.setItem('jarvis_blob_sensitivity', val.toString());
  };

  const handleColorChange = (val) => {
    setBlobColor(val);
    localStorage.setItem('jarvis_blob_color', val);
  };

  const handleSizeChange = (val) => {
    setBlobSize(val);
    localStorage.setItem('jarvis_blob_size', val.toString());
  };

  const handleAgentNameChange = (name) => {
    setAgentName(name);
    localStorage.setItem('jarvis_agent_name', name);
  };

  const handleLocationChange = (loc) => {
    setLocationName(loc);
    localStorage.setItem('jarvis_location_name', loc);
  };

  const handleVisibilityToggle = (widgetKey) => {
    setHudVisibility((prev) => {
      const next = { ...prev, [widgetKey]: !prev[widgetKey] };
      localStorage.setItem('jarvis_hud_visibility', JSON.stringify(next));
      return next;
    });
  };

  // Reset all draggable HUD positions to reference default layout
  const handleResetLayout = () => {
    localStorage.removeItem('jarvis_blob_pos');
    localStorage.removeItem('jarvis_ironman_blueprint_pos');
    localStorage.removeItem('jarvis_shield_topbar_pos');
    localStorage.removeItem('jarvis_bridge_control_pos');
    localStorage.removeItem('jarvis_radar_dial_pos');
    localStorage.removeItem('jarvis_radial_hud_pos');
    localStorage.removeItem('jarvis_bottom_telemetry_pos');
    localStorage.removeItem('jarvis_biometric_pos');
    localStorage.removeItem('jarvis_nav_box_pos');
    localStorage.removeItem('jarvis_terminal_pos');
    localStorage.removeItem('jarvis_notif_hud_pos');
    addLog('SYSTEM', 'HUD Layout coordinates restored to pristine default layout.');
    window.location.reload();
  };

  const handleResetDefaults = () => {
    handleSensitivityChange(2.0);
    handleColorChange('#00f0ff');
    handleSizeChange(2.0);
    handleAgentNameChange('ANUSHKA TIWARI');
    handleLocationChange('Kottayam , India');
    addLog('SYSTEM', 'System parameters restored to optimal defaults.');
  };

  const handleClearHistory = async () => {
    chatHistoryRef.current = [];
    try {
      await fetch(`${API_BASE}/api/history/clear`, { method: 'POST' });
      addLog('SYSTEM', 'AI conversation memory successfully cleared.');
      return true;
    } catch (e) {
      console.warn('Clear history notice:', e);
      addLog('SYSTEM', 'Local conversation memory cleared.');
      return false;
    }
  };

  const addLog = (type, text) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, type, text }]);
  };

  const [isJarvisSpeaking, setIsJarvisSpeaking] = useState(false);
  const isJarvisSpeakingRef = useRef(false);
  const silenceUntilRef = useRef(0);
  const lastAiResponseRef = useRef('');

  const lastDispatchedTextRef = useRef('');
  const lastDispatchedTimeRef = useRef(0);

  // Vocal announcement trigger for incoming messages / transmissions
  const speakNotificationAlert = async (notif, customAudioUrl = null) => {
    if (!notif) return;
    const speechText = `Ma'am, you have a new message from ${notif.sender} on ${notif.title || notif.platform}: '${notif.message}'`;
    addLog('AI', speechText);

    try {
      let audioUrl = customAudioUrl;
      if (!audioUrl) {
        const res = await fetch(`${API_BASE}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: speechText })
        });
        const data = await res.json();
        if (data.status === 'success' && data.audio_url) {
          audioUrl = data.audio_url;
        }
      }

      if (audioUrl) {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (e) {}
        }
        clearTimeout(autoClearTimerRef.current);
        setLiveVoiceText('');
        isJarvisSpeakingRef.current = true;
        setIsJarvisSpeaking(true);
        silenceUntilRef.current = Date.now() + 60000;

        if (currentAudioRef.current) {
          try {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
          } catch (e) {}
        }

        const rawAudioUrl = audioUrl.startsWith('http') ? audioUrl : `${API_BASE}${audioUrl}`;
        const cacheBustUrl = `${rawAudioUrl}${rawAudioUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        const audio = new Audio(cacheBustUrl);
        currentAudioRef.current = audio;

        const handleNotifEnd = () => {
          isJarvisSpeakingRef.current = false;
          setIsJarvisSpeaking(false);
          silenceUntilRef.current = Date.now() + 1500;
          setTimeout(() => {
            if (isListeningRef.current && !isJarvisSpeakingRef.current && !isRecognitionRunningRef.current) {
              try {
                recognitionRef.current?.start();
                isRecognitionRunningRef.current = true;
              } catch (e) {}
            }
          }, 1500);
        };

        audio.onplay = () => {
          isJarvisSpeakingRef.current = true;
          setIsJarvisSpeaking(true);
        };
        audio.onended = handleNotifEnd;
        audio.onerror = handleNotifEnd;
        audio.play().catch(handleNotifEnd);
      } else {
        // Browser SpeechSynthesis fallback
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(speechText);
          utterance.rate = 1.05;
          utterance.pitch = 0.95;
          isJarvisSpeakingRef.current = true;
          setIsJarvisSpeaking(true);
          utterance.onend = () => {
            isJarvisSpeakingRef.current = false;
            setIsJarvisSpeaking(false);
          };
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (e) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.rate = 1.05;
        isJarvisSpeakingRef.current = true;
        setIsJarvisSpeaking(true);
        utterance.onend = () => {
          isJarvisSpeakingRef.current = false;
          setIsJarvisSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Notification action handlers
  const handleSimulateMessage = async (platform = null) => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platform ? { platform } : {})
      });
      const data = await res.json();
      if (data.status === 'success' && data.notification) {
        setNotifications((prev) => [data.notification, ...prev.filter(n => n.id !== data.notification.id)]);
        setActiveNotificationPopup(data.notification);
        if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
        popupTimerRef.current = setTimeout(() => {
          setActiveNotificationPopup(null);
        }, 12000);

        speakNotificationAlert(data.notification, data.audio_url);
      }
    } catch (e) {
      // Offline fallback simulation
      const sample = {
        id: `notif-${Date.now()}`,
        platform: platform || 'instagram',
        sender: 'Sarah Jenkins',
        avatar: '📸',
        title: 'Instagram Direct',
        message: 'Hey Anushka! New update is ready to test.',
        time: 'Just now',
        timestamp: Date.now(),
        read: false,
        url: 'https://www.instagram.com/direct/inbox/',
        color: '#e1306c'
      };
      setNotifications((prev) => [sample, ...prev]);
      setActiveNotificationPopup(sample);
      speakNotificationAlert(sample);
    }
  };

  const handleOpenNotificationApp = (notif) => {
    if (!notif) return;
    setNotifications((prev) =>
      prev.map(n => (n.id === notif.id ? { ...n, read: true } : n))
    );
    fetch(`${API_BASE}/api/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notif.id })
    }).catch(() => {});

    if (notif.url) {
      window.open(notif.url, '_blank');
    }
  };

  const handleMarkNotificationRead = (id) => {
    setNotifications((prev) =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    fetch(`${API_BASE}/api/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).catch(() => {});
  };

  const handleDismissNotificationPopup = (id) => {
    setActiveNotificationPopup(null);
  };

  const handleClearPlatformBadge = (platformKey) => {
    setNotifications((prev) =>
      prev.map(n => {
        const p = n.platform.toLowerCase();
        if (
          p === platformKey.toLowerCase() ||
          (platformKey === 'email' && (p === 'gmail' || p === 'mail'))
        ) {
          return { ...n, read: true };
        }
        return n;
      })
    );
    fetch(`${API_BASE}/api/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: platformKey })
    }).catch(() => {});
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    setActiveNotificationPopup(null);
    fetch(`${API_BASE}/api/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).catch(() => {});
  };

  // Sync notifications from backend on mount
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications`);
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.notifications) && data.notifications.length > 0) {
          setNotifications(data.notifications);
        }
      } catch (e) {}
    };
    fetchNotifs();
  }, []);

  // Poll Real Live System Metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/system/metrics`);
        const data = await res.json();
        if (data.status === 'success') {
          setSystemMetrics(data);
        }
      } catch (e) {}
    };

    fetchMetrics();
    const timer = setInterval(fetchMetrics, 3000);
    return () => clearInterval(timer);
  }, []);

  // Execute Action Helper
  const executeActionPayload = (action) => {
    if (!action) return;
    if ((action.type === 'OPEN_URL' || action.type === 'OPEN_NEW_TAB') && action.url) {
      addLog('SYSTEM', `Opening in browser: ${action.url}`);
      try {
        const win = window.open(action.url, '_blank');
        openedTabsRef.current.push({ win, url: action.url, openedAt: Date.now() });
      } catch (e) {}
    } else if (action.type === 'CLOSE_CURRENT_TAB') {
      const arr = openedTabsRef.current;
      if (arr && arr.length > 0) {
        const entry = arr.pop();
        try { entry.win?.close(); } catch (e) {}
        addLog('SYSTEM', 'Closed active browser tab.');
      } else {
        try {
          fetch(`${API_BASE}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
          }).catch(() => {});
        } catch (e) {}
      }
    } else if (action.type === 'OPEN_APP' && action.target) {
      addLog('SYSTEM', `Requesting system to launch: ${action.target}`);
      try {
        fetch(`${API_BASE}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        }).catch(() => {});
      } catch (e) {}
    } else if (action.type === 'CLOSE_JARVIS') {
      setTimeout(() => {
        setIsListening(false);
        isListeningRef.current = false;
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (e) {}
        }
        try { window.close(); } catch (e) {}
      }, 4000);
    }
  };

  // Confirmation Handlers
  const handleConfirmPendingAction = () => {
    if (pendingConfirmation) {
      addLog('SYSTEM', `Action authorized by Ma'am ${agentName}. Executing...`);
      if (pendingConfirmation.action) {
        executeActionPayload(pendingConfirmation.action);
      }
      setPendingConfirmation(null);
    }
  };

  const handleCancelPendingAction = () => {
    addLog('SYSTEM', 'Action denied by security protocol.');
    setPendingConfirmation(null);
  };

  // Dispatch spoken prompt to Groq LLM backend with multi-turn memory & biometric gating
  const processUserPrompt = async (spokenText) => {
    if (!spokenText) return;

    if (isJarvisSpeakingRef.current || isProcessingRef.current || Date.now() < silenceUntilRef.current) {
      return;
    }

    const trimmed = spokenText.trim();
    const lowerTrimmed = trimmed.toLowerCase();

    // Check for Ma'am's verbal authorization for pending action
    if (pendingConfirmation) {
      if (
        lowerTrimmed.includes('yes') ||
        lowerTrimmed.includes('proceed') ||
        lowerTrimmed.includes('authorize') ||
        lowerTrimmed.includes('allow') ||
        lowerTrimmed.includes('ok') ||
        lowerTrimmed.includes('sure')
      ) {
        handleConfirmPendingAction();
        return;
      } else if (
        lowerTrimmed.includes('no') ||
        lowerTrimmed.includes('deny') ||
        lowerTrimmed.includes('cancel') ||
        lowerTrimmed.includes('stop') ||
        lowerTrimmed.includes('don\'t')
      ) {
        handleCancelPendingAction();
        return;
      }
    }

    const now = Date.now();
    if (lowerTrimmed === lastDispatchedTextRef.current.toLowerCase() && (now - lastDispatchedTimeRef.current) < 3500) {
      return;
    }

    if (lastAiResponseRef.current) {
      const lastAiLower = lastAiResponseRef.current.toLowerCase();
      if (lastAiLower.includes(lowerTrimmed) || lowerTrimmed.includes(lastAiLower.slice(0, 25))) {
        return;
      }
    }

    lastDispatchedTextRef.current = trimmed;
    lastDispatchedTimeRef.current = now;

    setCommandCount((prev) => {
      const next = prev + 1;
      localStorage.setItem('jarvis_cmd_count', next.toString());
      return next;
    });

    isProcessingRef.current = true;
    setIsProcessing(true);
    const timestamp = new Date().toLocaleTimeString();
    setLogs([{ timestamp, type: 'PROMPT', text: trimmed }]);

    chatHistoryRef.current.push({ role: 'user', content: trimmed });

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: chatHistoryRef.current,
          is_authenticated: isAuthenticated
        })
      });

      const data = await response.json();

      if (data.status === 'success' && data.response) {
        addLog('AI', data.response);
        lastAiResponseRef.current = data.response;
        chatHistoryRef.current.push({ role: 'assistant', content: data.response });

        // Biometric Security Gate: If unauthorized/guest attempts critical action, request confirmation
        if (data.action && !isAuthenticated) {
          addLog('SYSTEM', 'Security alert: Guest requested system action. Awaiting Ma\'am\'s confirmation.');
          setPendingConfirmation({
            prompt: trimmed,
            action: data.action
          });
        } else if (data.action) {
          executeActionPayload(data.action);
        }

        // Voice Audio Output
        if (data.audio_url) {
          if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) {}
          }
          clearTimeout(autoClearTimerRef.current);
          setLiveVoiceText('');
          isJarvisSpeakingRef.current = true;
          setIsJarvisSpeaking(true);
          silenceUntilRef.current = Date.now() + 60000;

          if (currentAudioRef.current) {
            try {
              currentAudioRef.current.pause();
              currentAudioRef.current.currentTime = 0;
            } catch (e) {}
          }

          const rawAudioUrl = data.audio_url.startsWith('http') ? data.audio_url : `${API_BASE}${data.audio_url}`;
          const cacheBustUrl = `${rawAudioUrl}${rawAudioUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
          const audio = new Audio(cacheBustUrl);
          currentAudioRef.current = audio;

          const handleTurnEnd = () => {
            isJarvisSpeakingRef.current = false;
            setIsJarvisSpeaking(false);
            silenceUntilRef.current = Date.now() + 1500;

            if (data.action?.type !== 'CLOSE_JARVIS') {
              setTimeout(() => {
                if (isListeningRef.current && !isJarvisSpeakingRef.current && !isRecognitionRunningRef.current) {
                  try {
                    recognitionRef.current?.start();
                    isRecognitionRunningRef.current = true;
                  } catch (e) {}
                }
              }, 1500);
            }

            setTimeout(() => {
              setLogs([]);
            }, 4000);
          };

          audio.onplay = () => {
            isJarvisSpeakingRef.current = true;
            setIsJarvisSpeaking(true);
            silenceUntilRef.current = Date.now() + 60000;
          };
          audio.onended = handleTurnEnd;
          audio.onpause = () => {
            isJarvisSpeakingRef.current = false;
            setIsJarvisSpeaking(false);
            silenceUntilRef.current = Date.now() + 800;
          };
          audio.onerror = handleTurnEnd;

          audio.play().catch(() => {
            handleTurnEnd();
          });
        } else {
          setTimeout(() => {
            setLogs([]);
          }, 4000);
        }
      } else {
        addLog('ERROR', data.error || 'Failed to query Groq LLM');
      }
    } catch (err) {
      addLog('ERROR', 'Backend server unreachable. Make sure the JARVIS server is running.');
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const processUserPromptRef = useRef(null);
  useEffect(() => {
    processUserPromptRef.current = processUserPrompt;
  });

  const hasGreetedRef = useRef(false);

  // Re-entry Welcome Greeting
  useEffect(() => {
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;

    const initSession = async () => {
      try {
        const histRes = await fetch(`${API_BASE}/api/history`);
        const histData = await histRes.json();
        if (histData.status === 'success' && Array.isArray(histData.history)) {
          chatHistoryRef.current = histData.history.map(h => ({ role: h.role, content: h.content }));
        }
      } catch (err) {}

      try {
        const welcomeRes = await fetch(`${API_BASE}/api/welcome`);
        const welcomeData = await welcomeRes.json();
        if (welcomeData.status === 'success' && welcomeData.response) {
          addLog('AI', welcomeData.response);
          lastAiResponseRef.current = welcomeData.response;

          if (welcomeData.audio_url) {
            if (recognitionRef.current) {
              try { recognitionRef.current.abort(); } catch (e) {}
            }
            clearTimeout(autoClearTimerRef.current);
            setLiveVoiceText('');
            isJarvisSpeakingRef.current = true;
            setIsJarvisSpeaking(true);
            silenceUntilRef.current = Date.now() + 60000;

            const rawWelcomeAudio = welcomeData.audio_url.startsWith('http') ? welcomeData.audio_url : `${API_BASE}${welcomeData.audio_url}`;
            const audio = new Audio(`${rawWelcomeAudio}${rawWelcomeAudio.includes('?') ? '&' : '?'}t=${Date.now()}`);
            currentAudioRef.current = audio;
            audio.onplay = () => {
              isJarvisSpeakingRef.current = true;
              setIsJarvisSpeaking(true);
            };
            audio.onended = () => {
              isJarvisSpeakingRef.current = false;
              setIsJarvisSpeaking(false);
              silenceUntilRef.current = Date.now() + 1500;
              setTimeout(() => {
                startListening();
              }, 1500);
              setTimeout(() => {
                setLogs([]);
              }, 3500);
            };
            audio.onerror = () => {
              isJarvisSpeakingRef.current = false;
              setIsJarvisSpeaking(false);
              startListening();
            };
            audio.play().catch(() => {
              isJarvisSpeakingRef.current = false;
              setIsJarvisSpeaking(false);
              startListening();
            });
          }
        }
      } catch (err) {}
    };

    initSession();
  }, []);

  const isListeningRef = useRef(false);
  const isRecognitionRunningRef = useRef(false);

  const startListening = () => {
    if (recognitionRef.current && !isRecognitionRunningRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
        isRecognitionRunningRef.current = true;
      } catch (e) {}
    }
  };

  // Real-time Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addLog('ERROR', 'Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.00001;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
      }
    } catch (e) {}

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      isRecognitionRunningRef.current = true;
    };

    recognition.onresult = (event) => {
      clearTimeout(autoClearTimerRef.current);

      if (isJarvisSpeakingRef.current || isProcessingRef.current || Date.now() < silenceUntilRef.current) {
        setLiveVoiceText('');
        return;
      }

      let phrase = '';
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        phrase += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          isFinal = true;
        }
      }
      const trimmedPhrase = phrase.trim();
      const lowerPhrase = trimmedPhrase.toLowerCase();

      if (
        lowerPhrase.includes('welcome back') ||
        lowerPhrase.includes('systems are online') ||
        (lastAiResponseRef.current && (
          lowerPhrase.includes(lastAiResponseRef.current.toLowerCase().slice(0, 25)) ||
          lastAiResponseRef.current.toLowerCase().includes(lowerPhrase)
        ))
      ) {
        setLiveVoiceText('');
        return;
      }

      if (trimmedPhrase) {
        setLiveVoiceText(trimmedPhrase);

        if (isFinal) {
          clearTimeout(autoClearTimerRef.current);
          if (processUserPromptRef.current) {
            processUserPromptRef.current(trimmedPhrase);
          }
          setTimeout(() => {
            setLiveVoiceText('');
          }, 400);
        } else {
          autoClearTimerRef.current = setTimeout(() => {
            if (trimmedPhrase && processUserPromptRef.current && !isJarvisSpeakingRef.current && Date.now() >= silenceUntilRef.current) {
              processUserPromptRef.current(trimmedPhrase);
              setLiveVoiceText('');
            }
          }, 1100);
        }
      }
    };

    recognition.onerror = (event) => {
      isRecognitionRunningRef.current = false;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isListeningRef.current = false;
        addLog('ERROR', 'Microphone permission blocked. Click anywhere on screen to activate.');
      } else if (event.error === 'no-speech' || event.error === 'aborted') {
        if (isListeningRef.current && !isRecognitionRunningRef.current && !isJarvisSpeakingRef.current && Date.now() >= silenceUntilRef.current) {
          setTimeout(() => {
            if (isListeningRef.current && !isRecognitionRunningRef.current && !isJarvisSpeakingRef.current && Date.now() >= silenceUntilRef.current) {
              try {
                recognition.start();
                isRecognitionRunningRef.current = true;
              } catch (e) {}
            }
          }, 150);
        }
      } else {
        setTimeout(() => {
          if (isListeningRef.current && !isRecognitionRunningRef.current && !isJarvisSpeakingRef.current && Date.now() >= silenceUntilRef.current) {
            try {
              recognition.start();
              isRecognitionRunningRef.current = true;
            } catch (e) {}
          }
        }, 500);
      }
    };

    recognition.onend = () => {
      isRecognitionRunningRef.current = false;
      if (isListeningRef.current && !isJarvisSpeakingRef.current && Date.now() >= silenceUntilRef.current) {
        setTimeout(() => {
          if (isListeningRef.current && !isRecognitionRunningRef.current && !isJarvisSpeakingRef.current && Date.now() >= silenceUntilRef.current) {
            try {
              recognition.start();
              isRecognitionRunningRef.current = true;
            } catch (e) {}
          }
        }, 150);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
    } catch (err) {}

    const rearmRecognition = () => {
      if (isListeningRef.current && !isJarvisSpeakingRef.current && !isRecognitionRunningRef.current && Date.now() >= silenceUntilRef.current) {
        try {
          recognitionRef.current?.start();
          isRecognitionRunningRef.current = true;
        } catch (e) {}
      }
    };

    window.addEventListener('click', rearmRecognition);
    window.addEventListener('focus', rearmRecognition);
    window.addEventListener('blur', rearmRecognition);
    document.addEventListener('visibilitychange', rearmRecognition);

    return () => {
      window.removeEventListener('click', rearmRecognition);
      window.removeEventListener('focus', rearmRecognition);
      window.removeEventListener('blur', rearmRecognition);
      document.removeEventListener('visibilitychange', rearmRecognition);
      if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="App" style={{ overflow: 'hidden', minHeight: '100vh', position: 'relative' }}>
      {/* 1. Animated Tech Background */}
      <AnimatedBackground />

      {/* 2. Iron Man Mark Wireframe Blueprint Background HUD */}
      {hudVisibility.blueprint && (
        <IronManHUD
          blobColor={blobColor}
          isListening={isListening}
          isProcessing={isProcessing}
          isJarvisSpeaking={isJarvisSpeaking}
          powerLevel={systemMetrics?.battery_percent ?? 98}
        />
      )}

      {/* 3. Top S.H.I.E.L.D OS Header Bar */}
      {hudVisibility.topBar && (
        <ShieldTopBar
          blobColor={blobColor}
          agentName={agentName}
          locationName={locationName}
        />
      )}

      {/* 4. Left Bridge Control & Quick Launchers (Chrome, Edge, Instagram, Email, WhatsApp, etc.) */}
      {hudVisibility.bridgeControl && (
        <LeftBridgeControl
          blobColor={blobColor}
          ramPercent={systemMetrics?.ram_percent ?? 54}
          unreadCounts={unreadCounts}
          onClearPlatformBadge={handleClearPlatformBadge}
        />
      )}

      {/* 5. Bottom-Left J.A.R.V.I.S. Core Radar Dial */}
      {hudVisibility.radarDial && (
        <JarvisRadarDial
          blobColor={blobColor}
          isListening={isListening}
          isJarvisSpeaking={isJarvisSpeaking}
        />
      )}

      {/* 6. Bottom-Right Radial HUD & Shortcuts */}
      {hudVisibility.radialHud && (
        <RightRadialHUD
          blobColor={blobColor}
        />
      )}

      {/* 7. Bottom Real-Time Telemetry Bar */}
      {hudVisibility.telemetryBar && (
        <BottomTelemetryBar
          blobColor={blobColor}
          metricsData={systemMetrics}
        />
      )}

      {/* 8. Biometric Face & Voice Recognition HUD Scanner */}
      {hudVisibility.biometrics && (
        <BiometricScanner
          blobColor={blobColor}
          userName={agentName}
          onAuthChange={setIsAuthenticated}
          pendingConfirmation={pendingConfirmation}
          onConfirmAction={handleConfirmPendingAction}
          onCancelAction={handleCancelPendingAction}
        />
      )}

      {/* 9. Top Navigation & Full Adjustability Settings */}
      <Navbar
        sensitivity={sensitivity}
        onSensitivityChange={handleSensitivityChange}
        blobColor={blobColor}
        onColorChange={handleColorChange}
        blobSize={blobSize}
        onSizeChange={handleSizeChange}
        agentName={agentName}
        onAgentNameChange={handleAgentNameChange}
        locationName={locationName}
        onLocationChange={handleLocationChange}
        hudVisibility={hudVisibility}
        onVisibilityToggle={handleVisibilityToggle}
        onResetLayout={handleResetLayout}
        onResetDefaults={handleResetDefaults}
        onClearHistory={handleClearHistory}
        commandCount={commandCount}
      />

      {/* 10. Preserved 3D Voice Assistant Blob (User's Interactive Sphere) */}
      {hudVisibility.blob && (
        <AIAssistantBubble
          sensitivity={sensitivity}
          blobSize={blobSize}
          blobColor={blobColor}
          isUserSpeaking={Boolean(liveVoiceText)}
          isJarvisSpeaking={isJarvisSpeaking}
          isProcessing={isProcessing}
          isListening={isListening}
        />
      )}

      {/* 11. Floating Interactive Terminal Console */}
      {hudVisibility.terminal && (
        <TerminalHUD
          blobColor={blobColor}
          logs={logs}
          isProcessing={isProcessing}
          liveVoiceText={liveVoiceText}
          isListening={isListening}
          isOpen={terminalOpen}
          onToggle={() => setTerminalOpen(!terminalOpen)}
          onStartListening={startListening}
          onSendPrompt={processUserPrompt}
        />
      )}

      {/* 12. Holographic Message & Notification HUD Popup */}
      {hudVisibility.notifications && (
        <MessageNotificationHUD
          notifications={notifications}
          activePopup={activeNotificationPopup}
          blobColor={blobColor}
          onOpenApp={handleOpenNotificationApp}
          onMarkRead={handleMarkNotificationRead}
          onDismissPopup={handleDismissNotificationPopup}
          onSimulateMessage={handleSimulateMessage}
          onClearAll={handleClearAllNotifications}
        />
      )}
    </div>
  );
}

export default App;
