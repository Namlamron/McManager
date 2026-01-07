@echo off
echo ========================================
echo McManager Update Script
echo ========================================
echo.

echo [1/4] Pulling latest changes from Git...
git pull origin main
if %errorlevel% neq 0 (
    echo ERROR: Git pull failed!
    echo Please resolve any conflicts manually.
    pause
    exit /b 1
)
echo.

echo [2/4] Installing/updating dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo.

echo [3/4] Checking for PM2...
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo PM2 detected. Restarting McManager...
    pm2 restart mcmanager
    if %errorlevel% neq 0 (
        echo PM2 restart failed. Starting fresh...
        pm2 start server.js --name mcmanager
    )
) else (
    echo PM2 not detected. Skipping automatic restart.
    echo Please restart the server manually.
)
echo.

echo [4/4] Update complete!
echo ========================================
echo.
echo If you're not using PM2, restart the server with:
echo   npm start
echo   or
echo   Start.bat
echo.
pause
