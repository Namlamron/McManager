@echo off
title McManager - Installation
color 0B

echo.
echo ========================================
echo     McManager Installation Script
echo ========================================
echo.
echo This script will:
echo   1. Check prerequisites (Node.js, Git)
echo   2. Install dependencies
echo   3. Install PM2 (optional)
echo   4. Configure environment
echo   5. Set up auto-start (optional)
echo.
pause

REM ===== Check Node.js =====
echo.
echo [1/5] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version and run this script again.
    echo.
    pause
    exit /b 1
)

node --version
echo Node.js found!

REM ===== Check Git =====
echo.
echo [2/5] Checking Git...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Git is not installed!
    echo Git is required for auto-updates.
    echo.
    echo Download from: https://git-scm.com/
    echo.
    choice /C YN /N /M "Continue without Git? [Y/N] "
    if errorlevel 2 exit /b 1
) else (
    git --version
    echo Git found!
)

REM ===== Install Dependencies =====
echo.
echo [3/5] Installing dependencies...
echo This may take a few minutes...
echo.

call npm install
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies!
    echo.
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!

REM ===== Install PM2 =====
echo.
echo [4/5] PM2 Process Manager (Recommended for production)
echo.
echo PM2 provides:
echo   - Auto-restart on crashes
echo   - Auto-updates from Git
echo   - Log management
echo   - Start on boot
echo.

where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo PM2 is already installed!
    pm2 --version
) else (
    choice /C YN /N /M "Install PM2? [Y/N] "
    if errorlevel 2 (
        echo Skipping PM2 installation.
        echo You can install it later with: npm install -g pm2
    ) else (
        echo Installing PM2...
        call npm install -g pm2
        if %errorlevel% neq 0 (
            echo WARNING: Failed to install PM2.
            echo You can try manually: npm install -g pm2
        ) else (
            echo PM2 installed successfully!
        )
    )
)

REM ===== Configure Environment =====
echo.
echo [5/5] Environment Configuration
echo.

if exist .env (
    echo .env file already exists.
) else (
    if exist .env.example (
        choice /C YN /N /M "Create .env file from template? [Y/N] "
        if errorlevel 1 (
            copy .env.example .env >nul
            echo .env file created!
            echo.
            echo You can edit .env to customize:
            echo   - Server port (default: 3000)
            echo   - Environment mode
            echo   - Other settings
        )
    )
)

REM ===== Setup Complete =====
echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Next steps:
echo.

where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo 1. Start McManager:
    echo      Start.bat
    echo.
    echo 2. Access web interface:
    echo      http://localhost:3000
    echo.
    echo 3. (Optional) Set up auto-start on boot:
    echo      pm2 startup
    echo.
    echo Your server will auto-update when you push to Git!
) else (
    echo 1. Start McManager:
    echo      Start.bat
    echo.
    echo 2. Access web interface:
    echo      http://localhost:3000
    echo.
    echo 3. (Optional) Install PM2 for auto-updates:
    echo      npm install -g pm2
    echo      Then run Start.bat again
)

echo.
echo For more information, see:
echo   - README.md
echo   - docs\DEPLOYMENT.md
echo   - docs\QUICK-REFERENCE.md
echo.
pause
