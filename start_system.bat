@echo off
title Blockchain Attendance System - Complete Setup

echo.
echo =====================================================
echo  🎯 BLOCKCHAIN ATTENDANCE SYSTEM - FULL STARTUP
echo =====================================================
echo.

echo Welcome to the Smart Attendance System!
echo This will start both backend and frontend servers.
echo.

echo Checking system requirements...
echo.

:: Check Python
python --version > nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
) else (
    echo ✅ Python is installed
)

:: Check Node.js
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 14+ and try again
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
)

:: Check npm
npm --version > nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
) else (
    echo ✅ npm is installed
)

echo.
echo 📦 Installing dependencies...

:: Install Python dependencies
echo Installing Python packages...
pip install -r requirements.txt

:: Install frontend dependencies
echo Installing frontend packages...
cd frontend
npm install
cd ..

echo.
echo 🔧 Initializing system...
python backend/init_system.py

echo.
echo 🚀 Starting servers...
echo.
echo This will open two command windows:
echo   1. Backend API Server (Port 8000)
echo   2. Frontend React Server (Port 3000)
echo.

pause

:: Start backend in new window
start "Backend Server" cmd /k "echo Starting Backend... && cd backend && python -m uvicorn main:app --reload --port 8000"

:: Wait a moment for backend to start
timeout /t 5 /nobreak > nul

:: Start frontend in new window
start "Frontend Server" cmd /k "echo Starting Frontend... && cd frontend && npm start"

echo.
echo 🎉 System startup initiated!
echo.
echo 📌 Access Points:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo 🔐 Default Credentials:
echo    Admin:      admin/password
echo    Department: CS/password (or IT, ECE, ME)
echo    Student:    20CS001/student123
echo.
echo Press any key to exit this window...

pause > nul
