@echo off
title McManager - Minecraft Server Manager
color 0A

cls
echo.
echo ========================================
echo     McManager - Starting Server
echo ========================================
echo.

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo PM2 not found. Installing PM2...
    echo.
    call npm install -g pm2
    if %errorlevel% neq 0 (
        echo.
        echo Failed to install PM2. Starting in simple mode...
        echo.
        goto :simple_mode
    )
)

REM Check if already running
call pm2 list | findstr "mcmanager" >nul 2>nul
if %errorlevel% equ 0 (
    echo McManager is already running!
    echo.
    echo Restarting and showing logs...
    call pm2 restart all
    timeout /t 2 >nul
    goto :show_logs
)

REM Start with PM2
echo Starting with PM2 (auto-updates enabled)...
echo.
call pm2 start scripts/ecosystem.config.js
if %errorlevel% neq 0 (
    echo.
    echo PM2 start failed. Trying simple mode...
    goto :simple_mode
)

call pm2 save >nul 2>nul

echo.
echo ========================================
echo   Server Started Successfully!
echo ========================================
echo.
echo Web Interface: http://localhost:3000
echo.
echo Features:
echo   - Auto-restart on crash
echo   - Auto-update when you push to Git
echo.
echo ========================================
echo   Showing Live Logs...
echo ========================================
echo.
echo Press Ctrl+C to stop viewing logs
echo (Server will keep running in background)
echo.
timeout /t 2 >nul

:show_logs
REM Show logs - keeps window open
call pm2 logs

REM If user stops logs
echo.
echo Logs stopped. Server is still running.
echo.
echo Commands:
echo   pm2 logs        - View logs again
echo   pm2 status      - Check status
echo   pm2 stop all    - Stop server
echo.
pause
exit /b 0

:simple_mode
echo.
echo ========================================
echo   Starting in Simple Mode
echo ========================================
echo.
echo Web Interface: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

node server.js

echo.
echo Server stopped.
pause
exit /b 0
