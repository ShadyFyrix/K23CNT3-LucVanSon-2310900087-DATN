@echo off
chcp 65001 >nul 2>&1
title EXAMGUARD AI - HE THONG KHOI CHAY TOAN DIEN
color 0B

echo ==============================================================================
echo       EXAMGUARD AI - HE THONG THI TRUC TUYEN TICH HOP FACE AI
echo       Sinh vien: Luc Van Son - MSV: 2310900087 - Lop: K23CNT3
echo       Nen tang: ReactJS - Python Flask - MySQL - MongoDB - Tailwind Framework
echo ==============================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [0/4] Tu dong don dep terminal cu va giai phong Port 3011, 5000, 8000...
set "CALLED_FROM_RUN_SYSTEM=1"
call "%ROOT_DIR%stop_system.bat"
set "CALLED_FROM_RUN_SYSTEM="
echo.

echo [1/4] Kiem tra ket noi MongoDB (Port 27017) va MySQL (Port 3306)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $c1 = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 27017); $c1.Close(); Write-Host '  [OK] MongoDB dang hoat dong tot (Port 27017).' -ForegroundColor Green } catch { Write-Host '  [!] CANH BAO: Chua ket noi duoc MongoDB tai port 27017. Vui long bat MongoDB service!' -ForegroundColor Yellow }; try { $c2 = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 3306); $c2.Close(); Write-Host '  [OK] MySQL Server dang hoat dong tot (Port 3306).' -ForegroundColor Green } catch { Write-Host '  [!] CANH BAO: Chua ket noi duoc MySQL Server tai port 3306. Vui long bat MySQL service!' -ForegroundColor Yellow }"
echo.

echo [2/4] Khoi chay Python Face AI Microservice (Port 8000)...
cd /d "%ROOT_DIR%examguard-ai"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Start-Process cmd.exe -ArgumentList '/k title Face AI Microservice (Port 8000) && color 0D && echo [FACE AI] Dang khoi dong Python FastAPI Face AI (Port 8000)... && python main.py' -WorkingDirectory '%ROOT_DIR%examguard-ai' -PassThru; Add-Content -Path '%ROOT_DIR%.examguard_pids' -Value $p.Id"
ping 127.0.0.1 -n 2 >nul 2>&1
echo   [OK] Da khoi chay Face AI Microservice (Port 8000).
echo.

echo [3/4] Khoi chay Python Flask Core Registry Service (Port 5000)...
cd /d "%ROOT_DIR%examguard-flask"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Start-Process cmd.exe -ArgumentList '/k title ExamGuard Flask Service (Port 5000) && color 0E && echo [FLASK] Dang khoi dong Python Flask Service (Port 5000)... && python app.py' -WorkingDirectory '%ROOT_DIR%examguard-flask' -PassThru; Add-Content -Path '%ROOT_DIR%.examguard_pids' -Value $p.Id"
ping 127.0.0.1 -n 2 >nul 2>&1
echo   [OK] Da khoi chay Python Flask Service (Port 5000).
echo.

echo [4/4] Khoi chay ExamGuard Core Web App (Port 3011)...
cd /d "%ROOT_DIR%examguard-core"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Start-Process cmd.exe -ArgumentList '/k title ExamGuard Core Web (Port 3011) && color 0A && echo [CORE WEB] Dang khoi dong ExamGuard Core Server (Port 3011)... && node server/server.js' -WorkingDirectory '%ROOT_DIR%examguard-core' -PassThru; Add-Content -Path '%ROOT_DIR%.examguard_pids' -Value $p.Id"
ping 127.0.0.1 -n 3 >nul 2>&1
echo   [OK] Da khoi chay ExamGuard Core Server (Port 3011).
echo.

cd /d "%ROOT_DIR%"

echo ==============================================================================
echo  [SUCCESS] HE THONG EXAMGUARD AI DA DUOC KHOI CHAY HOAN HAO!
echo  - Frontend Web (ReactJS + Tailwind): http://localhost:3011
echo  - Python Flask Core Service:         http://127.0.0.1:5000
echo  - Python Face AI Microservice:       http://127.0.0.1:8000
echo  - MySQL Database:                    localhost:3306 (examguard_db)
echo  - MongoDB Database:                  localhost:27017 (examguard_ai_db)
echo.
echo  Tai khoan dang nhap san co:
echo    * Admin:      admin@examguard.edu.vn  / 123456
echo    * Giang vien: anguyen@examguard.edu.vn / 123456
echo    * Sinh vien:  son.luc@sinhvien.edu.vn  / 123456
echo ==============================================================================
echo.
echo Dang tu dong mo trinh duyet toi he thong sau 2 giay...
ping 127.0.0.1 -n 3 >nul 2>&1
start http://localhost:3011
echo.
echo ==============================================================================
echo  [CHU Y] Nhan phim bat ky de DUNG HE THONG va DONG HET CAC TAB TERMINAL...
echo  (Hoac chay file stop_system.bat bat ky luc nao de don sach se toan bo)
echo ==============================================================================
pause >nul
echo.
echo Dang tat he thong va dong tat ca cac cua so/tab terminal...
set "CALLED_FROM_RUN_SYSTEM=1"
call "%ROOT_DIR%stop_system.bat"
exit
