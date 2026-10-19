# ==============================================================================
# EXAMGUARD AI - PROCESS & TERMINAL CLEANUP SCRIPT (POWERSHELL)
# Ho tro dong triet de toan bo terminal va giai phong port 3011, 5000, 8000
# ==============================================================================
$ErrorActionPreference = 'SilentlyContinue'
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "      EXAMGUARD AI - DUNG TOAN BO HE THONG VA DONG TAT CA TERMINAL" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Dong cac cua so terminal theo file ghi nhan PID (.examguard_pids)
$pidFile = Join-Path $rootDir ".examguard_pids"
if (Test-Path $pidFile) {
    Write-Host "[1/4] Dong cac cua so terminal tu file PID (.examguard_pids)..." -ForegroundColor Cyan
    $savedPids = Get-Content $pidFile -ErrorAction SilentlyContinue
    foreach ($line in $savedPids) {
        $p = $line.Trim()
        if ($p -match '^\d+$') {
            try {
                $pidInt = [int]$p
                # Dung taskkill /F /T de tieu diet ca cmd.exe va toan bo cay tien trinh con
                & taskkill /F /T /PID $pidInt *> $null
                Write-Host "  [OK] Da dong terminal va tien trinh PID: $pidInt" -ForegroundColor Green
            } catch {}
        }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "[1/4] Khong tim thay file PID, tien hanh quet theo Port va Process..." -ForegroundColor Gray
}

# 2. Giai phong Port 3011, 5000, 8000 va dong terminal cha so huu port
Write-Host ""
Write-Host "[2/4] Giai phong Port 3011, Port 5000, Port 8000 va dong terminal so huu..." -ForegroundColor Cyan
$targetPorts = @(3011, 5000, 8000)
foreach ($port in $targetPorts) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $owningPid = $conn.OwningProcess
            if ($owningPid -gt 0) {
                # Tim tien trinh cha (cmd.exe hoac terminal host)
                try {
                    $parent = (Get-CimInstance Win32_Process -Filter "ProcessId = $owningPid" -ErrorAction SilentlyContinue).ParentProcessId
                    if ($parent -and $parent -gt 0) {
                        & taskkill /F /T /PID $parent *> $null
                        Write-Host "  [OK] Da dong terminal cha (PID: $parent) cua dich vu Port $port." -ForegroundColor Green
                    }
                } catch {}
                # Tieu diet cay tien trinh dang chiem dung port
                & taskkill /F /T /PID $owningPid *> $null
                Write-Host "  [OK] Da giai phong Port $port (PID: $owningPid)." -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  [-] Port $port da sach se, khong bi chiem dung." -ForegroundColor Gray
    }
}

# 3. Quet dong cac tien trinh chay ngam lien quan den ExamGuard
Write-Host ""
Write-Host "[3/4] Quet va dong cac tien trinh nen con sot (Python, Node.js, CMD)..." -ForegroundColor Cyan
$allProcs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
foreach ($proc in $allProcs) {
    $cmd = $proc.CommandLine
    $name = $proc.Name
    $pId = $proc.ProcessId
    if (-not $cmd) { continue }
    
    $isMatch = $false
    # Khop voi Python Face AI Microservice (Port 8000)
    if ($name -match 'python' -and ($cmd -like '*main.py*' -or $cmd -like '*examguard-ai*' -or $cmd -like '*uvicorn*')) {
        $isMatch = $true
    }
    # Khop voi Python Flask Service (Port 5000)
    elseif ($name -match 'python' -and ($cmd -like '*app.py*' -or $cmd -like '*examguard-flask*')) {
        $isMatch = $true
    }
    # Khop voi ExamGuard Core Node.js Server (Port 3011)
    elseif ($name -match 'node' -and ($cmd -like '*server/server.js*' -or $cmd -like '*server.js*' -or $cmd -like '*examguard-core*')) {
        $isMatch = $true
    }
    # Khop voi CMD Window duoc khoi chay cho ExamGuard
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

# 4. Quet taskkill du phong theo tieu de cua so (WindowTitle)
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
