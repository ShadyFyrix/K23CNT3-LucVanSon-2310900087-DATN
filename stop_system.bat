@echo off
chcp 65001 >nul 2>&1
title EXAMGUARD AI - DUNG TOAN BO HE THONG
color 0C

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo ==============================================================================
echo       EXAMGUARD AI - DUNG TOAN BO HE THONG VA DONG TAT CA TERMINAL
echo ==============================================================================
echo.

:: 1. Goi PowerShell Script thuc thi dong triet de toan bo terminal va giai phong port
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%stop_system.ps1"

:: 2. Netstat fallback quet sach cac port 3011, 5000, 8000 neu con sot
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":3011 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":5000 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":8000 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1

:: 3. Taskkill fallback theo tieu de WindowTitle
taskkill /F /FI "WINDOWTITLE eq Face AI Microservice*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ExamGuard Flask Service*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ExamGuard Core Web*" /T >nul 2>&1

:: 4. Dong cua so run_system neu stop_system duoc chay doc lap (khong phai duoc goi tu run_system)
if not "%CALLED_FROM_RUN_SYSTEM%"=="1" (
    taskkill /F /FI "WINDOWTITLE eq EXAMGUARD AI - HE THONG KHOI CHAY TOAN DIEN*" /T >nul 2>&1
)

echo.
ping 127.0.0.1 -n 2 >nul 2>&1
if "%CALLED_FROM_RUN_SYSTEM%"=="1" (
    exit /b 0
) else (
    exit
)
