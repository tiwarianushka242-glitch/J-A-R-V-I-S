@echo off
title JARVIS Setup - Create virtualenv & install deps
cd /d "%~dp0"
echo ============================================================
echo               JARVIS - ENVIRONMENT SETUP
echo ============================================================

:: Create virtual environment
echo Creating virtual environment in .venv...
python -m venv .venv

:: Activate and install Python deps
echo Activating virtual environment and upgrading pip...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
if exist requirements.txt (
  echo Installing Python dependencies from requirements.txt...
  pip install -r requirements.txt
) else (
  echo requirements.txt not found in project root.
)

:: Install frontend deps if present
if exist front-end\package.json (
  echo Installing front-end dependencies (npm install)...
  pushd front-end
  npm install
  popd
)

echo.
echo ============================================================
echo Setup complete. To start JARVIS run: START_JARVIS.bat
echo ============================================================
pause
