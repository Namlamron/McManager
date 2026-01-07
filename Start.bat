@echo off
title McManager - Starting...
color 0A

echo.
echo ========================================
echo        McManager - Minecraft Server
echo              Management Tool
echo ========================================
echo.

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    goto :pm2_mode
) else (
    goto :simple_mode
)

:pm2_mode
echo [PM2 Detected] Starting in production mode...
echo.
echo This will start:
echo   - McManager Server
echo   - Auto-Update Service
echo.

REM Check if already running
pm2 list | findstr "mcmanager" >nul 2>nul
if %errorlevel% equ 0 (
    echo McManager is already running!
    echo.
    choice /C RS /N /M "Choose: [R]estart or [S]how status? "
    if errorlevel 2 goto :show_status
    if errorlevel 1 goto :restart_pm2
) else (
    goto :start_pm2
)

:start_pm2
echo Starting McManager with PM2...
pm2 start scripts/ecosystem.config.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start with PM2!
    pause
    exit /b 1
)

echo.
echo Saving PM2 configuration...
pm2 save >nul 2>nul

echo.
echo ========================================
echo   McManager Started Successfully!
echo ========================================
echo.
echo Web Interface: http://localhost:3000
echo.
echo Useful Commands:
echo   pm2 status      - View running processes
echo   pm2 logs        - View live logs
echo   pm2 restart all - Restart all services
echo   pm2 stop all    - Stop all services
echo.
echo Auto-updates are ENABLED!
echo Push to Git and your server will update automatically.
echo.
pause
exit /b 0

:restart_pm2
echo.
echo Restarting McManager...
pm2 restart all
echo.
echo ========================================
echo   McManager Restarted!
echo ========================================
echo.
goto :show_status

:show_status
echo.
pm2 status
echo.
echo View logs: pm2 logs
echo.
pause
exit /b 0

:simple_mode
echo [Simple Mode] Starting without PM2...
echo.
echo TIP: Install PM2 for production features:
echo   - Auto-restart on crashes
echo   - Auto-updates from Git
echo   - Better log management
echo.
echo Install with: npm install -g pm2
echo Then run this script again!
echo.
echo ========================================
echo   Starting McManager Server...
echo ========================================
echo.
echo Web Interface: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

node server.js

REM If we get here, server stopped
echo.
echo Server stopped.
pause
exit /b 0