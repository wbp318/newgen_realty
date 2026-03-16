@echo off
title NewGen Realty - Stopping
echo Stopping NewGen Realty...

:: Kill processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Done. Ports 3000 and 8000 are free.
timeout /t 2 /nobreak >nul
