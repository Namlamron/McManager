@echo off
title McManager - View Logs
color 0E

echo.
echo ========================================
echo        McManager - Live Logs
echo ========================================
echo.
echo Press Ctrl+C to stop viewing logs
echo (Server will keep running)
echo.

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    pm2 logs
) else (
    echo PM2 not detected.
    echo.
    echo If running in simple mode, check the server window.
    echo.
    pause
)
