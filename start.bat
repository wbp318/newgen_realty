@echo off
title NewGen Realty AI - Launcher
echo ================================
echo   NewGen Realty AI - Launcher
echo   LA / AR / MS
echo ================================
echo.

:: Check if Python is installed
where python >nul 2>&1 || (
    echo ERROR: Python is not installed or not in PATH.
    echo Download from https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check if Node is installed
where node >nul 2>&1 || (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Download from https://nodejs.org/
    pause
    exit /b 1
)

:: Kill any zombie processes on port 3000
echo Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo   Killing leftover process on port 3000 (PID %%a)
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill any zombie processes on port 8000
echo Clearing port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo   Killing leftover process on port 8000 (PID %%a)
    taskkill /F /PID %%a >nul 2>&1
)

:: Clean stale Next.js cache
echo Cleaning Next.js cache...
if exist "%~dp0frontend\.next\dev\lock" del /f "%~dp0frontend\.next\dev\lock" >nul 2>&1
rmdir /s /q "%~dp0frontend\.next" >nul 2>&1

:: Check if backend venv exists
if not exist "%~dp0backend\venv\Scripts\activate.bat" (
    echo.
    echo Setting up backend virtual environment...
    cd /d "%~dp0backend"
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd /d "%~dp0"
)

:: Check if .env exists
if not exist "%~dp0backend\.env" (
    echo.
    echo ERROR: backend\.env not found!
    echo Run: copy backend\.env.example backend\.env
    echo Then add your ANTHROPIC_API_KEY to the file.
    pause
    exit /b 1
)

:: Check if frontend node_modules exist
if not exist "%~dp0frontend\node_modules" (
    echo.
    echo Installing frontend dependencies...
    cd /d "%~dp0frontend"
    npm install
    cd /d "%~dp0"
)

timeout /t 2 /nobreak >nul

:: Start backend
echo.
echo Starting backend on http://localhost:8000 ...
cd /d "%~dp0backend"
start "NewGen Backend" cmd /k "call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000 --no-server-header"

:: Give backend a moment to boot
timeout /t 3 /nobreak >nul

:: Start frontend
echo Starting frontend on http://localhost:3000 ...
cd /d "%~dp0frontend"
start "NewGen Frontend" cmd /k "npm run dev"

:: Wait for frontend to be ready
timeout /t 6 /nobreak >nul

:: Open browser
start http://localhost:3000

echo.
echo ================================
echo   Both servers are running!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ================================
echo.
echo Close the "NewGen Backend" and "NewGen Frontend" windows to stop.
echo Or run stop.bat to kill both.
pause
