@echo off
chcp 65001 >nul 2>&1
title EXAMGUARD AI - DUNG HE THONG
color 0C

echo ==============================================================================
echo       EXAMGUARD AI - DUNG TOAN BO HE THONG VA DONG TAT CA CAC TERMINAL
echo ==============================================================================
echo.

echo [1/3] Dang giai phong Port 3011, Port 5000 va Port 8000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(3011, 5000, 8000); foreach ($p in $ports) { $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; if ($conns) { foreach ($c in $conns) { try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host ('  [OK] Da dung tien trinh PID ' + $c.OwningProcess + ' tai Port ' + $p) -ForegroundColor Green } catch {} } } else { Write-Host ('  [-] Port ' + $p + ' da duoc giai phong.') -ForegroundColor Gray } }"

echo.
echo [2/3] Dong toan bo cac tab va cua so terminal cua he thong...
:: Tat theo tieu de cua so CMD/Terminal
taskkill /F /FI "WINDOWTITLE eq Face AI Microservice (Port 8000)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ExamGuard Flask Service (Port 5000)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ExamGuard Core Web (Port 3011)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ExamGuard - Python Face AI Microservice*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ExamGuard - Core Server and Frontend*" /T >nul 2>&1

:: Quet dong cac tien trinh terminal theo MainWindowTitle trong PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process | Where-Object { $_.MainWindowTitle -like '*Face AI Microservice*' -or $_.MainWindowTitle -like '*Flask Service*' -or $_.MainWindowTitle -like '*ExamGuard Core Web*' } | ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch {} }"

echo.
echo [3/3] Quet kiem tra lai port va tien trinh chay ngam neu con sot...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":3011 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":5000 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":8000 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1

:: Dong cua so run_system neu co
taskkill /F /FI "WINDOWTITLE eq EXAMGUARD AI - HE THONG KHOI CHAY TOAN DIEN*" /T >nul 2>&1

echo.
echo ==============================================================================
echo  [x] DA DUNG TOAN BO HE THONG VA DONG HET CAC TAB TERMINAL!
echo  Port 3011, Port 5000 va Port 8000 da duoc giai phong hoan toan.
echo ==============================================================================
echo.
ping 127.0.0.1 -n 2 >nul 2>&1
exit
