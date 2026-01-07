@echo off
title McManager - Standalone Installer
color 0B

echo.
echo ========================================
echo   McManager - Standalone Installer
echo ========================================
echo.
echo This installer will:
echo   1. Clone the McManager repository
echo   2. Install all dependencies
echo   3. Set up PM2 (optional)
echo   4. Configure the application
echo   5. Start the server
echo.

REM ===== Configuration =====
set REPO_URL=https://github.com/Namlamron/McManager.git
set INSTALL_DIR=McManager

echo Installation directory: %cd%\%INSTALL_DIR%
echo.
pause

REM ===== Check Prerequisites =====
echo.
echo [1/6] Checking prerequisites...
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version and run this installer again.
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js found: 
node --version

REM Check Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed!
    echo.
    echo Git is required to clone the repository.
    echo Download from: https://git-scm.com/
    echo.
    pause
    exit /b 1
)
echo [OK] Git found:
git --version

echo.
echo Prerequisites check passed!

REM ===== Clone Repository =====
echo.
echo [2/6] Cloning McManager repository...
echo.

if exist "%INSTALL_DIR%" (
    echo WARNING: Directory '%INSTALL_DIR%' already exists!
    echo.
    choice /C YN /N /M "Delete and reinstall? [Y/N] "
    if errorlevel 2 (
        echo Installation cancelled.
        pause
        exit /b 1
    )
    echo Removing old installation...
    rmdir /s /q "%INSTALL_DIR%"
)

echo Cloning from: %REPO_URL%
git clone %REPO_URL% %INSTALL_DIR%

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to clone repository!
    echo.
    echo Please check:
    echo   - The repository URL is correct
    echo   - You have access to the repository
    echo   - Your internet connection is working
    echo.
    pause
    exit /b 1
)

echo Repository cloned successfully!

REM Change to installation directory
cd %INSTALL_DIR%

REM ===== Install Dependencies =====
echo.
echo [3/6] Installing dependencies...
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

echo Dependencies installed successfully!

REM ===== Install PM2 =====
echo.
echo [4/6] PM2 Process Manager (Recommended)
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
    choice /C YN /N /M "Install PM2 globally? [Y/N] "
    if errorlevel 2 (
        echo Skipping PM2 installation.
    ) else (
        echo Installing PM2...
        call npm install -g pm2
        if %errorlevel% neq 0 (
            echo WARNING: Failed to install PM2.
            echo You can install it later with: npm install -g pm2
        ) else (
            echo PM2 installed successfully!
        )
    )
)

REM ===== Configure Environment =====
echo.
echo [5/6] Configuring environment...
echo.

if exist .env.example (
    copy .env.example .env >nul
    echo .env file created from template.
    echo You can edit .env to customize settings.
) else (
    echo WARNING: .env.example not found, skipping .env creation.
)

REM ===== Start Server =====
echo.
echo [6/6] Starting McManager...
echo.

choice /C YN /N /M "Start McManager now? [Y/N] "
if errorlevel 2 (
    goto :skip_start
)

echo.
echo Starting server...
call Start.bat

:skip_start

REM ===== Installation Complete =====
echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Installation location: %cd%
echo.
echo To start McManager:
echo   1. Navigate to: %cd%
echo   2. Run: Start.bat
echo.
echo To access the web interface:
echo   http://localhost:3000
echo.
echo Documentation:
echo   - README.md
echo   - docs\DEPLOYMENT.md
echo   - docs\QUICK-REFERENCE.md
echo.

where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo PM2 is installed! Your server will:
    echo   - Auto-restart on crashes
    echo   - Auto-update when you push to Git
    echo.
    echo Useful commands:
    echo   pm2 status      - View running processes
    echo   pm2 logs        - View live logs
    echo   pm2 stop all    - Stop all services
    echo.
)

echo.
pause
