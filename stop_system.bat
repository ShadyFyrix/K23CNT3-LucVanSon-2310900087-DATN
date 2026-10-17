@echo off
chcp 65001 >nul 2>&1
title EXAMGUARD AI - DUNG HE THONG
color 0C

echo ==============================================================================
echo       EXAMGUARD AI - DUNG TOAN BO CAC TIEN TRINH DANG CHAY
echo ==============================================================================
echo.

echo [1/2] Dang giai phong Port 3011 (ExamGuard Core) va Port 8000 (Python Face AI)...
powershell -NoProfile -Command "$ports = @(3011, 8000); foreach ($p in $ports) { $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; if ($conns) { foreach ($c in $conns) { try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host ('  -> Da dung tien trinh PID ' + $c.OwningProcess + ' tai Port ' + $p) -ForegroundColor Green } catch {} } } else { Write-Host ('  -> Port ' + $p + ' da duoc giai phong (khong co tien trinh chiem dung).' ) -ForegroundColor Gray } }"

echo.
echo [2/2] Kiem tra tat cac tien trinh node/python neu co...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":3011 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":8000 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1

echo.
echo ==============================================================================
echo  [x] DA DUNG HE THONG THANH CONG!
echo  Port 3011 va Port 8000 da duoc giai phong hoan toan.
echo ==============================================================================
echo.
pause
