<# :
@echo off
chcp 65001 >nul 2>&1
title EXAMGUARD AI - DUNG TOAN BO HE THONG
color 0C

set "ROOT_DIR=%~dp0"
set "IS_CALLED_FROM_RUN_SYSTEM=%CALLED_FROM_RUN_SYSTEM%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:IS_CALLED_FROM_RUN_SYSTEM='%IS_CALLED_FROM_RUN_SYSTEM%'; Invoke-Expression ([System.IO.File]::ReadAllText('%~f0', [System.Text.Encoding]::UTF8))"

:: Fallback quet netstat dong cac port neu con sot
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":3011 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":5000 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":8000 " ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1

:: Dong cua so run_system neu stop_system duoc chay doc lap
if not "%CALLED_FROM_RUN_SYSTEM%"=="1" (
    taskkill /F /FI "WINDOWTITLE eq EXAMGUARD AI - HE THONG KHOI CHAY TOAN DIEN*" /T >nul 2>&1
)

ping 127.0.0.1 -n 2 >nul 2>&1
if "%CALLED_FROM_RUN_SYSTEM%"=="1" (
    exit /b 0
) else (
    exit
)
: #>

# ==============================================================================
# EXAMGUARD AI - SCRIPT DUNG TOAN BO HE THONG VA DONG TAT CA TERMINAL
# Tich hop 1 the thong nhat: Chay truc tiep bang cach double-click stop_system.bat
# Sinh vien: Luc Van Son - MSV: 2310900087 - Lop: K23CNT3
# ==============================================================================
$ErrorActionPreference = 'SilentlyContinue'
$rootDir = $env:ROOT_DIR
if (-not $rootDir) { $rootDir = (Get-Location).Path }

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "      EXAMGUARD AI - DUNG TOAN BO HE THONG VA DONG TAT CA TERMINAL" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Dong cac cua so terminal tu file PID (.examguard_pids)
$pidFile = Join-Path $rootDir ".examguard_pids"
if (Test-Path $pidFile) {
    Write-Host "[1/4] Dong cac cua so terminal tu file PID (.examguard_pids)..." -ForegroundColor Cyan
    $savedPids = Get-Content $pidFile -ErrorAction SilentlyContinue
    foreach ($line in $savedPids) {
        $p = $line.Trim()
        if ($p -match '^\d+$') {
            try {
                $pidInt = [int]$p
                & taskkill /F /T /PID $pidInt *> $null
                Write-Host "  [OK] Da dong terminal va cay tien trinh PID: $pidInt" -ForegroundColor Green
            } catch {}
        }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "[1/4] Khong tim thay file PID, tien hanh quet theo Port va Process..." -ForegroundColor Gray
}

# 2. Giai phong Port 3011, Port 5000, Port 8000 va dong ca cua so terminal cha
Write-Host ""
Write-Host "[2/4] Giai phong Port 3011, Port 5000, Port 8000 va dong terminal so huu..." -ForegroundColor Cyan
$targetPorts = @(3011, 5000, 8000)
foreach ($port in $targetPorts) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $owningPid = $conn.OwningProcess
            if ($owningPid -gt 0) {
                # Tim tien trinh cha de dong ca tab/cua so terminal
                try {
                    $parent = (Get-CimInstance Win32_Process -Filter "ProcessId = $owningPid" -ErrorAction SilentlyContinue).ParentProcessId
                    if ($parent -and $parent -gt 0) {
                        & taskkill /F /T /PID $parent *> $null
                        Write-Host "  [OK] Da dong cua so terminal cha (PID: $parent) cua dich vu Port $port." -ForegroundColor Green
                    }
                } catch {}
                # Tieu diet cay tien trinh dang chiem port
                & taskkill /F /T /PID $owningPid *> $null
                Write-Host "  [OK] Da giai phong Port $port (PID: $owningPid)." -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  [-] Port $port da sach se, khong bi chiem dung." -ForegroundColor Gray
    }
}

# 3. Quet dong cac tien trinh chay ngam con sot (Python, Node.js, CMD)
Write-Host ""
Write-Host "[3/4] Quet va dong cac tien trinh nen con sot (Python, Node.js, CMD)..." -ForegroundColor Cyan
$allProcs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
foreach ($proc in $allProcs) {
    $cmd = $proc.CommandLine
    $name = $proc.Name
    $pId = $proc.ProcessId
    if (-not $cmd) { continue }
    
    $isMatch = $false
    # Khop Python Face AI (Port 8000)
    if ($name -match 'python' -and ($cmd -like '*main.py*' -or $cmd -like '*examguard-ai*' -or $cmd -like '*uvicorn*')) {
        $isMatch = $true
    }
    # Khop Python Flask (Port 5000)
    elseif ($name -match 'python' -and ($cmd -like '*app.py*' -or $cmd -like '*examguard-flask*')) {
        $isMatch = $true
    }
    # Khop Node.js Core Web (Port 3011)
    elseif ($name -match 'node' -and ($cmd -like '*server/server.js*' -or $cmd -like '*server.js*' -or $cmd -like '*examguard-core*')) {
        $isMatch = $true
    }
    # Khop CMD window khoi chay cho ExamGuard
    elseif ($name -match 'cmd' -and ($cmd -like '*Face AI Microservice*' -or $cmd -like '*ExamGuard Flask Service*' -or $cmd -like '*ExamGuard Core Web*')) {
        $isMatch = $true
    }

    if ($isMatch) {
        try {
            & taskkill /F /T /PID $pId *> $null
            Write-Host "  [OK] Da tat tien trinh $name (PID: $pId)." -ForegroundColor Green
        } catch {}
    }
}

# 4. Quet tieu de cua so terminal
Write-Host ""
Write-Host "[4/4] Quet dong cua so/tab terminal theo tieu de..." -ForegroundColor Cyan
$titles = @(
    "Face AI Microservice*",
    "ExamGuard Flask Service*",
    "ExamGuard Core Web*",
    "*Face AI Microservice*",
    "*ExamGuard Flask Service*",
    "*ExamGuard Core Web*"
)
foreach ($title in $titles) {
    & taskkill /F /FI "WINDOWTITLE eq $title" /T *> $null
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host " [x] DA DUNG TOAN BO HE THONG VA DONG TAT CA TERMINAL THANH CONG!" -ForegroundColor Green
Write-Host " Port 3011, Port 5000 va Port 8000 da duoc giai phong hoan toan." -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
