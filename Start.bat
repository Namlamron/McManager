@echo off
title McManager
color 0A
cls

:start_loop
echo ========================================
echo     McManager - Starting Server
echo ========================================
echo.

echo Checking for updates...
git pull
echo.

echo Checking dependencies...
call npm install
echo.

echo Web Interface: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js

if %errorlevel% equ 42 (
    echo.
    echo Restarting McManager...
    timeout /t 2 >nul
    cls
    goto start_loop
)

pause
