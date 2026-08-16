@echo off
title JARVIS 1-Click Desktop App Shortcut Creator
color 0B
echo ============================================================
echo          CREATING JARVIS 1-CLICK DESKTOP APP SHORTCUT
echo ============================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "SILENT_TARGET=%SCRIPT_DIR%JARVIS_SILENT_LAUNCHER.vbs"
set "STOP_TARGET=%SCRIPT_DIR%STOP_JARVIS.bat"

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$s = $ws.CreateShortcut(\"$desktop\JARVIS AI.lnk\"); " ^
  "$s.TargetPath = 'wscript.exe'; " ^
  "$s.Arguments = '\"%SILENT_TARGET%\"'; " ^
  "$s.WorkingDirectory = '%SCRIPT_DIR%'; " ^
  "$s.Description = 'Launch JARVIS AI Desktop Application'; " ^
  "$s.IconLocation = 'imageres.dll,78'; " ^
  "$s.Save(); " ^
  "$s2 = $ws.CreateShortcut(\"$desktop\STOP JARVIS.lnk\"); " ^
  "$s2.TargetPath = '%STOP_TARGET%'; " ^
  "$s2.WorkingDirectory = '%SCRIPT_DIR%'; " ^
  "$s2.Description = 'Stop JARVIS AI Assistant'; " ^
  "$s2.IconLocation = 'imageres.dll,98'; " ^
  "$s2.Save();"

echo.
echo [SUCCESS] Desktop application shortcuts created:
echo   - 'JARVIS AI' on your Desktop (Double-click to open JARVIS like an App!)
echo   - 'STOP JARVIS' on your Desktop (Double-click to close all background servers)
echo.
echo ============================================================
pause
