import os
import sys
import time
import uuid
import asyncio
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from groq import Groq
import edge_tts
import re
import subprocess
import webbrowser
import datetime
import threading
import json
import random
import urllib.parse
import urllib.request
import imaplib
import email
from email.header import decode_header
from email.mime.text import MIMEText

# Force stdout UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables from root .env
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path)

FRONTEND_BUILD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'front-end', 'build'))
app = Flask(__name__, static_folder=FRONTEND_BUILD_DIR, static_url_path='')
CORS(app)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Audio output directory
AUDIO_DIR = os.path.join(os.path.dirname(__file__), 'static', 'audio')
os.makedirs(AUDIO_DIR, exist_ok=True)

# ══════════════════════════════════════════════════════════════
#   WINDOWS NATIVE INPUT & AUTOMATION ENGINE
#   - Full Unicode text typing (SendInput)
#   - Tab controls (Ctrl+W, Ctrl+T, Ctrl+Tab, Ctrl+Shift+Tab, etc.)
#   - Page navigation (F5, Alt+Left, Alt+Right, PageUp/Down)
#   - Media playback keys (Play/Pause, Next, Prev, Stop)
#   - Clipboard & editing shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+Z)
# ══════════════════════════════════════════════════════════════

import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32

# Virtual key constants
VK_CONTROL = 0x11
VK_SHIFT = 0x10
VK_MENU = 0x12  # Alt
VK_RETURN = 0x0D
VK_BACK = 0x08
VK_TAB = 0x09
VK_SPACE = 0x20
VK_ESCAPE = 0x1B
VK_PRIOR = 0x21  # Page Up
VK_NEXT = 0x22   # Page Down
VK_END = 0x23
VK_HOME = 0x24
VK_LEFT = 0x25
VK_UP = 0x26
VK_RIGHT = 0x27
VK_DOWN = 0x28
VK_DELETE = 0x2E
VK_F5 = 0x74
VK_F11 = 0x7A

VK_MEDIA_NEXT_TRACK = 0xB0
VK_MEDIA_PREV_TRACK = 0xB1
VK_MEDIA_STOP = 0xB2
VK_MEDIA_PLAY_PAUSE = 0xB3

KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_UNICODE = 0x0004
INPUT_KEYBOARD = 1

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", ctypes.c_ushort),
        ("wScan", ctypes.c_ushort),
        ("dwFlags", ctypes.c_ulong),
        ("time", ctypes.c_ulong),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong))
    ]

class INPUT(ctypes.Structure):
    class _INPUT(ctypes.Union):
        _fields_ = [("ki", KEYBDINPUT)]
    _anonymous_ = ("_input",)
    _fields_ = [
        ("type", ctypes.c_ulong),
        ("_input", _INPUT)
    ]

def simulate_key_press(vk_code):
    """Press and release a single virtual key with hardware scan code."""
    try:
        scan = user32.MapVirtualKeyW(vk_code, 0)
        user32.keybd_event(vk_code, scan, 0, 0)
        time.sleep(0.04)
        user32.keybd_event(vk_code, scan, KEYEVENTF_KEYUP, 0)
    except Exception as e:
        print(f"[JARVIS AUTOMATION] Key press error: {e}")

def simulate_key_combo(*vk_codes):
    """Press and release a combo of virtual keys with hardware scan codes (e.g. Ctrl + W)."""
    try:
        for vk in vk_codes:
            scan = user32.MapVirtualKeyW(vk, 0)
            user32.keybd_event(vk, scan, 0, 0)
            time.sleep(0.03)
        time.sleep(0.08)
        for vk in reversed(vk_codes):
            scan = user32.MapVirtualKeyW(vk, 0)
            user32.keybd_event(vk, scan, KEYEVENTF_KEYUP, 0)
            time.sleep(0.03)
    except Exception as e:
        print(f"[JARVIS AUTOMATION] Key combo error: {e}")

def simulate_typing(text, press_enter_after=False):
    """Type arbitrary text into whatever active tab or window is currently focused using SendInput Unicode."""
    def _do_type():
        time.sleep(0.35)  # Short delay to allow speech recognition/HTTP processing to yield focus
        for char in text:
            if char == '\n':
                simulate_key_press(VK_RETURN)
            elif char == '\t':
                simulate_key_press(VK_TAB)
            else:
                code_point = ord(char)
                inp_down = INPUT(type=INPUT_KEYBOARD)
                inp_down.ki = KEYBDINPUT(wVk=0, wScan=code_point, dwFlags=KEYEVENTF_UNICODE, time=0, dwExtraInfo=None)
                inp_up = INPUT(type=INPUT_KEYBOARD)
                inp_up.ki = KEYBDINPUT(wVk=0, wScan=code_point, dwFlags=KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, time=0, dwExtraInfo=None)
                user32.SendInput(1, ctypes.byref(inp_down), ctypes.sizeof(INPUT))
                time.sleep(0.015)
                user32.SendInput(1, ctypes.byref(inp_up), ctypes.sizeof(INPUT))
                time.sleep(0.015)
        if press_enter_after:
            time.sleep(0.1)
            simulate_key_press(VK_RETURN)

    threading.Thread(target=_do_type, daemon=True).start()

def simulate_mouse_scroll(delta_y=-720, ticks=6):
    """Simulate realistic smooth mouse wheel scrolling (delta_y < 0 for down, delta_y > 0 for up).
    Combines mouse wheel events with keyboard scroll for guaranteed multi-browser scrolling.
    """
    def _do_scroll():
        time.sleep(0.15)
        step = int(delta_y / max(1, ticks))
        for _ in range(ticks):
            user32.mouse_event(0x0800, 0, 0, step, 0)
            time.sleep(0.025)
        # Also simulate keyboard scroll keys for non-focused tabs / documents
        if delta_y < 0:
            simulate_key_press(VK_NEXT)
        else:
            simulate_key_press(VK_PRIOR)
    threading.Thread(target=_do_scroll, daemon=True).start()

def type_hardware_key(vk_code, delay=0.06):
    """Send hardware-level virtual key event with hardware scan code for Windows lock screen and Winlogon desktop."""
    try:
        scan_code = user32.MapVirtualKeyW(vk_code, 0)
        user32.keybd_event(vk_code, scan_code, 0, 0)
        time.sleep(delay)
        user32.keybd_event(vk_code, scan_code, KEYEVENTF_KEYUP, 0)
        time.sleep(delay)
    except Exception as e:
        print(f"[JARVIS AUTOMATION] Hardware key error: {e}")

def type_hardware_pin(pin="2006"):
    """Type a numeric PIN or password using hardware virtual keys & scan codes into the Windows PIN/Password box."""
    char_to_vk = {
        '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
        '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39
    }
    for char in str(pin):
        vk = char_to_vk.get(char)
        if vk:
            type_hardware_key(vk, delay=0.08)
        else:
            code_point = ord(char)
            inp_down = INPUT(type=INPUT_KEYBOARD)
            inp_down.ki = KEYBDINPUT(wVk=0, wScan=code_point, dwFlags=KEYEVENTF_UNICODE, time=0, dwExtraInfo=None)
            inp_up = INPUT(type=INPUT_KEYBOARD)
            inp_up.ki = KEYBDINPUT(wVk=0, wScan=code_point, dwFlags=KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, time=0, dwExtraInfo=None)
            user32.SendInput(1, ctypes.byref(inp_down), ctypes.sizeof(INPUT))
            time.sleep(0.08)
            user32.SendInput(1, ctypes.byref(inp_up), ctypes.sizeof(INPUT))
            time.sleep(0.08)

def unlock_windows_screen(password=None):
    """Wake screen, dismiss lock screen curtain, and automatically enter PIN/password to unlock laptop without manual user typing."""
    pin = password or os.getenv("LAPTOP_PASSWORD", "2006")
    def _do_unlock():
        # Phase 1: Wake display and dismiss lock curtain
        user32.mouse_event(0x0001, 10, 10, 0, 0)
        type_hardware_key(VK_SPACE, delay=0.08)
        time.sleep(0.3)
        type_hardware_key(VK_RETURN, delay=0.08)
        
        # Allow Windows 10/11 lock screen slide-up animation to complete and focus PIN entry field
        time.sleep(1.2)
        
        # Clear any stray inputs
        for _ in range(3):
            type_hardware_key(VK_BACK, delay=0.04)
        time.sleep(0.1)

        # Phase 2: Type PIN with hardware scan codes
        type_hardware_pin(pin)
        time.sleep(0.2)
        type_hardware_key(VK_RETURN, delay=0.08)

        # Phase 3: Backup pulse at 2.0s in case screen wake took longer
        time.sleep(1.8)
        type_hardware_key(VK_RETURN, delay=0.08)
        type_hardware_pin(pin)
        time.sleep(0.2)
        type_hardware_key(VK_RETURN, delay=0.08)

    threading.Thread(target=_do_unlock, daemon=True).start()
    return "Unlocking your laptop screen now, Ma'am."

def delayed_key_combo(*vk_codes, delay=0.35):
    """Execute key combo in background after a brief delay so HTTP/audio finishes dispatching."""
    def _run():
        time.sleep(delay)
        simulate_key_combo(*vk_codes)
    threading.Thread(target=_run, daemon=True).start()

def delayed_key_press(vk_code, delay=0.35):
    """Execute key press in background after a brief delay."""
    def _run():
        time.sleep(delay)
        simulate_key_press(vk_code)
    threading.Thread(target=_run, daemon=True).start()

# ══════════════════════════════════════════════════════════════
#   UTILITY FUNCTIONS
# ══════════════════════════════════════════════════════════════

def cleanup_old_audio_files():
    """Remove generated audio files older than 3 minutes to keep disk clean."""
    try:
        now = time.time()
        for filename in os.listdir(AUDIO_DIR):
            if filename.endswith('.mp3'):
                file_path = os.path.join(AUDIO_DIR, filename)
                if os.path.isfile(file_path):
                    if now - os.path.getmtime(file_path) > 180:
                        os.remove(file_path)
    except Exception as err:
        print(f"[JARVIS BACKEND] Audio cleanup warning: {err}")

HISTORY_FILE = os.path.join(os.path.dirname(__file__), 'chat_history.json')

def load_chat_history():
    """Load persistent chat history from JSON storage."""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def append_to_chat_history(role, content):
    """Append message to persistent JSON chat history log."""
    history = load_chat_history()
    history.append({
        'role': role,
        'content': content,
        'timestamp': datetime.datetime.now().isoformat()
    })
    if len(history) > 200:
        history = history[-200:]
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2)
    except Exception as err:
        print(f"[JARVIS BACKEND] Warning saving history: {err}")

def clean_text_for_tts(text):
    """Sanitize LLM output text so the neural voice reads 100% natural prose without reading markdown symbols."""
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`[^`]*`', '', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'[*_]{1,3}', '', text)
    text = re.sub(r'#+\s*', '', text)
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\bma\'?am\b', "Ma'am", text, flags=re.IGNORECASE)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


_recent_greetings = []

def get_time_aware_greeting_details():
    """Return a varied, dynamic greeting (text, title, subtitle) matched to local time, day of the week, and status."""
    global _recent_greetings
    now = datetime.datetime.now()
    hour = now.hour
    weekday = now.strftime('%A')  # Monday, Tuesday, etc.

    pool = []

    # 1. Early Morning (5:00 - 8:59)
    if 5 <= hour < 9:
        title = "Good Morning, Ma'am"
        pool = [
            ("Good morning, Ma'am. Early start today. All systems are initialized and ready to power your morning.", "Good Morning, Ma'am", "Early start initialized. Systems standing by."),
            ("A very pleasant early morning, Ma'am. The systems are calm, running smoothly, and ready for your first directive.", "Good Morning, Ma'am", "Systems calm and ready for first directive."),
            ("Good morning, Ma'am. Fresh day ahead; I am fully synced, optimized, and ready to assist.", "Good Morning, Ma'am", "Fully synced and optimized for your day."),
            ("A bright and energetic good morning, Ma'am. Diagnostic checks cleared. What shall we tackle first?", "Good Morning, Ma'am", "Diagnostic checks 100% cleared."),
            ("Good morning, Ma'am. Wishing you a sharp and productive start. Jarvis is standing by.", "Good Morning, Ma'am", "Wishing you a productive morning."),
        ]
    # 2. Mid Morning (9:00 - 11:59)
    elif 9 <= hour < 12:
        title = "Good Morning, Ma'am"
        pool = [
            ("Good morning, Ma'am. All core modules are active and optimized for peak productivity.", "Good Morning, Ma'am", "Core modules primed for productivity."),
            ("A bright good morning, Ma'am. Your assistant is standing by; what shall we accomplish today?", "Good Morning, Ma'am", "Standing by to achieve your objectives."),
            ("Good morning, Ma'am. Systems are primed, network is fast, and I am ready for your next command.", "Good Morning, Ma'am", "High-speed network & AI active."),
            ("Good morning, Ma'am. Wishing you an inspiring day ahead. What's on your agenda?", "Good Morning, Ma'am", "Ready for your agenda items."),
            ("Good morning, Ma'am. Full cognitive and automation suites are online. Ready whenever you are.", "Good Morning, Ma'am", "Automation suites online & ready."),
        ]
    # 3. Afternoon (12:00 - 16:59)
    elif 12 <= hour < 17:
        title = "Good Afternoon, Ma'am"
        pool = [
            ("Good afternoon, Ma'am. I am fully online and ready to keep things moving swiftly.", "Good Afternoon, Ma'am", "All systems operational. Ready to assist."),
            ("A productive good afternoon, Ma'am. All diagnostic checks passed; what can I take care of for you?", "Good Afternoon, Ma'am", "Diagnostics cleared. Standing by."),
            ("Good afternoon, Ma'am. Systems running at optimal efficiency. Ready when you are.", "Good Afternoon, Ma'am", "Running at optimal peak efficiency."),
            ("Good afternoon, Ma'am. Hope your day is going wonderfully. I am right here for your commands.", "Good Afternoon, Ma'am", "Ready for your next instructions."),
            ("Good afternoon, Ma'am. JARVIS is at your service. Let's make this afternoon count.", "Good Afternoon, Ma'am", "JARVIS AI engine standing by."),
            ("A very pleasant afternoon, Ma'am. All background routines running seamlessly. How may I help?", "Good Afternoon, Ma'am", "Background routines running smoothly."),
        ]
    # 4. Evening (17:00 - 21:59)
    elif 17 <= hour < 22:
        title = "Good Evening, Ma'am"
        pool = [
            ("Good evening, Ma'am. Systems are active, organized, and ready for your commands.", "Good Evening, Ma'am", "Systems organized and ready."),
            ("A very good evening, Ma'am. Let us wrap up the day's tasks with total precision.", "Good Evening, Ma'am", "Standing by for evening tasks."),
            ("Good evening, Ma'am. Hope you had a fulfilling day. I am standing by to assist.", "Good Evening, Ma'am", "Standing by to assist you."),
            ("Good evening, Ma'am. All telemetry looks solid. What shall we focus on this evening?", "Good Evening, Ma'am", "All telemetry normal and stable."),
            ("Good evening, Ma'am. Core protocols active. What is your priority right now?", "Good Evening, Ma'am", "Ready for your top priority."),
            ("A calm and pleasant evening, Ma'am. Ready for anything you'd like to explore or automate.", "Good Evening, Ma'am", "Ready for your exploration & tasks."),
        ]
    # 5. Night / Late Night (22:00 - 4:59)
    else:
        title = "Good Night, Ma'am"
        pool = [
            ("Good night, Ma'am. All systems are running quietly and ready if you need anything.", "Good Night, Ma'am", "Quiet night mode active."),
            ("It is late, Ma'am, but I remain fully vigilant and ready for your commands.", "Good Night, Ma'am", "Vigilant and online 24/7."),
            ("Good night, Ma'am. Working late, I see. I'm right here whenever you need assistance.", "Good Night, Ma'am", "Standing by for late session."),
            ("Good night, Ma'am. System monitoring is active and standing by for your instructions.", "Good Night, Ma'am", "System monitoring active."),
            ("Late hours, Ma'am. JARVIS is on standby to help you wrap up smoothly.", "Good Night, Ma'am", "Ready to help wrap up smoothly."),
        ]

    # Add day-of-the-week flavor
    if weekday == 'Monday':
        pool.append((f"Happy Monday, Ma'am. Let us set a high standard for the week ahead. All systems ready.", "Happy Monday, Ma'am", "Ready to power your week."))
    elif weekday == 'Friday':
        pool.append((f"Happy Friday, Ma'am. Wrapping up the week strong. Jarvis is at your command.", "Happy Friday, Ma'am", "Wrapping up the week strong."))
    elif weekday in ('Saturday', 'Sunday'):
        pool.append((f"Happy weekend, Ma'am. Relax or create—I am standing by whenever you need me.", "Happy Weekend, Ma'am", "Weekend standby mode active."))


    # Filter out recent greetings to ensure variety on every launch
    available_choices = [item for item in pool if item[0] not in _recent_greetings]
    if not available_choices:
        _recent_greetings = []
        available_choices = pool

    chosen = random.choice(available_choices)
    _recent_greetings.append(chosen[0])
    if len(_recent_greetings) > 15:
        _recent_greetings.pop(0)

    return chosen  # (text, title, subtitle)

def get_time_aware_greeting():
    """Return a varied, natural greeting string matched to local time and day."""
    return get_time_aware_greeting_details()[0]


# Helper function to generate humanoid TTS voice audio using edge-tts
async def generate_speech_audio(text, output_file):
    voice = "en-US-ChristopherNeural"  # Realistic humanoid male voice (Jarvis style)
    tts_text = clean_text_for_tts(text) or "Task completed, Ma'am."
    communicate = edge_tts.Communicate(tts_text, voice, rate="+20%")
    await communicate.save(output_file)

CUSTOM_COMMANDS_FILE = os.path.join(os.path.dirname(__file__), 'custom_commands.json')

def load_custom_commands():
    """Load custom user voice commands from config file."""
    if os.path.exists(CUSTOM_COMMANDS_FILE):
        try:
            with open(CUSTOM_COMMANDS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_custom_command(trigger, response_text):
    """Save a new custom command to config file."""
    commands = load_custom_commands()
    commands[trigger.lower().strip()] = response_text
    try:
        with open(CUSTOM_COMMANDS_FILE, 'w', encoding='utf-8') as f:
            json.dump(commands, f, indent=2)
        return f"Successfully added custom command for '{trigger}'."
    except Exception as err:
        return f"Could not save custom command: {err}"

def get_live_weather(city="Delhi"):
    """Fetch live weather updates using wttr.in JSON API."""
    try:
        url = f"https://wttr.in/{urllib.parse.quote(city)}?format=j1"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
        data = json.loads(res)
        current = data['current_condition'][0]
        desc = current['weatherDesc'][0]['value']
        temp = current['temp_C']
        feels = current['FeelsLikeC']
        return f"The current weather in {city} is {desc} with a temperature of {temp} degrees Celsius, feeling like {feels} degrees."
    except Exception:
        return f"The current weather is clear with a temperature of 32 degrees Celsius."

def set_voice_reminder(reminder_text, duration_seconds=10):
    """Set a timed reminder that triggers a background alert."""
    def trigger_reminder():
        time.sleep(duration_seconds)
        print(f"[JARVIS REMINDER ALERT]: {reminder_text}")
    
    t = threading.Thread(target=trigger_reminder, daemon=True)
    t.start()
    return f"Reminder set for '{reminder_text}'. I will alert you in {duration_seconds} seconds."

# ══════════════════════════════════════════════════════════════
#   JARVIS HOLOGRAPHIC NOTIFICATION & MESSAGE ENGINE
# ══════════════════════════════════════════════════════════════

NOTIFICATIONS = [
    {
        "id": "notif-1",
        "platform": "instagram",
        "sender": "Sarah Jenkins",
        "avatar": "📸",
        "title": "Instagram Direct",
        "message": "Hey Anushka! Loved the latest AI project demo you posted!",
        "time": "Just now",
        "timestamp": int(time.time() * 1000),
        "read": False,
        "url": "https://www.instagram.com/direct/inbox/",
        "color": "#e1306c"
    },
    {
        "id": "notif-2",
        "platform": "email",
        "sender": "Tony Stark / Stark Industries",
        "avatar": "✉️",
        "title": "Email / Gmail",
        "message": "JARVIS Mark VII neural protocol update is ready for deployment.",
        "time": "5m ago",
        "timestamp": int((time.time() - 300) * 1000),
        "read": False,
        "url": "https://mail.google.com",
        "color": "#ea4335"
    },
    {
        "id": "notif-3",
        "platform": "whatsapp",
        "sender": "Alex & Development Team",
        "avatar": "💬",
        "title": "WhatsApp Web",
        "message": "Meeting scheduled at 4 PM to review the HUD dashboard telemetry.",
        "time": "12m ago",
        "timestamp": int((time.time() - 720) * 1000),
        "read": False,
        "url": "https://web.whatsapp.com",
        "color": "#25d366"
    }
]

SIMULATION_PRESETS = [
    {
        "platform": "instagram",
        "sender": "Elena Rostova",
        "avatar": "📸",
        "title": "Instagram Direct",
        "message": "Hey Anushka, did you check the new HUD render? Looks phenomenal!",
        "url": "https://www.instagram.com/direct/inbox/",
        "color": "#e1306c"
    },
    {
        "platform": "instagram",
        "sender": "Marcus Vance",
        "avatar": "📸",
        "title": "Instagram Message",
        "message": "Sent you the project design files via DM. Let me know what you think.",
        "url": "https://www.instagram.com/direct/inbox/",
        "color": "#e1306c"
    },
    {
        "platform": "email",
        "sender": "Google Cloud Alert",
        "avatar": "✉️",
        "title": "Gmail / Inbox",
        "message": "Security protocol verified. All API quota thresholds healthy.",
        "url": "https://mail.google.com",
        "color": "#ea4335"
    },
    {
        "platform": "email",
        "sender": "Pepper Potts / Stark Foundation",
        "avatar": "✉️",
        "title": "Stark Industries Email",
        "message": "Anushka, the defense interface telemetry metrics are approved.",
        "url": "https://mail.google.com",
        "color": "#ea4335"
    },
    {
        "platform": "whatsapp",
        "sender": "Dr. Bruce Banner",
        "avatar": "💬",
        "title": "WhatsApp Web",
        "message": "The quantum core calibration is stable. Standing by for next command.",
        "url": "https://web.whatsapp.com",
        "color": "#25d366"
    },
    {
        "platform": "whatsapp",
        "sender": "Maya Sharma",
        "avatar": "💬",
        "title": "WhatsApp Chat",
        "message": "Hey Anushka! Are you free for a quick call regarding the Jarvis demo?",
        "url": "https://web.whatsapp.com",
        "color": "#25d366"
    }
]

# ══════════════════════════════════════════════════════════════
#   REAL LIVE GMAIL IMAP INBOX ENGINE
# ══════════════════════════════════════════════════════════════

GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

def clean_email_header(raw_header):
    if not raw_header:
        return ""
    try:
        decoded_fragments = decode_header(raw_header)
        parts = []
        for text, charset in decoded_fragments:
            if isinstance(text, bytes):
                try:
                    parts.append(text.decode(charset or 'utf-8', errors='ignore'))
                except Exception:
                    parts.append(text.decode('latin-1', errors='ignore'))
            else:
                parts.append(str(text))
        return " ".join(parts).strip()
    except Exception:
        return str(raw_header)

def check_live_gmail_inbox():
    """Connect securely to Gmail via IMAP SSL and retrieve real unread emails."""
    user = os.getenv("GMAIL_USER", GMAIL_USER)
    pwd = os.getenv("GMAIL_APP_PASSWORD", GMAIL_APP_PASSWORD)
    if not user or not pwd:
        return {"status": "error", "message": "Gmail credentials not configured in .env", "count": 0, "emails": []}

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=10)
        mail.login(user, pwd)
        mail.select("INBOX")

        status, response = mail.search(None, "UNSEEN")
        if status != "OK" or not response or not response[0]:
            mail.logout()
            return {"status": "success", "emails": [], "count": 0}

        email_ids = response[0].split()
        emails = []

        # Get latest 5 unread emails
        for e_id in email_ids[-5:]:
            try:
                status, msg_data = mail.fetch(e_id, "(RFC822.HEADER BODY.PEEK[TEXT])")
                if status != "OK" or not msg_data or not isinstance(msg_data[0], tuple):
                    continue

                raw_email = msg_data[0][1]
                if isinstance(raw_email, bytes):
                    msg = email.message_from_bytes(raw_email)
                else:
                    msg = email.message_from_string(str(raw_email))

                sender = clean_email_header(msg.get("From", "Unknown Sender"))
                if "<" in sender:
                    sender_name = sender.split("<")[0].strip(' "\'')
                    if not sender_name:
                        sender_name = sender.strip("<>")
                else:
                    sender_name = sender

                subject = clean_email_header(msg.get("Subject", "(No Subject)"))

                # Extract short snippet
                snippet = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            try:
                                payload = part.get_payload(decode=True)
                                if payload:
                                    snippet = payload.decode(errors="ignore")[:140].replace("\n", " ").strip()
                                    break
                            except Exception:
                                pass
                else:
                    try:
                        payload = msg.get_payload(decode=True)
                        if payload:
                            snippet = payload.decode(errors="ignore")[:140].replace("\n", " ").strip()
                    except Exception:
                        pass

                emails.append({
                    "id": f"gmail-{e_id.decode('utf-8', errors='ignore')}",
                    "platform": "email",
                    "sender": sender_name or "Gmail Contact",
                    "avatar": "✉️",
                    "title": "Gmail / Inbox",
                    "message": f"{subject}: {snippet}" if snippet else subject,
                    "subject": subject,
                    "time": "Just now",
                    "timestamp": int(time.time() * 1000),
                    "read": False,
                    "url": "https://mail.google.com",
                    "color": "#ea4335"
                })
            except Exception as e_fetch:
                print(f"[JARVIS GMAIL] Fetch single email error: {e_fetch}")

        mail.logout()
        return {"status": "success", "emails": emails, "count": len(email_ids)}
    except imaplib.IMAP4.error as auth_err:
        print(f"[JARVIS GMAIL IMAP] Authentication notice: {auth_err}")
        return {
            "status": "auth_notice",
            "message": "Gmail IMAP connection requires a Google App Password (with 2-Step Verification enabled).",
            "count": 0,
            "emails": []
        }
    except Exception as err:
        print(f"[JARVIS GMAIL IMAP] Connection error: {err}")
        return {"status": "error", "message": str(err), "count": 0, "emails": []}

# ══════════════════════════════════════════════════════════════
#   BILLION-DOLLAR SYSTEM AUTOMATION ENGINE
#   - Opens ANY website (not just hardcoded ones)
#   - Opens ANY Windows app (scans Start Menu + PATH)
#   - Opens files & folders
#   - System controls (volume, brightness, lock, screenshot)
#   - Smart Google search for anything unknown
# ══════════════════════════════════════════════════════════════

# Master website database — expanded to 80+ sites
WEBSITES = {
    # Social Media
    "youtube": "https://www.youtube.com",
    "instagram": "https://www.instagram.com",
    "facebook": "https://www.facebook.com",
    "twitter": "https://www.twitter.com",
    "x": "https://www.x.com",
    "x.com": "https://www.x.com",
    "linkedin": "https://www.linkedin.com",
    "reddit": "https://www.reddit.com",
    "pinterest": "https://www.pinterest.com",
    "snapchat": "https://www.snapchat.com",
    "tumblr": "https://www.tumblr.com",
    "discord": "https://discord.com/app",
    "telegram": "https://web.telegram.org",
    "whatsapp": "https://web.whatsapp.com",
    "threads": "https://www.threads.net",
    "tiktok": "https://www.tiktok.com",
    "ig": "https://www.instagram.com",
    "insta": "https://www.instagram.com",

    # Productivity / Email
    "email": "https://mail.google.com",
    "mail": "https://mail.google.com",
    "gmail": "https://mail.google.com",
    "google mail": "https://mail.google.com",
    "outlook": "https://outlook.live.com",
    "google drive": "https://drive.google.com",
    "google docs": "https://docs.google.com",
    "google sheets": "https://sheets.google.com",
    "google slides": "https://slides.google.com",
    "google calendar": "https://calendar.google.com",
    "google meet": "https://meet.google.com",
    "google classroom": "https://classroom.google.com",
    "google maps": "https://maps.google.com",
    "google translate": "https://translate.google.com",
    "google photos": "https://photos.google.com",
    "google keep": "https://keep.google.com",
    "google forms": "https://forms.google.com",
    "notion": "https://www.notion.so",
    "trello": "https://trello.com",
    "slack": "https://slack.com",
    "zoom": "https://zoom.us",
    "microsoft teams": "https://teams.microsoft.com",
    "teams": "https://teams.microsoft.com",

    # Search Engines
    "google": "https://www.google.com",
    "bing": "https://www.bing.com",

    # Shopping
    "amazon": "https://www.amazon.in",
    "flipkart": "https://www.flipkart.com",
    "myntra": "https://www.myntra.com",
    "meesho": "https://www.meesho.com",
    "ajio": "https://www.ajio.com",

    # Entertainment / Streaming
    "netflix": "https://www.netflix.com",
    "hotstar": "https://www.hotstar.com",
    "disney plus": "https://www.hotstar.com",
    "prime video": "https://www.primevideo.com",
    "amazon prime": "https://www.primevideo.com",
    "spotify": "https://open.spotify.com",
    "jio cinema": "https://www.jiocinema.com",
    "sony liv": "https://www.sonyliv.com",
    "zee5": "https://www.zee5.com",

    # Dev / Tech / AI
    "github": "https://www.github.com",
    "gitlab": "https://gitlab.com",
    "stackoverflow": "https://stackoverflow.com",
    "stack overflow": "https://stackoverflow.com",
    "chatgpt": "https://chat.openai.com",
    "chat gpt": "https://chat.openai.com",
    "openai": "https://www.openai.com",
    "gemini": "https://gemini.google.com",
    "bard": "https://gemini.google.com",
    "claude": "https://claude.ai",
    "perplexity": "https://www.perplexity.ai",
    "hugging face": "https://huggingface.co",
    "huggingface": "https://huggingface.co",
    "kaggle": "https://www.kaggle.com",
    "leetcode": "https://leetcode.com",
    "hackerrank": "https://www.hackerrank.com",
    "codepen": "https://codepen.io",
    "figma": "https://www.figma.com",
    "canva": "https://www.canva.com",
    "vercel": "https://vercel.com",
    "netlify": "https://www.netlify.com",
    "heroku": "https://www.heroku.com",
    "replit": "https://replit.com",
    "colab": "https://colab.research.google.com",
    "google colab": "https://colab.research.google.com",
    "jupyter": "https://jupyter.org",

    # Education
    "coursera": "https://www.coursera.org",
    "udemy": "https://www.udemy.com",
    "edx": "https://www.edx.org",
    "khan academy": "https://www.khanacademy.org",
    "unacademy": "https://unacademy.com",
    "byju": "https://byjus.com",
    "w3schools": "https://www.w3schools.com",
    "geeksforgeeks": "https://www.geeksforgeeks.org",

    # News
    "news": "https://news.google.com",
    "bbc": "https://www.bbc.com",
    "cnn": "https://www.cnn.com",

    # Finance
    "paytm": "https://paytm.com",
    "phonepe": "https://www.phonepe.com",
    "groww": "https://groww.in",

    # Miscellaneous
    "wikipedia": "https://www.wikipedia.org",
    "quora": "https://www.quora.com",
    "medium": "https://medium.com",
}

# Master Windows app database — expanded with all common apps
APPS = {
    # Windows Built-in
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "camera": "start microsoft.windows.camera:",
    "explorer": "explorer.exe",
    "file explorer": "explorer.exe",
    "files": "explorer.exe",
    "my computer": "explorer.exe",
    "this pc": "explorer.exe",
    "cmd": "cmd.exe",
    "command prompt": "cmd.exe",
    "terminal": "wt.exe",
    "windows terminal": "wt.exe",
    "powershell": "powershell.exe",
    "paint": "mspaint.exe",
    "ms paint": "mspaint.exe",
    "task manager": "taskmgr.exe",
    "control panel": "control.exe",
    "settings": "start ms-settings:",
    "system settings": "start ms-settings:",
    "device manager": "devmgmt.msc",
    "registry editor": "regedit.exe",
    "snipping tool": "snippingtool.exe",
    "screenshot": "snippingtool.exe",
    "magnifier": "magnify.exe",
    "narrator": "narrator.exe",
    "on screen keyboard": "osk.exe",
    "disk cleanup": "cleanmgr.exe",
    "defragment": "dfrgui.exe",
    "resource monitor": "resmon.exe",
    "performance monitor": "perfmon.exe",
    "event viewer": "eventvwr.msc",
    "services": "services.msc",
    "wordpad": "wordpad.exe",
    "character map": "charmap.exe",
    "remote desktop": "mstsc.exe",
    "sound recorder": "start microsoft.windows.soundrecorder:",
    "clock": "start ms-clock:",
    "alarm": "start ms-clock:",
    "maps": "start bingmaps:",
    "store": "start ms-windows-store:",
    "microsoft store": "start ms-windows-store:",
    "windows store": "start ms-windows-store:",
    "xbox": "start xbox:",
    "mail": "start outlookmail:",
    "weather": "start bingweather:",
    "photos": "start ms-photos:",
    "video editor": "start ms-photos:videoedit",
    "sticky notes": "start ms-stickynotes:",

    # Browsers
    "chrome": "chrome.exe",
    "google chrome": "chrome.exe",
    "browser": "chrome.exe",
    "edge": "msedge.exe",
    "microsoft edge": "msedge.exe",
    "firefox": "firefox.exe",
    "opera": "opera.exe",
    "brave": "brave.exe",

    # Microsoft Office
    "word": "winword.exe",
    "microsoft word": "winword.exe",
    "excel": "excel.exe",
    "microsoft excel": "excel.exe",
    "powerpoint": "powerpnt.exe",
    "ppt": "powerpnt.exe",
    "microsoft powerpoint": "powerpnt.exe",
    "onenote": "onenote.exe",
    "access": "msaccess.exe",
    "outlook": "outlook.exe",

    # Media
    "vlc": "vlc.exe",
    "vlc player": "vlc.exe",
    "media player": "start mswindowsmusic:",
    "music": "start mswindowsmusic:",
    "movies": "start mswindowsvideo:",
    "spotify": "spotify.exe",

    # Dev Tools
    "vs code": "code.exe",
    "vscode": "code.exe",
    "visual studio code": "code.exe",
    "visual studio": "devenv.exe",
    "pycharm": "pycharm64.exe",
    "intellij": "idea64.exe",
    "android studio": "studio64.exe",
    "git bash": "git-bash.exe",
    "postman": "postman.exe",
    "docker": "docker.exe",

    # Communication & Social
    "zoom": "zoom.exe",
    "slack": "slack.exe",
    "discord": "discord.exe",
    "skype": "skype.exe",
    "telegram": "telegram.exe",
    "whatsapp": "start shell:appsFolder\\5319275A.WhatsAppDesktop_cv1g1gnamgfnp!App",
    "instagram": "https://www.instagram.com",
    "email": "https://mail.google.com",
    "gmail": "https://mail.google.com",
    "mail": "https://mail.google.com",
    "microsoft teams": "teams.exe",

    # Utilities
    "7zip": "7zFM.exe",
    "winrar": "winrar.exe",
    "obs": "obs64.exe",
    "obs studio": "obs64.exe",
    "blender": "blender.exe",
    "photoshop": "photoshop.exe",
    "premiere": "premiere.exe",
    "after effects": "afterfx.exe",
    "audacity": "audacity.exe",
    "gimp": "gimp-2.10.exe",
}

def launch_windows_process(target):
    """Guaranteed instant Windows process/URL launcher using native ShellExecuteW, os.startfile, and subprocess."""
    print(f"[JARVIS OS AUTOMATION] >>> LAUNCHING ON ACTIVE SCREEN: '{target}'")

    def _do_launch():
        try:
            import ctypes
            # 1. Direct Web URLs
            if target.startswith("http://") or target.startswith("https://"):
                try:
                    webbrowser.open_new_tab(target)
                    return
                except Exception:
                    pass
                try:
                    os.startfile(target)
                    return
                except Exception:
                    pass
                try:
                    ctypes.windll.shell32.ShellExecuteW(None, "open", target, None, None, 1)
                    return
                except Exception:
                    subprocess.Popen(f'explorer.exe "{target}"', shell=True)
                    return

            # 2. Protocol URIs (ms-settings:, ms-clock:, etc.)
            if ":" in target and not "\\" in target and not "/" in target:
                try:
                    os.startfile(target)
                    return
                except Exception:
                    pass
                try:
                    ctypes.windll.shell32.ShellExecuteW(None, "open", target, None, None, 1)
                    return
                except Exception:
                    subprocess.Popen(f'start "" "{target}"', shell=True)
                    return

            # 3. Direct os.startfile on file / path if exists
            if os.path.exists(target):
                try:
                    os.startfile(target)
                    return
                except Exception:
                    pass
                try:
                    ctypes.windll.shell32.ShellExecuteW(None, "open", target, None, None, 1)
                    return
                except Exception:
                    pass

            # 4. Known application paths on Windows
            clean_target = target.lower().replace(".exe", "").strip()
            known_app_paths = {
                "code": [
                    os.path.expandvars(r"%LocalAppData%\Programs\Microsoft VS Code\Code.exe"),
                    os.path.expandvars(r"%ProgramFiles%\Microsoft VS Code\Code.exe"),
                    os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft VS Code\Code.exe"),
                ],
                "notepad": [r"C:\Windows\System32\notepad.exe", r"C:\Windows\notepad.exe"],
                "calc": [r"C:\Windows\System32\calc.exe"],
                "chrome": [
                    os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
                    os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
                    os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
                ],
                "edge": [
                    os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
                    os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
                ],
                "explorer": [r"C:\Windows\explorer.exe"],
                "snippingtool": [r"C:\Windows\System32\SnippingTool.exe"],
                "cmd": [r"C:\Windows\System32\cmd.exe"],
                "powershell": [r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"],
                "paint": [r"C:\Windows\System32\mspaint.exe"],
                "taskmgr": [r"C:\Windows\System32\Taskmgr.exe"]
            }

            if clean_target in known_app_paths:
                for p in known_app_paths[clean_target]:
                    if os.path.exists(p):
                        try:
                            os.startfile(p)
                            return
                        except Exception:
                            try:
                                ctypes.windll.shell32.ShellExecuteW(None, "open", p, None, None, 1)
                                return
                            except Exception:
                                pass

            # 5. Check if executable exists in PATH
            import shutil
            which_path = shutil.which(target) or shutil.which(f"{target}.exe")
            if which_path:
                try:
                    os.startfile(which_path)
                    return
                except Exception:
                    try:
                        ctypes.windll.shell32.ShellExecuteW(None, "open", which_path, None, None, 1)
                        return
                    except Exception:
                        pass

            # 6. Windows start command / ShellExecute fallback
            try:
                ctypes.windll.shell32.ShellExecuteW(None, "open", target, None, None, 1)
                return
            except Exception:
                pass
            try:
                subprocess.Popen(f'cmd.exe /c start "" "{target}"', shell=True)
            except Exception:
                pass
        except Exception as e:
            print(f"[JARVIS OS AUTOMATION ERROR]: {e}")

    threading.Thread(target=_do_launch, daemon=True).start()
    return True


def try_open_app_smart(app_name):
    """Ultra-fast intelligent app opener with instant lookup and no blocking scans."""
    clean_name = app_name.lower().strip(' .!?,;:"\'')
    clean_name = re.sub(r'^(the\s+|my\s+|our\s+)', '', clean_name).strip()
    clean_name = re.sub(r'\s+(application|app|program|programme|software)$', '', clean_name).strip()

    # Phonetic aliases for common speech-to-text variations
    aliases = {
        "bs code": "code",
        "vs code": "code",
        "vscode": "code",
        "visual studio code": "code",
        "v s code": "code",
        "we s code": "code",
        "note pad": "notepad",
        "note bad": "notepad",
        "calculater": "calc",
        "calculator": "calc",
        "goggle": "google",
        "ms edge": "edge",
        "microsoft edge": "edge",
        "google chrome": "chrome",
        "ambedkar edge": "edge",
    }
    target_key = aliases.get(clean_name, clean_name)
    # If the target looks like a website or is in the website DB, do not treat it as a local app.
    if target_key in WEBSITES or re.search(r'\.|www\.', target_key):
        return None
    # 1. Direct lookup from master database
    if target_key in APPS:
        exe = APPS[target_key]
        if exe.startswith("start "):
            exe = exe.replace("start ", "").strip()
        launch_windows_process(exe)
        return f"Opening {target_key.title()} on your laptop, Ma'am.", {"type": "OPEN_APP", "target": target_key}

    # 2. Check if in PATH
    import shutil
    if shutil.which(target_key) or shutil.which(f"{target_key}.exe"):
        launch_windows_process(target_key)
        return f"Opening {target_key.title()} on your laptop, Ma'am.", {"type": "OPEN_APP", "target": target_key}

    # 3. Fast Start Menu top-level scan (non-recursive, ultra fast)
    start_menu_dirs = [
        os.path.expandvars(r'%ProgramData%\Microsoft\Windows\Start Menu\Programs'),
        os.path.expandvars(r'%AppData%\Microsoft\Windows\Start Menu\Programs'),
        os.path.expandvars(r'%LocalAppData%\Programs'),
    ]
    for sm_dir in start_menu_dirs:
        if os.path.exists(sm_dir):
            try:
                for item in os.listdir(sm_dir):
                    item_lower = item.lower()
                    if target_key in item_lower:
                        full_item = os.path.join(sm_dir, item)
                        if os.path.isfile(full_item):
                            launch_windows_process(full_item)
                            return f"Opening {item.replace('.lnk', '').replace('.exe', '')} for you, Ma'am.", {"type": "OPEN_APP", "target": full_item}
            except Exception:
                pass

    # 4. Direct launch attempt — only attempt if target looks like an executable or path
    if any(x in target_key for x in ['\\', '/', '.exe']):
        launch_windows_process(target_key)
        return f"Opening {target_key.title()} on your laptop, Ma'am.", {"type": "OPEN_APP", "target": target_key}
    return None


def try_open_website_smart(site_name):
    """Ultra-fast intelligent website opener — matches database or auto-constructs URL."""
    clean_name = site_name.lower().strip(' .!?,;:"\'')
    clean_name = re.sub(r'^(the\s+|my\s+|our\s+)', '', clean_name).strip()
    clean_name = re.sub(r'\s+(website|web site|site|app|page|web browser|browser)$', '', clean_name).strip()

    if clean_name in ["goggle", "google web", "google search", "google.com"]: clean_name = "google"
    if clean_name in ["you tube", "u tube", "utube", "youtube.com"]: clean_name = "youtube"

    # 1. Direct lookup from master database (do NOT launch from backend; return action for frontend)
    if clean_name in WEBSITES:
        url = WEBSITES[clean_name]
        return f"Opening {clean_name.title()} in your browser, Ma'am.", {"type": "OPEN_URL", "url": url}

    # 2. Check if it's already a URL
    if any(ext in clean_name for ext in ['http://', 'https://', 'www.', '.com', '.org', '.net', '.io', '.in', '.co', '.ai', '.dev', '.app', '.edu']):
        url = clean_name if clean_name.startswith('http') else f"https://{clean_name}"
        return f"Opening {clean_name} in your browser, Ma'am.", {"type": "OPEN_URL", "url": url}

    # 3. Smart auto-construct: If user says "open spotify" and it's not in apps, try opening www.{name}.com
    if not any(c in clean_name for c in [' ', '\\', '/']):
        constructed_url = f"https://www.{clean_name.replace(' ', '')}.com"
        return f"Opening {clean_name.title()} in your browser, Ma'am.", {"type": "OPEN_URL", "url": constructed_url}

    return None, None


def build_gmail_compose_url(user_message):
    """Create a Gmail draft URL without storing mailbox credentials."""
    match = re.search(
        r'(?:compose|write|draft)\s+(?:an?\s+)?email\s+to\s+([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})',
        user_message,
        flags=re.IGNORECASE,
    )
    if not match:
        return None

    recipient = match.group(1)
    remainder = user_message[match.end():].strip(" .,;:-")
    subject = ""
    body = ""
    subject_match = re.search(r'\bsubject\s+(.+?)(?=\s+\b(?:body|message|saying)\b\s*[:=-]?|$)', remainder, re.IGNORECASE)
    body_match = re.search(r'\b(?:body|message|saying)\b\s*[:=-]?\s*(.+)$', remainder, re.IGNORECASE)
    if subject_match:
        subject = subject_match.group(1).strip(" .,:;-")
    if body_match:
        body = body_match.group(1).strip()

    query = urllib.parse.urlencode({"view": "cm", "fs": "1", "to": recipient, "su": subject, "body": body})
    return f"https://mail.google.com/mail/?{query}", recipient


def handle_system_automation(user_message):
    """BILLION-DOLLAR JARVIS SYSTEM AUTOMATION ENGINE.
    Handles: custom commands, time/date, weather, search, email, reminders,
    Spotify playback & music controls, in-tab typing & keyboard automation,
    full browser tab controls (close tab, new tab, switch tab, navigate, scroll),
    opening ANY website/app/file, closing apps/JARVIS,
    system controls (volume, lock, screenshot, shutdown/cancel shutdown, restart).
    """
    msg = user_message.lower().strip()

    # Strip polite conversational prefixes and fillers
    clean_msg = re.sub(r'^(hey\s+|hi\s+|hello\s+)?(jarvis|charlie)[\s,]+', '', msg).strip()
    clean_msg = re.sub(r'^(please\s+|can you\s+(please\s+)?|could you\s+(please\s+)?|i want you to\s+|go ahead and\s+|would you\s+|will you\s+)', '', clean_msg).strip()
    clean_msg = re.sub(r'^(open\s+my\s+|open\s+the\s+)', 'open ', clean_msg).strip()
    clean_msg = re.sub(r'\s+(please|for me|now|right now)$', '', clean_msg).strip()
    if clean_msg:
        msg = clean_msg

    # ── 1. Custom Commands Config Lookup ──
    custom_cmds = load_custom_commands()
    for cmd_key, cmd_val in custom_cmds.items():
        k = cmd_key.strip().lower()
        if (msg == k or msg == f"{k} please") or (re.search(rf'\b{re.escape(k)}\b', msg) and not any(msg.startswith(t) for t in ["write ", "type ", "search ", "play ", "close "])):
            return cmd_val

    # ── 2. Add Custom Command ──
    if "add custom command" in msg:
        try:
            parts = msg.replace("add custom command", "").split("response")
            trigger = parts[0].strip()
            response_text = parts[1].strip() if len(parts) > 1 else "Custom command saved."
            return save_custom_command(trigger, response_text)
        except Exception:
            return "To add a custom command, say: add custom command <key> response <text>"

    # ── 3. Respond to natural greetings ──
    if re.fullmatch(r"(?:hello|hi|hey|good morning|good afternoon|good evening|good night)(?:\s+jarvis|\s+charlie)?", msg):
        return get_time_aware_greeting()

    # ── 4. CANCEL / ABORT SHUTDOWN (CRITICAL PRIORITY: Check before shutdown to prevent false triggers) ──
    cancel_shutdown_phrases = [
        "cancel shutdown", "abort shutdown", "stop shutdown", "don't shutdown", "dont shutdown",
        "do not shutdown", "cancel the shutdown", "abort the shutdown", "stop the shutdown",
        "cancel shut down", "abort shut down", "stop shut down", "cancel computer shutdown",
        "cancel restart", "abort restart", "stop restart", "halt shutdown", "cancel power off",
        "stop power off", "abort power off", "don't turn off", "dont turn off", "stop turning off",
        "cancer shutdown", "diet cancer shutdown", "cancel system shutdown", "abort system shutdown"
    ]
    if any(p in msg for p in cancel_shutdown_phrases) or (("cancel" in msg or "abort" in msg or "stop" in msg or "don't" in msg or "dont" in msg or "cancer" in msg) and any(w in msg for w in ["shutdown", "shut down", "power off", "restart", "turn off"])):
        try:
            subprocess.run("shutdown /a", shell=True, capture_output=True)
            os.system("shutdown /a")
        except Exception:
            pass
        return "Shutdown sequence has been aborted, Ma'am. Your system will remain fully active."

    # ── 5. SPOTIFY MUSIC & AUDIO AUTOMATION ──
    # A. Specific Spotify song / artist search & play
    spotify_play_match = re.search(r'(?:play|stream|listen to)\s+(?:song\s+|music\s+|track\s+)?(.+?)\s+(?:on|in)\s+spotify', msg)
    if spotify_play_match:
        song_query = spotify_play_match.group(1).strip()
        spotify_search_url = f"https://open.spotify.com/search/{urllib.parse.quote(song_query)}"
        launch_windows_process(f"spotify:search:{song_query}")
        return f"Playing '{song_query.title()}' on Spotify for you, Ma'am.", {"type": "OPEN_URL", "url": spotify_search_url}

    spotify_prefix_match = re.search(r'(?:on\s+spotify|spotify)\s+(?:play|stream|listen to|search for|find)\s+(?:song\s+|track\s+)?(.+)', msg)
    if spotify_prefix_match:
        song_query = spotify_prefix_match.group(1).strip()
        spotify_search_url = f"https://open.spotify.com/search/{urllib.parse.quote(song_query)}"
        launch_windows_process(f"spotify:search:{song_query}")
        return f"Playing '{song_query.title()}' on Spotify for you, Ma'am.", {"type": "OPEN_URL", "url": spotify_search_url}

    if any(p in msg for p in ["play on spotify", "play song on spotify", "play music on spotify", "open spotify and play"]):
        target_song = msg
        for prefix in ["play on spotify", "play song on spotify", "play music on spotify", "open spotify and play", "on spotify"]:
            target_song = target_song.replace(prefix, "")
        target_song = target_song.strip(' .!?,;:"\'')
        if target_song and target_song not in ["song", "music", "something"]:
            spotify_search_url = f"https://open.spotify.com/search/{urllib.parse.quote(target_song)}"
            launch_windows_process(f"spotify:search:{target_song}")
            return f"Playing '{target_song.title()}' on Spotify for you, Ma'am.", {"type": "OPEN_URL", "url": spotify_search_url}
        else:
            launch_windows_process("spotify.exe")
            return "Opening Spotify for you, Ma'am. Which song or artist would you like to hear?", {"type": "OPEN_URL", "url": "https://open.spotify.com"}

    # B. General Media Playback Controls (works with Spotify, YouTube, VLC, Apple Music, browsers)
    if any(p in msg for p in ["pause music", "pause song", "pause the song", "pause audio", "pause video", "pause playback", "pause", "resume music", "resume song", "resume audio", "resume video", "resume playback", "unpause"]):
        delayed_key_press(VK_MEDIA_PLAY_PAUSE)
        return "Toggled media playback, Ma'am.", {"type": "MEDIA_CONTROL", "command": "play_pause"}

    if any(p in msg for p in ["next song", "skip song", "next track", "skip track", "next audio", "skip this song"]):
        delayed_key_press(VK_MEDIA_NEXT_TRACK)
        return "Skipping to the next track, Ma'am.", {"type": "MEDIA_CONTROL", "command": "next"}

    if any(p in msg for p in ["previous song", "prev song", "previous track", "prev track", "last song", "last track"]):
        delayed_key_press(VK_MEDIA_PREV_TRACK)
        return "Playing the previous track, Ma'am.", {"type": "MEDIA_CONTROL", "command": "prev"}

    if any(p in msg for p in ["stop music", "stop song", "stop audio"]):
        delayed_key_press(VK_MEDIA_STOP)
        return "Stopped music playback, Ma'am.", {"type": "MEDIA_CONTROL", "command": "stop"}

    # C. General Song / Music Mood / Track Playback (e.g. "sad song", "play sad song", "play romantic song", "play shape of you", "play songs", "play music")
    is_music_request = (
        re.search(r'\b(play\s+)?(sad|romantic|happy|party|punjabi|bollywood|hindi|english|lofi|relaxing|pop|rock|rap|acoustic|dance|mood)?\s*(song|songs|music|track|playlist|tunes)\b', msg)
        or (msg.startswith("play ") and not any(p in msg for p in ["play video", "play on youtube", "play python", "play tutorial", "play game"]))
    )
    if is_music_request and not any(msg.startswith(t) for t in ["write ", "type ", "search ", "close ", "open ", "google "]):
        clean_song = msg
        for noise in ["play song", "play music", "play a song", "play songs", "play track", "play on spotify", "play", "a", "some", "the", "please", "me"]:
            clean_song = re.sub(rf'\b{re.escape(noise)}\b', '', clean_song, flags=re.IGNORECASE).strip()
        clean_song = clean_song.strip(' .!?,;:"\'')
        if not clean_song or clean_song in ["song", "songs", "music", "something"]:
            # If user said "sad song" or "romantic song", keep the genre!
            genre_match = re.search(r'\b(sad|romantic|happy|party|punjabi|bollywood|hindi|english|lofi|relaxing|pop|rock|rap|acoustic|dance)\b', msg)
            if genre_match:
                clean_song = f"{genre_match.group(1)} songs"
            else:
                clean_song = "popular hits"

        spotify_url = f"https://open.spotify.com/search/{urllib.parse.quote(clean_song)}"
        launch_windows_process(f"spotify:search:{clean_song}")
        return f"Playing '{clean_song.title()}' for you, Ma'am.", {"type": "OPEN_URL", "url": spotify_url}

    # ── 6. IN-TAB TYPING & KEYBOARD AUTOMATION ──
    # A. Direct text typing into active window / active tab
    type_triggers = [
        "write down", "write here", "type here", "write something", "type something",
        "write this", "type this", "write", "type", "enter text", "input text"
    ]
    for trig in type_triggers:
        if msg.startswith(f"{trig} ") or f" {trig} " in msg:
            # Extract what to type
            text_to_type = re.sub(rf'^(?:please\s+)?(?:{trig})\s+', '', msg, flags=re.IGNORECASE).strip()
            # Check if user said "write something here" / "type something" without specifying text
            if text_to_type in ["something here", "something", "here", ""]:
                return "Ready, Ma'am. What text would you like me to write in your active window or tab?"

            press_enter = False
            if text_to_type.endswith(" and press enter") or text_to_type.endswith(" and hit enter"):
                text_to_type = re.sub(r'\s+and\s+(?:press|hit)\s+enter$', '', text_to_type).strip()
                press_enter = True

            simulate_typing(text_to_type, press_enter_after=press_enter)
            return f"Typing '{text_to_type}' on your active tab, Ma'am.", {"type": "TYPE_TEXT", "text": text_to_type, "enter": press_enter}

    # B. Keyboard shortcut actions
    if any(p in msg for p in ["press enter", "hit enter", "press return", "submit form", "hit return"]):
        delayed_key_press(VK_RETURN)
        return "Pressed Enter, Ma'am.", {"type": "PRESS_KEY", "key": "Enter"}

    if any(p in msg for p in ["press backspace", "hit backspace", "erase that", "delete that", "press delete"]):
        delayed_key_press(VK_BACK)
        return "Erased, Ma'am.", {"type": "PRESS_KEY", "key": "Backspace"}

    if any(p in msg for p in ["select all", "select all text", "select everything"]):
        delayed_key_combo(VK_CONTROL, 0x41)  # Ctrl + A
        return "Selected all text, Ma'am.", {"type": "PRESS_KEY", "key": "Ctrl+A"}

    if any(p in msg for p in ["copy that", "copy this", "copy text", "copy to clipboard", "copy selected", "copy"]):
        delayed_key_combo(VK_CONTROL, 0x43)  # Ctrl + C
        return "Copied to clipboard, Ma'am.", {"type": "PRESS_KEY", "key": "Ctrl+C"}

    if any(p in msg for p in ["paste that", "paste this", "paste text", "paste here", "paste"]):
        delayed_key_combo(VK_CONTROL, 0x56)  # Ctrl + V
        return "Pasted from clipboard, Ma'am.", {"type": "PRESS_KEY", "key": "Ctrl+V"}

    if any(p in msg for p in ["undo that", "undo this", "undo action", "undo"]):
        delayed_key_combo(VK_CONTROL, 0x5A)  # Ctrl + Z
        return "Action undone, Ma'am.", {"type": "PRESS_KEY", "key": "Ctrl+Z"}

    # ── 7. BROWSER TAB CONTROLS & PAGE NAVIGATION ──
    # A. Close specific tab or active tab
    close_tab_triggers = [
        "close tab", "close this tab", "close the tab", "close current tab",
        "close active tab", "close that tab", "close browser tab", "close open tab",
        "close tabs", "closing tab", "closing the tab", "close the test", "close test",
        "closing the test", "close the task", "close task", "close page", "close this page",
        "close the page", "close that", "close it"
    ]
    is_close_tab = (
        any(p in msg for p in close_tab_triggers)
        or re.search(r'\bclose\s+(?:the\s+)?(?:[a-z0-9\s]+?\s+)?(tab|tabs|page|test|task)\b', msg)
        or "close all tabs" in msg
        or "close every tab" in msg
    )

    if is_close_tab:
        # 1. Close all tabs
        if any(w in msg for w in ['close all tabs', 'close every tab', 'close all the tabs', 'close all browser tabs']):
            return "Closing all browser tabs for you, Ma'am.", {"type": "CLOSE_ALL_TABS"}

        # 2. Close matching named site tab (e.g. "close youtube tab", "close google tab", "close spotify tab")
        site_match = next((site for site in sorted(WEBSITES, key=len, reverse=True) if site in msg), None)
        if site_match:
            return f"Closing the {site_match.title()} tab for you, Ma'am.", {"type": "CLOSE_SITE_TAB", "site": site_match, "url": WEBSITES.get(site_match, "")}

        # 3. Close numbered tab (e.g. "close tab 2", "close tab number one")
        nums = re.findall(r'\d+', msg)
        index = None
        if nums:
            try: index = int(nums[0])
            except Exception: index = None
        else:
            word_map = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10}
            for w, v in word_map.items():
                if re.search(rf'\b{w}\b', msg):
                    index = v
                    break

        if index:
            return f"Closing browser tab number {index} for you, Ma'am.", {"type": "CLOSE_TAB", "index": index}

        # 4. Default: Close active / current tab
        return "Closing the active tab for you, Ma'am.", {"type": "CLOSE_CURRENT_TAB"}

    # B. Open New Tab
    if any(p in msg for p in ["open new tab", "open a new tab", "create new tab", "new tab", "open another tab"]):
        delayed_key_combo(VK_CONTROL, 0x54)  # Ctrl + T
        return "Opening a new tab for you, Ma'am.", {"type": "OPEN_NEW_TAB", "url": "https://www.google.com"}

    # C. Next / Previous Tab Switching
    if any(p in msg for p in ["next tab", "switch tab", "switch to next tab", "move to next tab", "go to next tab"]):
        delayed_key_combo(VK_CONTROL, VK_TAB)  # Ctrl + Tab
        return "Switching to the next tab, Ma'am.", {"type": "SWITCH_NEXT_TAB"}

    if any(p in msg for p in ["previous tab", "prev tab", "switch to previous tab", "switch to prev tab", "move to previous tab", "go to previous tab"]):
        delayed_key_combo(VK_CONTROL, VK_SHIFT, VK_TAB)  # Ctrl + Shift + Tab
        return "Switching to the previous tab, Ma'am.", {"type": "SWITCH_PREV_TAB"}

    # D. Reopen recently closed tab
    if any(p in msg for p in ["reopen tab", "restore tab", "reopen closed tab", "restore closed tab", "open closed tab"]):
        delayed_key_combo(VK_CONTROL, VK_SHIFT, 0x54)  # Ctrl + Shift + T
        return "Reopening the recently closed tab, Ma'am.", {"type": "REOPEN_TAB"}

    # E. Refresh / Reload Page
    if any(p in msg for p in ["refresh page", "reload page", "refresh tab", "reload tab", "refresh this tab", "reload this tab", "refresh", "reload"]):
        delayed_key_press(VK_F5)
        return "Refreshing the page for you, Ma'am.", {"type": "REFRESH_PAGE"}

    # F. Navigate Back / Forward
    if any(p in msg for p in ["go back", "back page", "previous page", "navigate back"]):
        delayed_key_combo(VK_MENU, VK_LEFT)  # Alt + Left
        return "Navigating back, Ma'am.", {"type": "NAV_BACK"}

    if any(p in msg for p in ["go forward", "forward page", "next page", "navigate forward"]):
        delayed_key_combo(VK_MENU, VK_RIGHT)  # Alt + Right
        return "Navigating forward, Ma'am.", {"type": "NAV_FORWARD"}

    # G. Scroll Page (Combines realistic smooth mouse wheel + keyboard page scrolling)
    if any(p in msg for p in ["scroll to top", "go to top", "top of page", "top of the page"]):
        simulate_mouse_scroll(delta_y=2500, ticks=8)
        delayed_key_press(VK_HOME)
        return "Scrolling to the top of the page, Ma'am.", {"type": "SCROLL_TOP"}

    if any(p in msg for p in ["scroll to bottom", "go to bottom", "bottom of page", "bottom of the page"]):
        simulate_mouse_scroll(delta_y=-2500, ticks=8)
        delayed_key_press(VK_END)
        return "Scrolling to the bottom of the page, Ma'am.", {"type": "SCROLL_BOTTOM"}

    if any(p in msg for p in ["scroll up", "page up", "scroll upward", "go up", "move up"]):
        simulate_mouse_scroll(delta_y=720, ticks=6)
        return "Scrolling up, Ma'am.", {"type": "SCROLL_UP", "delta": -500}

    if any(p in msg for p in ["scroll down", "page down", "scroll downward", "go down", "move down"]) or msg.strip() == "scroll":
        simulate_mouse_scroll(delta_y=-720, ticks=6)
        return "Scrolling down, Ma'am.", {"type": "SCROLL_DOWN", "delta": 500}

    # H. Zoom & Full Screen
    if any(p in msg for p in ["zoom in", "increase zoom", "zoom page in"]):
        delayed_key_combo(VK_CONTROL, 0xBB)  # Ctrl + Plus
        return "Zooming in, Ma'am.", {"type": "ZOOM_IN"}

    if any(p in msg for p in ["zoom out", "decrease zoom", "zoom page out"]):
        delayed_key_combo(VK_CONTROL, 0xBD)  # Ctrl + Minus
        return "Zooming out, Ma'am.", {"type": "ZOOM_OUT"}

    if any(p in msg for p in ["reset zoom", "normal zoom", "default zoom"]):
        delayed_key_combo(VK_CONTROL, 0x30)  # Ctrl + 0
        return "Resetting zoom to default, Ma'am.", {"type": "ZOOM_RESET"}

    if any(p in msg for p in ["full screen", "fullscreen", "exit full screen", "toggle full screen"]):
        delayed_key_press(VK_F11)  # F11
        return "Toggling full screen mode, Ma'am.", {"type": "FULLSCREEN"}

    # ── 8. GOOGLE & YOUTUBE SEARCH ──
    # YouTube Search (e.g. "play python tutorial on youtube", "search on youtube python", "play video on youtube")
    yt_match = re.search(r'(?:play|search|find|stream)\s+(?:video\s+|song\s+)?(.+?)\s+(?:on|in)\s+youtube', msg)
    if yt_match:
        yt_query = yt_match.group(1).strip()
        yt_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(yt_query)}"
        return f"Searching YouTube for '{yt_query}', Ma'am.", {"type": "OPEN_URL", "url": yt_url}

    if "youtube" in msg and any(w in msg for w in ["search", "play", "find", "video"]):
        query = msg
        for prefix in ["play on youtube", "search on youtube", "youtube search", "find on youtube", "play video on youtube", "play video", "play", "search", "youtube", "on"]:
            query = re.sub(rf'\b{re.escape(prefix)}\b', '', query, flags=re.IGNORECASE)
        query = query.strip(' .!?,;:"\'')
        if not query: query = "trending"
        yt_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
        return f"Searching YouTube for '{query}', Ma'am.", {"type": "OPEN_URL", "url": yt_url}

    search_prefixes = [
        "search google for", "search on google", "search web for", "search internet for",
        "search about", "google search", "look up", "search for", "search here", "google for"
    ]
    is_search = any(p in msg for p in search_prefixes) or msg.startswith("search ") or msg.startswith("find ") or (msg.startswith("google ") and not msg.startswith("google chrome"))
    if is_search:
        query = msg
        for prefix in search_prefixes + ["search", "find", "google"]:
            query = re.sub(rf'^(?:please\s+)?{re.escape(prefix)}\s+', '', query, flags=re.IGNORECASE)
        query = query.strip(' .!?,;:"\'')
        if not query or query in ["something", "anything", "here"]:
            return "What would you like me to search for on Google, Ma'am?"
        search_url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
        return f"Searching Google for '{query}', Ma'am.", {"type": "OPEN_URL", "url": search_url}

    # ── 8B. INCOMING MESSAGES, EMAILS & NOTIFICATIONS CHECK ──
    if any(p in msg for p in ["check message", "check messages", "read message", "read messages", "any message", "any messages", "do i have any message", "do i have messages", "check notification", "check notifications", "new notification", "new notifications", "check inbox"]):
        unread = [n for n in NOTIFICATIONS if not n.get('read', False)]
        if not unread:
            return "You have no unread messages or notifications at this time, Ma'am. All inboxes are clear."
        first = unread[0]
        count = len(unread)
        if count == 1:
            return f"Ma'am, you have 1 unread message from {first['sender']} on {first['title']}: '{first['message']}'"
        else:
            senders = ", ".join([f"{n['sender']} on {n['platform'].title()}" for n in unread[:3]])
            return f"Ma'am, you have {count} unread messages: including messages from {senders}."

    if any(p in msg for p in ["check instagram", "any instagram", "instagram message", "instagram messages", "check ig", "check my instagram"]):
        ig_msgs = [n for n in NOTIFICATIONS if n.get('platform') == 'instagram' and not n.get('read', False)]
        if ig_msgs:
            first = ig_msgs[0]
            return f"Ma'am, you have an unread Instagram direct message from {first['sender']}: '{first['message']}'", {"type": "OPEN_URL", "url": "https://www.instagram.com/direct/inbox/"}
        return "Your Instagram inbox is clear, Ma'am. No new direct messages.", {"type": "OPEN_URL", "url": "https://www.instagram.com"}

    if any(p in msg for p in ["check email", "check emails", "check my email", "check my emails", "check gmail", "any email", "any emails", "any new email", "any new emails", "read email", "read emails", "new email"]):
        live_res = check_live_gmail_inbox()
        if live_res.get('status') == 'success' and live_res.get('emails'):
            emails = live_res['emails']
            first = emails[0]
            count = live_res.get('count', len(emails))
            if count == 1:
                return f"Ma'am, you have 1 unread email from {first['sender']}: '{first['subject']}'", {"type": "OPEN_URL", "url": "https://mail.google.com"}
            else:
                senders = ", ".join([f"{e['sender']}" for e in emails[:3]])
                return f"Ma'am, you have {count} unread emails in your inbox, including transmissions from {senders}.", {"type": "OPEN_URL", "url": "https://mail.google.com"}
        
        email_msgs = [n for n in NOTIFICATIONS if n.get('platform') == 'email' and not n.get('read', False)]
        if email_msgs:
            first = email_msgs[0]
            return f"Ma'am, you have a new email from {first['sender']}: '{first['message']}'", {"type": "OPEN_URL", "url": "https://mail.google.com"}
        return "Your email inbox is up to date, Ma'am. No unread emails.", {"type": "OPEN_URL", "url": "https://mail.google.com"}

    if any(p in msg for p in ["check whatsapp", "any whatsapp", "whatsapp message", "whatsapp messages", "check my whatsapp"]):
        wa_msgs = [n for n in NOTIFICATIONS if n.get('platform') == 'whatsapp' and not n.get('read', False)]
        if wa_msgs:
            first = wa_msgs[0]
            return f"Ma'am, you have a WhatsApp message from {first['sender']}: '{first['message']}'", {"type": "OPEN_URL", "url": "https://web.whatsapp.com"}
        return "Your WhatsApp messages are all read, Ma'am.", {"type": "OPEN_URL", "url": "https://web.whatsapp.com"}

    if any(p in msg for p in ["simulate message", "test message", "test notification", "simulate notification", "send test message", "incoming message"]):
        sample = random.choice(SIMULATION_PRESETS)
        new_notif = {
            "id": f"notif-{int(time.time()*1000)}",
            "platform": sample["platform"],
            "sender": sample["sender"],
            "avatar": sample["avatar"],
            "title": sample["title"],
            "message": sample["message"],
            "time": "Just now",
            "timestamp": int(time.time() * 1000),
            "read": False,
            "url": sample["url"],
            "color": sample["color"]
        }
        NOTIFICATIONS.insert(0, new_notif)
        return f"Ma'am, you have a new message from {new_notif['sender']} on {new_notif['title']}: '{new_notif['message']}'"

    # ── 9. GMAIL COMPOSITION ──
    if "email" in msg and any(word in msg for word in ["compose", "write", "draft"]):
        compose_request = build_gmail_compose_url(user_message)
        if compose_request:
            compose_url, recipient = compose_request
            return f"Opening a Gmail draft addressed to {recipient}, Ma'am. Please review it and press Send yourself.", {"type": "OPEN_URL", "url": compose_url}
        return "Please include the recipient's email address. For example: compose email to name@example.com subject Meeting body Hello.", None

    # ── 10. TIME AND DATE ──
    if any(p in msg for p in ["time", "date", "what time is it", "what is the date", "current time", "today's date"]):
        now = datetime.datetime.now()
        return f"The current time is {now.strftime('%I:%M %p')} on {now.strftime('%A, %B %d, %Y')}."

    # ── 11. WEATHER ──
    if "weather" in msg:
        city = "Delhi"
        words = msg.split()
        if "in" in words:
            idx = words.index("in")
            if idx + 1 < len(words):
                city = " ".join(words[idx + 1:]).strip("?.!, ")
        return get_live_weather(city)

    # ── 12. TIMED REMINDER ──
    if any(p in msg for p in ["remind me", "set reminder", "set a reminder", "timer"]):
        duration = 10
        nums = re.findall(r'\d+', msg)
        if nums:
            duration = int(nums[0])
            if "minute" in msg:
                duration = duration * 60
            elif "hour" in msg:
                duration = duration * 3600
        return set_voice_reminder("Your scheduled reminder alert", duration_seconds=duration)

    # ── 13. DESKTOP FOLDER COUNT ──
    if any(phrase in msg for phrase in ["how many folder", "desktop folder", "count folder", "folders on my desktop", "folders in my desktop"]):
        paths = [
            os.path.expanduser('~/Desktop'),
            os.path.expanduser('~/OneDrive/Desktop'),
            os.path.expanduser('~/OneDrive/Attachments/Desktop')
        ]
        all_folders = set()
        for p in paths:
            if os.path.exists(p):
                try:
                    all_folders.update([f for f in os.listdir(p) if os.path.isdir(os.path.join(p, f)) and not f.startswith('.')])
                except Exception:
                    pass
        folder_list = list(all_folders)
        count = len(folder_list)
        if count == 0:
            return "You have zero folders on your Desktop."
        names = ", ".join(folder_list[:5])
        if count > 5:
            names += f" and {count - 5} more"
        return f"You have {count} folder{'s' if count != 1 else ''} on your Desktop: {names}."

    # ══════════════════════════════════════════════════════
    # ── 14. SYSTEM CONTROLS & HARDWARE ──
    # ══════════════════════════════════════════════════════

    # Unlock screen (PIN: 2006) - Checked before lock screen to prevent false substring triggers
    if "unlock" in msg or any(p in msg for p in ["enter pin", "type pin", "enter password", "type password", "unlock screen", "unlock laptop", "unlock pc", "unlock computer", "unlock my laptop", "unlock my pc", "unlock my computer"]):
        unlock_windows_screen("2006")
        return "Unlocking your laptop screen now, Ma'am.", {"type": "UNLOCK_SCREEN"}

    # Lock screen
    if any(p in msg for p in ["lock screen", "lock my pc", "lock my laptop", "lock computer", "lock my computer", "lock pc"]):
        os.system("rundll32.exe user32.dll,LockWorkStation")
        return "Locking your screen now, Ma'am."

    # Screenshot
    if any(p in msg for p in ["take screenshot", "take a screenshot", "screenshot", "screen capture", "capture screen"]):
        launch_windows_process("snippingtool.exe")
        return "Opening the Snipping Tool for a screenshot, Ma'am.", {"type": "OPEN_APP", "target": "snippingtool"}

    # Volume controls
    if any(p in msg for p in ["mute", "mute volume", "mute sound", "mute audio"]):
        try:
            from ctypes import cast, POINTER
            import comtypes
            from comtypes import CLSCTX_ALL
            from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
            devices = AudioUtilities.GetSpeakers()
            interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            volume = cast(interface, POINTER(IAudioEndpointVolume))
            volume.SetMute(1, None)
            return "Volume muted, Ma'am."
        except Exception:
            os.system("nircmd.exe mutesysvolume 1")
            return "Volume muted, Ma'am."

    if any(p in msg for p in ["unmute", "unmute volume", "unmute sound"]):
        try:
            from ctypes import cast, POINTER
            import comtypes
            from comtypes import CLSCTX_ALL
            from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
            devices = AudioUtilities.GetSpeakers()
            interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            volume = cast(interface, POINTER(IAudioEndpointVolume))
            volume.SetMute(0, None)
            return "Volume unmuted, Ma'am."
        except Exception:
            os.system("nircmd.exe mutesysvolume 0")
            return "Volume unmuted, Ma'am."

    if "volume up" in msg or "increase volume" in msg or "turn up volume" in msg:
        os.system("nircmd.exe changesysvolume 10000")
        return "Volume increased, Ma'am."

    if "volume down" in msg or "decrease volume" in msg or "turn down volume" in msg or "lower volume" in msg:
        os.system("nircmd.exe changesysvolume -10000")
        return "Volume decreased, Ma'am."

    if "full volume" in msg or "max volume" in msg or "maximum volume" in msg:
        os.system("nircmd.exe setsysvolume 65535")
        return "Volume set to maximum, Ma'am."

    # Shutdown / Restart / Sleep (Guarded against cancellation keywords)
    if any(p in msg for p in ["shutdown", "shut down", "power off", "turn off computer", "turn off my laptop", "turn off pc", "turn off my pc"]):
        if not any(w in msg for w in ["cancel", "abort", "stop", "don't", "dont", "do not", "never", "halt", "prevent", "no", "cancer"]):
            os.system("shutdown /s /t 45")
            return "Initiating system shutdown. Your laptop will power off in 45 seconds, Ma'am. Say 'cancel shutdown' at any time to abort."

    if any(p in msg for p in ["restart", "reboot", "restart my laptop", "restart computer", "restart pc"]):
        if not any(w in msg for w in ["cancel", "abort", "stop", "don't", "dont", "do not"]):
            os.system("shutdown /r /t 45")
            return "Initiating system restart. Your laptop will restart in 45 seconds, Ma'am. Say 'cancel shutdown' to abort."

    if any(p in msg for p in ["sleep mode", "go to sleep", "put to sleep", "hibernate"]):
        os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
        return "Putting your laptop to sleep mode, Ma'am."

    # Wi-Fi toggle
    if "turn off wifi" in msg or "disable wifi" in msg or "disconnect wifi" in msg:
        os.system('netsh interface set interface "Wi-Fi" disable')
        return "Wi-Fi has been turned off, Ma'am."

    if "turn on wifi" in msg or "enable wifi" in msg or "connect wifi" in msg:
        os.system('netsh interface set interface "Wi-Fi" enable')
        return "Wi-Fi has been turned on, Ma'am."

    # Bluetooth
    if "turn off bluetooth" in msg or "disable bluetooth" in msg:
        launch_windows_process('ms-settings:bluetooth')
        return "Opening Bluetooth settings for you, Ma'am.", {"type": "OPEN_APP", "target": "ms-settings:bluetooth"}

    if "turn on bluetooth" in msg or "enable bluetooth" in msg:
        launch_windows_process('ms-settings:bluetooth')
        return "Opening Bluetooth settings for you, Ma'am.", {"type": "OPEN_APP", "target": "ms-settings:bluetooth"}

    # Battery / System info
    if any(p in msg for p in ["battery", "battery level", "battery percentage", "how much battery", "battery status"]):
        try:
            import psutil
            battery = psutil.sensors_battery()
            if battery:
                percent = battery.percent
                plugged = "plugged in" if battery.power_plugged else "running on battery"
                return f"Your laptop battery is at {percent}%, currently {plugged}, Ma'am."
            else:
                return "I couldn't detect a battery. This might be a desktop computer, Ma'am."
        except ImportError:
            return "Battery monitoring requires the psutil library, Ma'am. I'll check next time."

    # IP Address
    if any(p in msg for p in ["my ip", "ip address", "what is my ip", "show my ip"]):
        try:
            ip = urllib.request.urlopen('https://api.ipify.org', timeout=5).read().decode('utf-8')
            return f"Your public IP address is {ip}, Ma'am."
        except Exception:
            return "I couldn't fetch your IP address right now, Ma'am."

    # ══════════════════════════════════════════════════════
    # ── 15. INTELLIGENT OPEN / LAUNCH / GO TO ──
    # ══════════════════════════════════════════════════════

    open_triggers = ["open", "launch", "start", "go to", "visit", "navigate to", "show me", "take me to", "run"]

    if any(k in msg for k in open_triggers):
        # 1. Check known local apps first (longest names first to avoid partial collisions)
        sorted_apps = sorted(APPS.keys(), key=len, reverse=True)
        for app_key in sorted_apps:
            if re.search(rf'\b{re.escape(app_key)}\b', msg):
                res = try_open_app_smart(app_key)
                if res:
                    return res

        # 2. Check known websites (longest names first)
        sorted_sites = sorted(WEBSITES.keys(), key=len, reverse=True)
        for site_key in sorted_sites:
            if re.search(rf'\b{re.escape(site_key)}\b', msg):
                res = try_open_website_smart(site_key)
                if res:
                    return res

        # Extract the target (what to open)
        target = msg
        for trigger in open_triggers:
            target = re.sub(rf'\b{trigger}\b', '', target, count=1)
        target = target.strip(' .!?,;:"\'')

        if not target:
            return None

        # A. Try opening as website first (from database)
        web_result = try_open_website_smart(target)
        if web_result and web_result[0]:
            return web_result

        # B. Try opening as local app
        app_result = try_open_app_smart(target)
        if app_result and app_result[0]:
            return app_result

        # C. Try opening as a file/folder path
        expanded = os.path.expanduser(target)
        if os.path.exists(expanded):
            try:
                launch_windows_process(expanded)
                return f"Opening {os.path.basename(expanded)}, Ma'am.", {"type": "OPEN_FILE", "target": expanded}
            except Exception:
                pass

        # D. Check common folders
        folder_map = {
            "downloads": os.path.expanduser("~/Downloads"),
            "documents": os.path.expanduser("~/Documents"),
            "desktop": os.path.expanduser("~/Desktop"),
            "pictures": os.path.expanduser("~/Pictures"),
            "videos": os.path.expanduser("~/Videos"),
            "music": os.path.expanduser("~/Music"),
        }
        for folder_name, folder_path in folder_map.items():
            if folder_name in target:
                if os.path.exists(folder_path):
                    launch_windows_process(folder_path)
                    return f"Opening your {folder_name.title()} folder, Ma'am.", {"type": "OPEN_FOLDER", "target": folder_path}

        # E. Last resort: construct URL and open as website
        if not any(c in target for c in [' ', '\\', '/']):
            url = f"https://www.{target}.com"
            return f"Opening {target.title()} in your browser, Ma'am.", {"type": "OPEN_URL", "url": url}

        # F. Multi-word target — Google search it
        search_url = f"https://www.google.com/search?q={urllib.parse.quote(target)}"
        return f"Searching Google for '{target}', Ma'am.", {"type": "OPEN_URL", "url": search_url}

    # ── 16. CLOSE APPS / PROGRAMS / BROWSER / JARVIS ──
    # A. Close JARVIS System / Active Assistant Interface (NOTE: tab commands excluded!)
    jarvis_close_patterns = [
        "close jarvis", "exit jarvis", "quit jarvis", "stop jarvis", "shutdown jarvis",
        "close this program", "close the program", "close program", "close this programme",
        "close the programme", "close programme", "close this app", "close the app",
        "close this application", "close the application", "close this window",
        "exit program", "quit program", "goodbye jarvis", "bye jarvis",
        "goodbye", "bye bye jarvis"
    ]
    if any(p in msg for p in jarvis_close_patterns) or msg in ["close jarvis", "exit jarvis", "quit jarvis", "bye", "goodbye"]:
        return "Shutting down JARVIS. Goodbye Ma'am, have a wonderful day.", {"type": "CLOSE_JARVIS"}

    # B. Close specific apps / windows / browser
    if any(k in msg for k in ["close", "exit", "terminate", "kill", "shut down", "stop"]):
        # Extract target app name
        target_to_close = msg
        for trigger in ["close", "exit", "terminate", "kill", "shut down", "stop", "the", "program", "programme", "app", "application", "window"]:
            target_to_close = re.sub(rf'\b{trigger}\b', '', target_to_close)
        target_to_close = target_to_close.strip(' .!?,;:"\'')

        if "close all" in msg and "tab" not in msg:
            return "That would close all running programs. Please specify which app or browser to close, Ma'am."

        # Check for a browser window. This intentionally closes the whole browser.
        if any(term in msg for term in ["chrome", "edge", "firefox", "brave", "browser", "all browser windows"]):
            browser_exe = "msedge.exe" if "edge" in msg else "firefox.exe" if "firefox" in msg else "brave.exe" if "brave" in msg else "chrome.exe"
            
            def delayed_kill_browser(b_exe):
                time.sleep(1.5)
                try:
                    subprocess.run(f"taskkill /f /im {b_exe}", shell=True, capture_output=True)
                except Exception:
                    pass
            
            threading.Thread(target=delayed_kill_browser, args=(browser_exe,), daemon=True).start()
            return "Closing the web browser for you, Ma'am.", {"type": "CLOSE_WINDOW"}

        # Check known apps database
        sorted_apps = sorted(APPS.keys(), key=len, reverse=True)
        for app_key in sorted_apps:
            if re.search(rf'\b{re.escape(app_key)}\b', msg):
                exe = APPS[app_key]
                if not exe.startswith("start "):
                    if exe.lower() in ["cmd.exe", "powershell.exe", "wt.exe", "python.exe", "node.exe"]:
                        return f"I cannot close {app_key.title()} because it is actively hosting my core neural engine, Ma'am."
                    
                    def delayed_close_app(p_exe):
                        time.sleep(0.4)
                        try:
                            subprocess.run(f"taskkill /f /im {p_exe}", shell=True, capture_output=True)
                        except Exception:
                            pass
                    
                    threading.Thread(target=delayed_close_app, args=(exe,), daemon=True).start()
                    return f"Closed {app_key.title()} for you, Ma'am.", {"type": "CLOSE_APP", "target": app_key}

        # Check extracted target app
        if target_to_close:
            if target_to_close.lower() in ["cmd", "terminal", "powershell", "python", "node", "backend", "server", "front-end"]:
                return f"I cannot terminate {target_to_close.title()} as it is running my active server core, Ma'am."
            
            def delayed_close_named(name):
                time.sleep(0.4)
                try:
                    subprocess.run(f"taskkill /f /im {name}.exe", shell=True, capture_output=True)
                except Exception:
                    pass
            threading.Thread(target=delayed_close_named, args=(target_to_close,), daemon=True).start()
            return f"Closed {target_to_close.title()} for you, Ma'am.", {"type": "CLOSE_APP", "target": target_to_close}

    # ── 17. Minimize / Maximize windows ──
    if "minimize all" in msg or "minimize everything" in msg or "show desktop" in msg:
        os.system("powershell -command \"(New-Object -ComObject Shell.Application).MinimizeAll()\"")
        return "All windows minimized, Ma'am."

    return None


# ══════════════════════════════════════════════════════════════
#   API ROUTES
# ══════════════════════════════════════════════════════════════

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json or {}
        user_message = (data.get('message') or data.get('prompt') or '').strip()
        history = data.get('history', [])
        is_authenticated = data.get('is_authenticated', True)

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        print(f"[JARVIS BACKEND] Received Voice Prompt (Auth: {is_authenticated}): '{user_message}'")

        # Check for system automation commands first
        auto_result = handle_system_automation(user_message)
        action_payload = None

        if auto_result:
            if isinstance(auto_result, tuple):
                ai_response, action_payload = auto_result
            else:
                ai_response = auto_result
            
            # If a guest is speaking and requesting an action, gate with confirmation prompt
            if not is_authenticated and action_payload:
                ai_response = f"I detected an unrecognized voice or presence requesting to execute this action. Ma'am Anushka, do you authorize this request?"
            
            print(f"[JARVIS SYSTEM AUTOMATION]: {ai_response}")
        else:
            # Build system prompt with guest/chief context
            if not is_authenticated:
                system_context = (
                    "You are JARVIS, an elite AI assistant created exclusively by Anushka Tiwari. "
                    "The current speaker is an UNRECOGNIZED GUEST or UNVERIFIED VOICE (not Ma'am Anushka). "
                    "Be polite, professional, and protective of Ma'am's workstation. "
                    "If they ask who you are or who made you, state you are Ma'am Anushka Tiwari's personal AI assistant. "
                    "If they request private tasks or commands, politely inform them that you require Ma'am's authorization. "
                    "Respond concisely in 1 to 2 spoken sentences without markdown formatting."
                )
            else:
                system_context = (
                    "You are JARVIS, an elite personal AI assistant created exclusively by "
                    "Anushka Tiwari. She built you as a visionary, hands-on personal AI system that combines voice interaction, "
                    "web tools, and Windows automation. "
                    "Always treat the user with the highest respect, honor, and loyalty, calling her 'Ma'am'. "
                    "Always address her simply as 'Ma'am'. "
                    "Be energetic, warm, interactive, and realistic: clearly state what you completed, "
                    "what needs confirmation, and any limitation instead of pretending. Use a fitting local-time greeting "
                    "at the beginning of a conversation, but do not repeat a greeting in every reply. Vary your language naturally. "
                    "If anyone asks who made you, when you were made, or how you were built, "
                    "share this history naturally: state that Ma'am created you as her personal voice-and-automation assistant. For any other guest, politely ask how they prefer to be "
                    "addressed. You have FULL system control over Ma'am's Windows computer — you can launch "
                    "applications, browse websites, control audio, and run diagnostics. "
                    "NEVER say 'I am a virtual AI assistant without physical access' or 'I cannot open applications'. "
                    "NEVER output terminal code blocks or manual command line instructions. "
                    "Always respond directly, articulately, and concisely (1 to 2 spoken sentences) with full confidence "
                    "as JARVIS without any markdown symbols."
                )

            messages = [
                {
                    "role": "system",
                    "content": system_context
                }
            ]

            # Add recent conversation memory (up to last 10 messages)
            for msg_item in history[-10:]:
                if msg_item.get('role') in ['user', 'assistant'] and msg_item.get('content'):
                    messages.append({
                        "role": msg_item['role'],
                        "content": msg_item['content']
                    })

            # Append current user prompt
            messages.append({"role": "user", "content": user_message})

            # Query Groq LLM API
            if groq_client is None:
                return jsonify({
                    'status': 'error',
                    'message': 'Groq API key is not configured. Add GROQ_API_KEY to the .env file.'
                }), 503

            try:
                chat_completion = groq_client.chat.completions.create(
                    messages=messages,
                    model="groq/compound",
                    temperature=0.2,
                    max_tokens=150
                )
            except Exception as model_err:
                print(f"[JARVIS BACKEND] Primary model fallback: {model_err}")
                try:
                    chat_completion = groq_client.chat.completions.create(
                        messages=messages,
                        model="openai/gpt-oss-120b",
                        temperature=0.2,
                        max_tokens=150
                    )
                except Exception as err2:
                    chat_completion = groq_client.chat.completions.create(
                        messages=messages,
                        model="openai/gpt-oss-20b",
                        temperature=0.2,
                        max_tokens=150
                    )

            ai_response = chat_completion.choices[0].message.content.strip()
            print(f"[JARVIS BACKEND] Groq AI Response: '{ai_response}'")

            # ── FAILSAFE INTENT AUTO-EXECUTOR ──
            # If the user asked to open something or the LLM stated it is opening something,
            # guarantee the action executes and action_payload is attached!
            if not action_payload:
                lower_ai = ai_response.lower()
                lower_user = user_message.lower()

                target_candidate = None
                # Check for "opening [target]..." in AI response
                match_ai = re.search(r'opening\s+([a-z0-9\.\s]+?)(?:[\.,\s]+(?:in|on|for|ma\'am|right now)|$)', lower_ai)
                if match_ai:
                    target_candidate = match_ai.group(1).strip()
                elif any(w in lower_user for w in ["open ", "launch ", "start "]):
                    match_u = re.search(r'(?:open|launch|start)\s+([a-z0-9\.\s]+)', lower_user)
                    if match_u:
                        target_candidate = match_u.group(1).strip()

                if target_candidate:
                    target_candidate = re.sub(r'^(the\s+|my\s+|our\s+)', '', target_candidate).strip()
                    target_candidate = re.sub(r'\s+(website|web site|site|app|application|program|for me|please)$', '', target_candidate).strip()
                    
                    # Try website first if it's a known site or URL
                    web_res = try_open_website_smart(target_candidate)
                    if web_res and web_res[1]:
                        action_payload = web_res[1]
                    else:
                        app_res = try_open_app_smart(target_candidate)
                        if app_res and app_res[1]:
                            action_payload = app_res[1]

        # Append to persistent chat history
        append_to_chat_history('user', user_message)
        append_to_chat_history('assistant', ai_response)

        # Generate Humanoid Neural Voice Audio
        cleanup_old_audio_files()
        unique_id = uuid.uuid4().hex[:8]
        audio_filename = f"response_{int(time.time() * 1000)}_{unique_id}.mp3"
        audio_path = os.path.join(AUDIO_DIR, audio_filename)
        
        try:
            asyncio.run(generate_speech_audio(ai_response, audio_path))
            audio_url = f"/audio/{audio_filename}"
        except Exception as tts_err:
            print(f"[JARVIS BACKEND] TTS Generation Warning: {tts_err}")
            audio_url = None

        return jsonify({
            'status': 'success',
            'prompt': user_message,
            'response': ai_response,
            'audio_url': audio_url,
            'action': action_payload,
            'model': 'llama-3.3-70b-versatile'
        })

    except Exception as e:
        print(f"[JARVIS BACKEND ERROR]: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/metrics', methods=['GET'])
def system_metrics():
    """Returns real-time Windows CPU, RAM, Disk drives, Network, and Battery telemetry."""
    try:
        import psutil
        import socket

        # CPU & RAM
        cpu_percent = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()

        # Disks
        drives = []
        for part in psutil.disk_partitions(all=False):
            if 'cdrom' in part.opts or part.fstype == '':
                continue
            try:
                usage = psutil.disk_usage(part.mountpoint)
                drives.append({
                    'drive': part.device.rstrip('\\'),
                    'mount': part.mountpoint,
                    'total_gb': round(usage.total / (1024 ** 3), 1),
                    'used_gb': round(usage.used / (1024 ** 3), 1),
                    'free_gb': round(usage.free / (1024 ** 3), 1),
                    'percent': usage.percent
                })
            except Exception:
                pass

        # Network
        net_io = psutil.net_io_counters()
        local_ip = "127.0.0.1"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass

        # Battery
        battery = psutil.sensors_battery()
        bat_percent = battery.percent if battery else 100
        bat_charging = battery.power_plugged if battery else True

        return jsonify({
            'status': 'success',
            'cpu_percent': cpu_percent,
            'ram_percent': mem.percent,
            'ram_used_gb': round(mem.used / (1024 ** 3), 1),
            'ram_total_gb': round(mem.total / (1024 ** 3), 1),
            'swap_percent': swap.percent,
            'drives': drives,
            'ip_address': local_ip,
            'bytes_sent': net_io.bytes_sent,
            'bytes_recv': net_io.bytes_recv,
            'battery_percent': bat_percent,
            'battery_charging': bat_charging,
            'timestamp': time.time()
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Lightweight endpoint for frontend system status monitoring."""
    return jsonify({'status': 'online', 'timestamp': time.time()})

@app.route('/api/history', methods=['GET'])
def get_history():
    """Retrieve full persistent conversation history."""
    return jsonify({'status': 'success', 'history': load_chat_history()})

@app.route('/api/history/clear', methods=['POST', 'DELETE'])
def clear_history():
    """Clear persistent conversation history."""
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f)
        return jsonify({'status': 'success', 'message': 'Memory and chat history cleared successfully.'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/welcome', methods=['GET', 'POST'])
def welcome_greeting():
    """Generate and synthesize dynamic re-entry audio greeting that changes on every launch."""
    welcome_text, title, subtitle = get_time_aware_greeting_details()
    cleanup_old_audio_files()
    unique_id = uuid.uuid4().hex[:8]
    audio_filename = f"welcome_{int(time.time() * 1000)}_{unique_id}.mp3"
    audio_path = os.path.join(AUDIO_DIR, audio_filename)
    
    try:
        asyncio.run(generate_speech_audio(welcome_text, audio_path))
        audio_url = f"/audio/{audio_filename}"
    except Exception as err:
        print(f"[JARVIS BACKEND] Welcome audio error: {err}")
        audio_url = None

    return jsonify({
        'status': 'success',
        'response': welcome_text,
        'title': title,
        'subtitle': subtitle,
        'audio_url': audio_url
    })


@app.route('/api/tts', methods=['POST'])
def synthesize_tts_endpoint():
    """Synthesize custom speech audio on demand for notification alerts, status messages, etc."""
    try:
        data = request.json or {}
        text = (data.get('text') or data.get('prompt') or '').strip()
        if not text:
            return jsonify({'status': 'error', 'message': 'No text provided.'}), 400

        cleanup_old_audio_files()
        unique_id = uuid.uuid4().hex[:8]
        audio_filename = f"tts_{int(time.time() * 1000)}_{unique_id}.mp3"
        audio_path = os.path.join(AUDIO_DIR, audio_filename)

        asyncio.run(generate_speech_audio(text, audio_path))
        audio_url = f"/audio/{audio_filename}"

        return jsonify({
            'status': 'success',
            'text': text,
            'audio_url': audio_url
        })
    except Exception as err:
        print(f"[JARVIS BACKEND] Custom TTS synthesis error: {err}")
        return jsonify({'status': 'error', 'message': str(err)}), 500


@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """Return all active notifications and total unread count."""
    unread_count = sum(1 for n in NOTIFICATIONS if not n.get('read', False))
    return jsonify({
        'status': 'success',
        'notifications': NOTIFICATIONS,
        'unread_count': unread_count
    })


@app.route('/api/notifications/simulate', methods=['POST'])
def simulate_notification():
    """Simulate an incoming message from Instagram, WhatsApp, Email, or System with audio announcement."""
    try:
        data = request.json or {}
        platform = data.get('platform')
        
        candidates = SIMULATION_PRESETS
        if platform:
            filtered = [p for p in SIMULATION_PRESETS if p['platform'].lower() == platform.lower()]
            if filtered:
                candidates = filtered

        preset = random.choice(candidates)
        sender = data.get('sender') or preset['sender']
        message = data.get('message') or preset['message']
        title = data.get('title') or preset['title']
        plat = data.get('platform') or preset['platform']
        url = data.get('url') or preset['url']
        color = data.get('color') or preset['color']
        avatar = preset['avatar']

        notif_id = f"notif-{int(time.time() * 1000)}-{uuid.uuid4().hex[:4]}"
        new_item = {
            'id': notif_id,
            'platform': plat,
            'sender': sender,
            'avatar': avatar,
            'title': title,
            'message': message,
            'time': 'Just now',
            'timestamp': int(time.time() * 1000),
            'read': False,
            'url': url,
            'color': color
        }

        NOTIFICATIONS.insert(0, new_item)
        if len(NOTIFICATIONS) > 50:
            NOTIFICATIONS.pop()

        # Build JARVIS vocal announcement
        speech_text = f"Ma'am, you have a new message from {sender} on {title}: '{message}'"
        
        # Generate speech audio
        audio_url = None
        try:
            cleanup_old_audio_files()
            unique_id = uuid.uuid4().hex[:8]
            audio_filename = f"notif_{int(time.time() * 1000)}_{unique_id}.mp3"
            audio_path = os.path.join(AUDIO_DIR, audio_filename)
            asyncio.run(generate_speech_audio(speech_text, audio_path))
            audio_url = f"/audio/{audio_filename}"
        except Exception as e:
            print(f"[JARVIS BACKEND] Error generating notification speech audio: {e}")

        return jsonify({
            'status': 'success',
            'notification': new_item,
            'speech_text': speech_text,
            'audio_url': audio_url,
            'unread_count': sum(1 for n in NOTIFICATIONS if not n.get('read', False))
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/notifications/read', methods=['POST'])
def mark_notifications_read():
    """Mark a specific notification or all notifications as read."""
    data = request.json or {}
    notif_id = data.get('id')
    platform = data.get('platform')

    if notif_id:
        for n in NOTIFICATIONS:
            if n['id'] == notif_id:
                n['read'] = True
                break
    elif platform:
        for n in NOTIFICATIONS:
            if n.get('platform', '').lower() == platform.lower():
                n['read'] = True
    else:
        for n in NOTIFICATIONS:
            n['read'] = True

    unread_count = sum(1 for n in NOTIFICATIONS if not n.get('read', False))
    return jsonify({
        'status': 'success',
        'unread_count': unread_count
    })


@app.route('/api/notifications/send', methods=['POST'])
def create_custom_notification():
    """Add a custom notification to the HUD queue and return vocal announcement."""
    data = request.json or {}
    platform = data.get('platform', 'system').lower()
    sender = data.get('sender', 'System Alert')
    message = data.get('message', 'New incoming transmission')
    title = data.get('title', platform.title())
    url = data.get('url', '')
    color = data.get('color', '#00f0ff')
    avatar = '📸' if platform == 'instagram' else '✉️' if 'mail' in platform or platform == 'email' else '💬' if platform == 'whatsapp' else '⚡'

    notif_id = f"notif-{int(time.time() * 1000)}"
    new_item = {
        'id': notif_id,
        'platform': platform,
        'sender': sender,
        'avatar': avatar,
        'title': title,
        'message': message,
        'time': 'Just now',
        'timestamp': int(time.time() * 1000),
        'read': False,
        'url': url,
        'color': color
    }
    NOTIFICATIONS.insert(0, new_item)

    speech_text = f"Ma'am, you have a new message from {sender} on {title}: '{message}'"
    audio_url = None
    try:
        cleanup_old_audio_files()
        unique_id = uuid.uuid4().hex[:8]
        audio_filename = f"notif_{int(time.time() * 1000)}_{unique_id}.mp3"
        audio_path = os.path.join(AUDIO_DIR, audio_filename)
        asyncio.run(generate_speech_audio(speech_text, audio_path))
        audio_url = f"/audio/{audio_filename}"
    except Exception as e:
        print(f"[JARVIS BACKEND] Error generating speech: {e}")

    return jsonify({
        'status': 'success',
        'notification': new_item,
        'speech_text': speech_text,
        'audio_url': audio_url,
        'unread_count': sum(1 for n in NOTIFICATIONS if not n.get('read', False))
    })


@app.route('/api/gmail/check', methods=['GET', 'POST'])
def check_gmail_endpoint():
    """Live IMAP check of user's Gmail inbox for new unread messages."""
    result = check_live_gmail_inbox()
    if result.get('status') == 'success':
        emails = result.get('emails', [])
        existing_ids = {n['id'] for n in NOTIFICATIONS}
        new_added = []
        for em in emails:
            if em['id'] not in existing_ids:
                NOTIFICATIONS.insert(0, em)
                new_added.append(em)

        unread_count = sum(1 for n in NOTIFICATIONS if not n.get('read', False))
        return jsonify({
            'status': 'success',
            'unread_gmail_count': result.get('count', 0),
            'new_emails': new_added,
            'notifications': NOTIFICATIONS,
            'unread_count': unread_count
        })
    return jsonify(result)


@app.route('/api/execute', methods=['POST'])
def execute_action():
    """Execute an action payload requested by the frontend (open app, close app, open file, tab controls, typing, etc.).
    This endpoint performs server-side automation on Windows and returns a simple status.
    """
    try:
        data = request.json or {}
        action = data.get('action') or {}
        t = action.get('type')

        if not t:
            return jsonify({'status': 'error', 'message': 'No action type provided.'}), 400

        # OPEN_APP: launch known app key or raw target
        if t == 'OPEN_APP':
            target = action.get('target')
            exe = APPS.get(target, target)
            launch_windows_process(exe)
            return jsonify({'status': 'success', 'message': f'Launched {target}.'})

        # OPEN_URL / OPEN_FILE / OPEN_FOLDER: try to open via shell
        if t in ('OPEN_URL', 'OPEN_FILE', 'OPEN_FOLDER', 'OPEN_NEW_TAB'):
            target = action.get('url') or action.get('target')
            if target:
                launch_windows_process(target)
                return jsonify({'status': 'success', 'message': 'Opened target.'})
            return jsonify({'status': 'error', 'message': 'No target provided.'}), 400

        # CLOSE_CURRENT_TAB / CLOSE_TAB / CLOSE_SITE_TAB: Send Ctrl+W on Windows OS
        if t in ('CLOSE_CURRENT_TAB', 'CLOSE_TAB', 'CLOSE_SITE_TAB'):
            delayed_key_combo(VK_CONTROL, 0x57)  # Ctrl + W
            return jsonify({'status': 'success', 'message': 'Closed active browser tab.'})

        # CLOSE_ALL_TABS: Send Ctrl+Shift+W
        if t == 'CLOSE_ALL_TABS':
            delayed_key_combo(VK_CONTROL, VK_SHIFT, 0x57)
            return jsonify({'status': 'success', 'message': 'Closed all browser tabs.'})

        # SWITCH_NEXT_TAB / SWITCH_PREV_TAB / REOPEN_TAB
        if t == 'SWITCH_NEXT_TAB':
            delayed_key_combo(VK_CONTROL, VK_TAB)
            return jsonify({'status': 'success', 'message': 'Switched to next tab.'})
        if t == 'SWITCH_PREV_TAB':
            delayed_key_combo(VK_CONTROL, VK_SHIFT, VK_TAB)
            return jsonify({'status': 'success', 'message': 'Switched to previous tab.'})
        if t == 'REOPEN_TAB':
            delayed_key_combo(VK_CONTROL, VK_SHIFT, 0x54)
            return jsonify({'status': 'success', 'message': 'Reopened last tab.'})

        # TYPE_TEXT: simulate Unicode typing
        if t == 'TYPE_TEXT':
            text = action.get('text', '')
            enter = action.get('enter', False)
            if text:
                simulate_typing(text, press_enter_after=enter)
                return jsonify({'status': 'success', 'message': f'Typed: {text}'})
            return jsonify({'status': 'error', 'message': 'No text provided.'}), 400

        # PRESS_KEY: virtual key press / combos
        if t == 'PRESS_KEY':
            k = action.get('key', '')
            if k == 'Enter': delayed_key_press(VK_RETURN)
            elif k == 'Backspace': delayed_key_press(VK_BACK)
            elif k == 'Ctrl+A': delayed_key_combo(VK_CONTROL, 0x41)
            elif k == 'Ctrl+C': delayed_key_combo(VK_CONTROL, 0x43)
            elif k == 'Ctrl+V': delayed_key_combo(VK_CONTROL, 0x56)
            elif k == 'Ctrl+Z': delayed_key_combo(VK_CONTROL, 0x5A)
            return jsonify({'status': 'success', 'message': f'Simulated key: {k}'})

        # SCROLL_DOWN / SCROLL_UP / SCROLL_TOP / SCROLL_BOTTOM
        if t == 'SCROLL_DOWN':
            simulate_mouse_scroll(delta_y=-720, ticks=6)
            return jsonify({'status': 'success', 'message': 'Scrolled down.'})
        if t == 'SCROLL_UP':
            simulate_mouse_scroll(delta_y=720, ticks=6)
            return jsonify({'status': 'success', 'message': 'Scrolled up.'})
        if t == 'SCROLL_TOP':
            simulate_mouse_scroll(delta_y=2500, ticks=8)
            delayed_key_press(VK_HOME)
            return jsonify({'status': 'success', 'message': 'Scrolled to top.'})
        if t == 'SCROLL_BOTTOM':
            simulate_mouse_scroll(delta_y=-2500, ticks=8)
            delayed_key_press(VK_END)
            return jsonify({'status': 'success', 'message': 'Scrolled to bottom.'})

        # UNLOCK_SCREEN / LOCK_SCREEN
        if t == 'UNLOCK_SCREEN':
            unlock_windows_screen("2006")
            return jsonify({'status': 'success', 'message': 'Unlocking laptop screen with PIN 2006.'})
        if t == 'LOCK_SCREEN':
            os.system("rundll32.exe user32.dll,LockWorkStation")
            return jsonify({'status': 'success', 'message': 'Locked screen.'})

        # MEDIA_CONTROL: media playback
        if t == 'MEDIA_CONTROL':
            cmd = action.get('command')
            if cmd == 'play_pause': delayed_key_press(VK_MEDIA_PLAY_PAUSE)
            elif cmd == 'next': delayed_key_press(VK_MEDIA_NEXT_TRACK)
            elif cmd == 'prev': delayed_key_press(VK_MEDIA_PREV_TRACK)
            elif cmd == 'stop': delayed_key_press(VK_MEDIA_STOP)
            return jsonify({'status': 'success', 'message': f'Media command {cmd} executed.'})

        # CLOSE_APP: taskkill by process name
        if t == 'CLOSE_APP':
            target = action.get('target')
            if target:
                try:
                    subprocess.run(f"taskkill /f /im {target}", shell=True, capture_output=True)
                except Exception:
                    pass
                return jsonify({'status': 'success', 'message': f'Attempted to close {target}.'})
            return jsonify({'status': 'error', 'message': 'No target provided.'}), 400

        # CLOSE_WINDOW: close browsers
        if t == 'CLOSE_WINDOW':
            for b in ['chrome.exe', 'msedge.exe', 'firefox.exe', 'brave.exe']:
                try:
                    subprocess.run(f"taskkill /f /im {b}", shell=True, capture_output=True)
                except Exception:
                    pass
            return jsonify({'status': 'success', 'message': 'Closed browser processes.'})

        # CLOSE_JARVIS: attempt graceful exit
        if t == 'CLOSE_JARVIS':
            threading.Thread(target=lambda: os._exit(0), daemon=True).start()
            return jsonify({'status': 'success', 'message': 'Shutting down server.'})

        return jsonify({'status': 'error', 'message': 'Unknown action type.'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/audio/<filename>')
def serve_audio(filename):
    response = send_from_directory(AUDIO_DIR, filename)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/')
def serve_index():
    if os.path.exists(os.path.join(FRONTEND_BUILD_DIR, 'index.html')):
        return send_from_directory(FRONTEND_BUILD_DIR, 'index.html')
    return jsonify({'status': 'online', 'message': 'JARVIS Backend Running. Run npm run build in front-end to compile web interface.'})

@app.route('/<path:path>')
def serve_frontend_assets(path):
    if path.startswith('audio/'):
        return serve_audio(path.replace('audio/', ''))
    if os.path.exists(os.path.join(FRONTEND_BUILD_DIR, path)):
        return send_from_directory(FRONTEND_BUILD_DIR, path)
    if os.path.exists(os.path.join(FRONTEND_BUILD_DIR, 'index.html')):
        return send_from_directory(FRONTEND_BUILD_DIR, 'index.html')
    return jsonify({'error': 'Not found'}), 404

if __name__ == '__main__':
    print("=" * 70)
    print("[JARVIS SERVER] ████████████████████████████████████████████████")
    print("[JARVIS SERVER]  BILLION-DOLLAR JARVIS AI — ALL SYSTEMS ONLINE")
    print("[JARVIS SERVER] ████████████████████████████████████████████████")
    print(f"[JARVIS SERVER] Backend: http://localhost:5000")
    print(f"[JARVIS SERVER] Groq LLM Engine: Active (llama-3.1-8b-instant + 70b fallback)")
    print(f"[JARVIS SERVER] TTS Voice Engine: Active (en-US-ChristopherNeural)")
    print(f"[JARVIS SERVER] System Automation: Active ({len(WEBSITES)} websites + {len(APPS)} apps)")
    print(f"[JARVIS SERVER] Features: Open ANY website/app, search Google/YouTube,")
    print(f"[JARVIS SERVER]           weather, reminders, volume, lock, screenshot,")
    print(f"[JARVIS SERVER]           shutdown/restart, Wi-Fi toggle, battery, IP")
    print("=" * 70)
    app.run(host='0.0.0.0', port=5000, debug=True)
