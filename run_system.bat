@echo off
chcp 65001 >nul
title EXAMGUARD AI - HE THONG KHOI CHAY TOAN DIEN
color 0B

echo ==============================================================================
echo       EXAMGUARD AI — HE THONG THI TRUC TUYEN TICH HOP FACE AI
echo       Sinh vien: Luc Van Son - MSV: 2310900087 - Lop: K23CNT3
echo ==============================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [1/3] Kiem tra ket noi MongoDB...
powershell -Command "try { $client = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 27017); $client.Close(); Write-Host '  -> MongoDB dang hoat dong tot (Port 27017).' -ForegroundColor Green } catch { Write-Host '  [!] CANH BAO: Chua ket noi duoc MongoDB tai port 27017. Vui long bat MongoDB service truoc khi chay!' -ForegroundColor Yellow }"
echo.

echo [2/3] Khoi chay Python Face AI Microservice (Port 8000)...
start "ExamGuard - Python Face AI Microservice (Port 8000)" cmd /k "cd /d %ROOT_DIR%examguard-ai && title Face AI Microservice (Port 8000) && color 0D && echo Dang khoi dong Python FastAPI Face AI... && python main.py"
timeout /t 3 >nul
echo   -> Da gui lenh khoi chay Face AI Microservice.
echo.

echo [3/3] Khoi chay ExamGuard Core Server (Port 3011)...
start "ExamGuard - Core Server & Frontend (Port 3011)" cmd /k "cd /d %ROOT_DIR%examguard-core && title ExamGuard Core Web (Port 3011) && color 0A && echo Dang khoi dong ExamGuard Core... && node server/server.js"
timeout /t 3 >nul
echo   -> Da gui lenh khoi chay ExamGuard Core Server.
echo.

echo ==============================================================================
echo  🎉 HE THONG EXAMGUARD AI DA DUOC KHOI CHAY THANH CONG!
echo  - Frontend Web & Backend: http://localhost:3011
echo  - Python Face AI Service: http://127.0.0.1:8000
echo.
echo  Tai khoan dang nhap san co:
echo    * Admin:      admin@examguard.edu.vn  / 123456
echo    * Giang vien: anguyen@examguard.edu.vn / 123456
echo    * Sinh vien:  son.luc@sinhvien.edu.vn  / 123456
echo ==============================================================================
echo.
echo Dang tu dong mo trinh duyet toi he thong sau 2 giay...
timeout /t 2 >nul
start http://localhost:3011
