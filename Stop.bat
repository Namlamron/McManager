@echo off
title McManager - Stop Services
color 0C

echo.
echo ========================================
echo     Stopping McManager Services
echo ========================================
echo.

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo Stopping PM2 services...
    pm2 stop all
    echo.
    echo Services stopped.
    echo.
    echo To completely remove from PM2:
    echo   pm2 delete all
) else (
    echo PM2 not detected.
    echo.
    echo If running in simple mode, press Ctrl+C in the server window.
)

echo.
pause
