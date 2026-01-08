@echo off
title McManager - Standalone Installer
color 0B

echo.
echo ========================================
echo   McManager - Standalone Installer
echo ========================================
echo.
echo This installer will:
echo   1. Check prerequisites (Node.js ^& Git)
echo   2. Clone the McManager repository
echo   3. Install dependencies
echo   4. Configure environment
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
echo [1/5] Checking prerequisites...
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
echo [2/5] Cloning McManager repository...
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

echo Dependencies installed successfully!



REM ===== Configure Environment =====
echo.
echo [4/5] Configuring environment...
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
echo [5/5] Starting McManager...
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



echo.
pause
