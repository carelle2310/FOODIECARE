@echo off
REM FoodieCare AI System - Quick Start Script (Windows)
REM Usage: quickstart.bat

echo.
echo 🚀 FoodieCare AI System - Quick Start
echo ======================================
echo.

REM Check Node.js
echo 1️⃣  Checking Node.js version...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%A in ('node --version') do (
    echo ✅ Node.js %%A installed
)
echo.

REM Install dependencies
echo 2️⃣  Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Verify setup
echo 3️⃣  Verifying setup...
node lib\backend\verify-setup.js
echo.

REM Check nutrition data
echo 4️⃣  Checking nutrition data...
if exist "nutrition.csv" (
    for /f %%A in ('find /c /v "" ^< nutrition.csv') do (
        echo ✅ Nutrition CSV found (%%A lines^)
    )
) else (
    echo ⚠️  nutrition.csv not found - system will still work
)
echo.

REM Summary
echo ======================================
echo ✅ Setup Complete!
echo.
echo Next steps:
echo 1. Run: npm run dev
echo 2. Open: http://localhost:3000
echo 3. Upload a food image
echo 4. See AI prediction ^+ nutrition
echo.
echo Documentation:
echo - Quick Start: QUICK_REFERENCE.md
echo - Setup Help: SETUP.md
echo - Architecture: AI_SYSTEM_GUIDE.md
echo.
echo Happy analyzing! 🍕📊
echo.
pause
