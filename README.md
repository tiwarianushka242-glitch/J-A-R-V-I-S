<<<<<<< HEAD
**Project Jarvis — Run & Setup Guide**

- **Python venv**: Create and activate a virtual environment in project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

- **Install Python deps**:

```powershell
pip install -r requirements.txt
```

- **Frontend dependencies** (run inside `front-end`):

```powershell
cd front-end
npm install
```

- **Run everything (recommended)**: use the launcher which starts backend and frontend and opens the UI on `http://localhost:3000`:

```powershell
.\START_JARVIS.bat
```

- **Manual run (alternate)**:
  - Start backend: `.venv\Scripts\python.exe backend\app.py` (serves on port 5000)
  - Start frontend dev server: `cd front-end && npm start` (runs on port 3000)

- **Build frontend for production**:

```powershell
cd front-end
npm run build
```

- **Common troubleshooting**:
  - If Flask says `ModuleNotFoundError`, ensure venv is activated and `pip install -r requirements.txt` completed.
  - If browser opens duplicate tabs when issuing `open <site>` commands, restart both servers after pulling latest changes (backend now returns `OPEN_URL` actions and frontend opens a single tracked tab).
  - Microphone permissions: use Chrome/Edge and allow site microphone access for the Web Speech API.

- **Files changed by me**:
  - `backend/app.py` — fixed indentation, changed website open handling, added `/api/execute` endpoint.
  - `front-end/src/App.js` — tracks opened tabs and posts execute actions to backend.
  - `START_JARVIS.bat` — now also starts the React dev server and opens `http://localhost:3000`.
  - `requirements.txt` — created/updated.

If you want, I can add a `Makefile` or PowerShell script to automate venv creation and full setup.

One-Click Setup
----------------

- Windows (single step): run `setup_env.bat` from project root. This will create a `.venv`, install Python dependencies from `requirements.txt`, and run `npm install` inside `front-end` if present.

```powershell
.\setup_env.bat
```

- PowerShell alternative:

```powershell
.\setup_env.ps1
```

After setup completes, start Jarvis with `START_JARVIS.bat`.
=======
# J-A-R-V-I-S
>>>>>>> origin/main
