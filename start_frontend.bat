@echo off
title Blockchain Attendance System - Frontend Server

echo.
echo ========================================
echo  Smart Attendance System - Frontend
echo ========================================
echo.

echo Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Checking npm installation...
npm --version
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Installing/Updating frontend dependencies...
cd frontend
npm install

echo.
echo Starting React development server...
echo Frontend will be available at: http://localhost:3000
echo.
echo IMPORTANT: Make sure the backend server is running on port 8000
echo Backend URL: http://localhost:8000
echo.

npm start

pause
