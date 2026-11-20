@echo off
title Stop LoanIQ Services
color 0C
echo =====================================================================
echo                    Stopping LoanIQ Services                          
echo =====================================================================
echo.

echo Freeing port 5000 (Backend API)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo Terminating process PID %%a on port 5000...
    taskkill /F /PID %%a >nul 2>&1
)

echo Freeing port 5173 (Frontend Dev Server)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Terminating process PID %%a on port 5173...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo LoanIQ background processes have been stopped.
timeout /t 2 /nobreak >nul
exit
