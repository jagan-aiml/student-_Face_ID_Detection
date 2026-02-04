@echo off
title Blockchain Attendance System - Backend Server

echo.
echo ========================================
echo  Smart Attendance System - Backend
echo ========================================
echo.

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Installing/Updating dependencies...
pip install -r requirements.txt

echo.
echo Initializing system (first time setup)...
python backend/init_system.py

echo.
echo Starting FastAPI backend server...
echo Backend will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.

cd backend
python -m uvicorn main:app --reload --port 8000

pause
