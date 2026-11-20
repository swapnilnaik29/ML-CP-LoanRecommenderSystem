@echo off
title LoanIQ Runner
color 0B
echo =====================================================================
echo                       Starting LoanIQ Platform                       
echo =====================================================================
echo.

:: Change directory to current script directory
cd /d "%~dp0"

:: Step 1: Check Python availability
echo [1/4] Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.10+ and try again.
    pause
    exit /b 1
)

:: Step 2: Initialize SQLite databases if missing
echo [2/4] Verifying SQLite databases (V1 and V2)...
if not exist "instance\loaniq_v1.db" (
    echo Database v1 not found. Initializing and seeding V1 database...
    python scripts\init_db.py
    python scripts\seed_products.py
    python scripts\import_csv_data.py
    if exist "instance\loaniq.db" (
        copy "instance\loaniq.db" "instance\loaniq_v1.db" >nul
    )
    echo Database instance\loaniq_v1.db created successfully.
) else (
    echo Database instance\loaniq_v1.db found. Ready.
)

if not exist "instance\loaniq_v2.db" (
    echo Database v2 not found. Initializing and seeding V2 database...
    python scripts\seed_v2.py
    echo Database instance\loaniq_v2.db created successfully.
) else (
    echo Database instance\loaniq_v2.db found. Ready.
)

:: Step 3: Launch Backend Flask API Server
echo.
echo [3/4] Starting LoanIQ Backend API (Flask on Port 5000)...
start "LoanIQ - Backend API Server (Port 5000)" cmd /k "cd /d ""%~dp0"" && title LoanIQ Backend && color 0A && python backend\run.py"

:: Give the backend 2 seconds to initialize
timeout /t 2 /nobreak >nul

:: Step 4: Launch Frontend Server on Port 5173
echo.
echo [4/4] Starting LoanIQ Frontend Server (HTML/CSS/JS on Port 5173)...
start "LoanIQ - Frontend Server (Port 5173)" cmd /k "cd /d ""%~dp0"" && title LoanIQ Frontend (Port 5173) && color 09 && python -m http.server 5173 --directory frontend"

:: Give server 2 seconds to spin up, then open browser
timeout /t 2 /nobreak >nul
echo.
echo =====================================================================
echo   LoanIQ is running!
echo   - Frontend UI:  http://localhost:5173
echo   - Backend API:  http://127.0.0.1:5000
echo.
echo   Opening LoanIQ in your browser...
echo =====================================================================
start http://localhost:5173

exit
