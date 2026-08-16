@echo off
title JARVIS Clean Shutdown
color 0C
echo ============================================================
echo               SHUTTING DOWN JARVIS AI SYSTEM             
echo ============================================================
echo.

echo Stopping JARVIS Server processes...
taskkill /f /t /fi "WINDOWTITLE eq JARVIS Backend Server*" >nul 2>&1
taskkill /f /t /fi "WINDOWTITLE eq JARVIS AI Assistant*" >nul 2>&1
taskkill /f /t /fi "WINDOWTITLE eq JARVIS Web App*" >nul 2>&1

:: Cleanly terminate any lingering processes bound to port 5000 and port 3000
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000,3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo.
echo ============================================================
echo           JARVIS SYSTEM SAFELY SHUT DOWN
echo ============================================================
ping 127.0.0.1 -n 3 >nul
exit
