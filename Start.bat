@echo off
title McManager
color 0A
cls

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

pause
