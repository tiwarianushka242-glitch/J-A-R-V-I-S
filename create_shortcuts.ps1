$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$projDir = (Get-Location).Path

# 1. Create JARVIS AI Desktop App Shortcut
$s = $ws.CreateShortcut("$desktop\JARVIS AI.lnk")
$s.TargetPath = "wscript.exe"
$s.Arguments = "`"$projDir\JARVIS_SILENT_LAUNCHER.vbs`""
$s.WorkingDirectory = $projDir
$s.Description = "Launch JARVIS AI Desktop Application"
$s.IconLocation = "imageres.dll,78"
$s.Save()

# 2. Create STOP JARVIS Shortcut
$s2 = $ws.CreateShortcut("$desktop\STOP JARVIS.lnk")
$s2.TargetPath = "$projDir\STOP_JARVIS.bat"
$s2.WorkingDirectory = $projDir
$s2.Description = "Stop JARVIS AI Assistant"
$s2.IconLocation = "imageres.dll,98"
$s2.Save()

Write-Output "SUCCESS: Created JARVIS AI and STOP JARVIS shortcuts on your Desktop!"
