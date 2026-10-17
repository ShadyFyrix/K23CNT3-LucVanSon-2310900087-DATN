@echo off
chcp 65001 >nul
title EXAMGUARD AI - DUNG HE THONG
color 0C

echo ==============================================================================
echo       EXAMGUARD AI — DUNG TOAN BO CAC TIEN TRINH DANG CHAY
echo ==============================================================================
echo.

echo Dang giai phong Port 3011 (ExamGuard Core)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3011" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Dang giai phong Port 8000 (Python Face AI Microservice)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [x] Da dung cac tien trinh thanh cong! Port 3011 va Port 8000 da duoc giai phong.
echo.
pause
