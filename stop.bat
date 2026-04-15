@echo off
title NewGen Realty AI - Stopping
echo Stopping NewGen Realty AI...

:: Kill processes on port 3000 (frontend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo   Stopping frontend (PID %%a)
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes on port 8000 (backend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo   Stopping backend (PID %%a)
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Done. Ports 3000 and 8000 are free.
timeout /t 2 /nobreak >nul
