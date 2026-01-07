@echo off
title McManager Logs
color 0A
echo.
echo ========================================
echo     McManager - Live Logs
echo ========================================
echo.
echo Press Ctrl+C to exit log view (Server keeps running)
echo.
call pm2 logs
pause
