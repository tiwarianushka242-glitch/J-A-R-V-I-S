#!/usr/bin/env pwsh
# Uses the existing Python 3.12 installation. It does not install Python.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Definition)

if (-not (Get-Command py.exe -ErrorAction SilentlyContinue)) {
    throw 'Python 3.12 is not available through the Python launcher.'
}

if (-not (Test-Path '.venv\Scripts\python.exe')) {
    Write-Output 'Creating the Python 3.12 virtual environment...'
    & py.exe -3.12 -m venv .venv
}

$python = Join-Path $PWD '.venv\Scripts\python.exe'
& $python -m pip install -r requirements.txt

if (-not (Test-Path 'front-end\node_modules')) {
    Push-Location front-end
    & npm.cmd install
    Pop-Location
}

Write-Output 'Ready. Run .\START_JARVIS.bat to open http://localhost:3000.'
