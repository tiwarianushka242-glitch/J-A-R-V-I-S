@echo off
setlocal enabledelayedexpansion
title JARVIS AI Assistant Launcher
cd /d "%~dp0"

echo ============================================================
echo           STARTING JARVIS AI DESKTOP APPLICATION
echo ============================================================
echo.

set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"

:: 1. Check if backend port 5000 is already running
netstat -ano | findstr :5000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    if exist "%PYTHON_EXE%" (
        echo [*] Starting JARVIS AI Backend Server...
        start "JARVIS Backend Server" /min "%PYTHON_EXE%" "%~dp0backend\app.py"
    ) else (
        echo [!] Python backend virtualenv not found; starting web app only.
    )
) else (
    echo [*] JARVIS Backend is already running on port 5000.
)

:: 2. Check if frontend port 3000 is already running
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [*] Starting JARVIS UI Dev Server...
    start "JARVIS Web App" /min cmd /c "cd /d "%~dp0front-end" && set BROWSER=none && npm.cmd start"
    echo [*] Initializing system modules...
    ping 127.0.0.1 -n 6 >nul
) else (
    echo [*] JARVIS Frontend is already active on port 3000.
    ping 127.0.0.1 -n 2 >nul
)

:: 3. Launch as Standalone Native Desktop App Window (No browser URL bar or tabs)
echo [*] Launching JARVIS Native Desktop Window...

set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "!CHROME_PATH!" set "CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "!CHROME_PATH!" set "CHROME_PATH=%LocalAppData%\Google\Chrome\Application\chrome.exe"

set "EDGE_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "!EDGE_PATH!" set "EDGE_PATH=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if exist "!CHROME_PATH!" (
    start "" "!CHROME_PATH!" --app=http://localhost:3000 --start-maximized
) else if exist "!EDGE_PATH!" (
    start "" "!EDGE_PATH!" --app=http://localhost:3000 --start-maximized
) else (
    start "" http://localhost:3000
)

echo.
echo [SUCCESS] JARVIS AI Desktop App is now active!
echo ============================================================
ping 127.0.0.1 -n 3 >nul
exit
