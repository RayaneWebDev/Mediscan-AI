@echo off
REM MediScan AI launcher for Windows.
REM It prepares a Python 3.11 CPU-only runtime, installs the frontend, then starts both servers.

setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0\.."
set "PROJECT_DIR=%CD%"
set "FRONTEND_DIR=%PROJECT_DIR%\frontend"
set "VENV_DIR=%PROJECT_DIR%\.venv311"
set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"
set "PY_STAMP_FILE=%VENV_DIR%\.mediscan_py_deps_stamp"
set "FE_STAMP_FILE=%FRONTEND_DIR%\.mediscan_fe_deps_stamp"
set "PYTORCH_CPU_INDEX=https://download.pytorch.org/whl/cpu"
set "BACKEND_HOST=127.0.0.1"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"
set "BACKEND_LOG=%TEMP%\mediscan-backend.log"

call :load_env_port
call :resolve_python311 || goto :fatal
call :ensure_node || goto :fatal
call :ensure_curl || goto :fatal
call :warn_git_lfs
call :ensure_python_environment || goto :fatal
call :install_frontend_dependencies || goto :fatal

if /I "%~1"=="check" (
    echo [OK] Check complete. No server was started.
    exit /b 0
)

if /I "%~1"=="docs" (
    echo [INFO] Generating documentation...
    "%PYTHON_EXE%" scripts\generate_docs.py
    if errorlevel 1 goto :fatal
    echo [OK] Documentation generated: docs\index.html
    exit /b 0
)

if not "%~1"=="" if /I not "%~1"=="run" (
    echo [ERROR] Unknown command: %~1. Use: run, check, or docs.
    goto :fatal
)

call :kill_port "%BACKEND_PORT%"
call :kill_port "%FRONTEND_PORT%"

echo [INFO] Starting backend on http://%BACKEND_HOST%:%BACKEND_PORT% ...
set "PYTHONPATH=%PROJECT_DIR%\src;%PROJECT_DIR%"
set "CUDA_VISIBLE_DEVICES="
start "MediScan-Backend" /b cmd /c ""%PYTHON_EXE%" -m uvicorn backend.app.main:app --host %BACKEND_HOST% --port %BACKEND_PORT% > "%BACKEND_LOG%" 2>&1"

echo [INFO] Waiting for backend health check...
set "READY=0"
for /l %%i in (1,1,60) do (
    if "!READY!"=="0" (
        curl -sf http://%BACKEND_HOST%:%BACKEND_PORT%/api/health >nul 2>&1
        if !errorlevel! equ 0 (
            set "READY=1"
        ) else (
            timeout /t 1 /nobreak >nul
        )
    )
)

if not "%READY%"=="1" (
    echo [ERROR] Backend did not start. Log file: %BACKEND_LOG%
    if exist "%BACKEND_LOG%" type "%BACKEND_LOG%"
    goto :fatal
)

echo [OK] Backend ready: http://%BACKEND_HOST%:%BACKEND_PORT%
echo.
echo MediScan AI is ready.
echo Frontend: http://%BACKEND_HOST%:%FRONTEND_PORT%
echo Backend:  http://%BACKEND_HOST%:%BACKEND_PORT%
echo Press Ctrl+C to stop.
echo.

cd /d "%FRONTEND_DIR%"
npm run dev -- --host %BACKEND_HOST% --port %FRONTEND_PORT%
exit /b %errorlevel%

:load_env_port
if exist ".env" (
    for /f "tokens=1,* delims==" %%a in ('findstr /B "BACKEND_PORT=" ".env" 2^>nul') do if not "%%b"=="" set "BACKEND_PORT=%%b"
    for /f "tokens=1,* delims==" %%a in ('findstr /B "MEDISCAN_BACKEND_PORT=" ".env" 2^>nul') do if not "%%b"=="" set "BACKEND_PORT=%%b"
)
exit /b 0

:resolve_python311
set "PYTHON311="

where py >nul 2>&1
if !errorlevel! equ 0 (
    py -3.11 --version >nul 2>&1
    if !errorlevel! equ 0 set "PYTHON311=py -3.11"
)

if "%PYTHON311%"=="" (
    where python3.11 >nul 2>&1
    if !errorlevel! equ 0 set "PYTHON311=python3.11"
)

if "%PYTHON311%"=="" (
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        python -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 11) else 1)" >nul 2>&1
        if !errorlevel! equ 0 set "PYTHON311=python"
    )
)

if "%PYTHON311%"=="" (
    where winget >nul 2>&1
    if !errorlevel! equ 0 (
        echo [INFO] Python 3.11 not found. Trying winget install...
        winget install -e --id Python.Python.3.11 --accept-source-agreements --accept-package-agreements
    )
)

if "%PYTHON311%"=="" (
    where py >nul 2>&1
    if !errorlevel! equ 0 (
        py -3.11 --version >nul 2>&1
        if !errorlevel! equ 0 set "PYTHON311=py -3.11"
    )
)

if "%PYTHON311%"=="" (
    where python3.11 >nul 2>&1
    if !errorlevel! equ 0 set "PYTHON311=python3.11"
)

if "%PYTHON311%"=="" (
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        python -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 11) else 1)" >nul 2>&1
        if !errorlevel! equ 0 set "PYTHON311=python"
    )
)

if "%PYTHON311%"=="" (
    echo [ERROR] Python 3.11 not found.
    echo Install Python 3.11 from https://www.python.org/downloads/ and enable "Add Python to PATH".
    exit /b 1
)

echo [OK] Python 3.11 found: %PYTHON311%
exit /b 0

:ensure_node
where node >nul 2>&1
if errorlevel 1 (
    where winget >nul 2>&1
    if !errorlevel! equ 0 (
        echo [INFO] Node.js not found. Trying winget install...
        winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    )
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 22 LTS from https://nodejs.org/ and relaunch.
    exit /b 1
)

for /f "tokens=1" %%v in ('node -e "process.stdout.write(process.version.slice(1))"') do set "NODE_VERSION=%%v"
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set "NODE_MAJOR=%%a"
for /f "tokens=2 delims=." %%b in ("%NODE_VERSION%") do set "NODE_MINOR=%%b"

set "NODE_OK=0"
if %NODE_MAJOR% geq 23 set "NODE_OK=1"
if %NODE_MAJOR% equ 22 if %NODE_MINOR% geq 12 set "NODE_OK=1"
if %NODE_MAJOR% equ 20 if %NODE_MINOR% geq 19 set "NODE_OK=1"

if "%NODE_OK%"=="0" (
    echo [ERROR] Node.js %NODE_VERSION% is too old.
    echo Install Node.js 22 LTS from https://nodejs.org/ and relaunch.
    exit /b 1
)

echo [OK] Node.js %NODE_VERSION%
exit /b 0

:ensure_curl
where curl >nul 2>&1
if errorlevel 1 (
    echo [ERROR] curl not found in PATH. Install Git for Windows or enable Windows curl.
    exit /b 1
)
exit /b 0

:warn_git_lfs
git lfs version >nul 2>&1
if errorlevel 1 (
    echo [WARN] Git LFS not found. If artifacts are missing, run: git lfs install ^&^& git lfs pull
    where winget >nul 2>&1
    if !errorlevel! equ 0 (
        winget install -e --id GitHub.GitLFS --accept-source-agreements --accept-package-agreements >nul 2>&1
    )
)
exit /b 0

:ensure_python_environment
if not exist "%PYTHON_EXE%" (
    echo [INFO] Creating Python 3.11 virtual environment...
    %PYTHON311% -m venv "%VENV_DIR%"
    if errorlevel 1 exit /b 1
)

"%PYTHON_EXE%" -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 11) else 1)" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] .venv311 exists but is not Python 3.11. Delete .venv311, then relaunch.
    exit /b 1
)

set "REQ_HASH=NOHASH"
set "LOCK_HASH=NOLOCK"
for /f %%h in ('powershell -NoProfile -Command "(Get-FileHash -Algorithm SHA256 'requirements.txt').Hash"') do set "REQ_HASH=%%h"
if exist "requirements.lock.txt" (
    for /f %%h in ('powershell -NoProfile -Command "(Get-FileHash -Algorithm SHA256 'requirements.lock.txt').Hash"') do set "LOCK_HASH=%%h"
)

set "EXPECTED_PY_STAMP=req:%REQ_HASH%;lock:%LOCK_HASH%;torch:2.11.0-cpu;torchvision:0.26.0-cpu"
set "CURRENT_PY_STAMP="
if exist "%PY_STAMP_FILE%" set /p CURRENT_PY_STAMP=<"%PY_STAMP_FILE%"

if "%CURRENT_PY_STAMP%"=="%EXPECTED_PY_STAMP%" (
    echo [OK] Python dependencies already up to date
    call :verify_runtime
    exit /b !errorlevel!
)

call :verify_runtime skip-artifacts >nul 2>nul
if !errorlevel! equ 0 (
    > "%PY_STAMP_FILE%" echo %EXPECTED_PY_STAMP%
    echo [OK] Existing Python runtime is already valid
    call :verify_runtime
    exit /b !errorlevel!
)

echo [WARN] Existing Python runtime is incomplete; reinstalling dependencies.

echo [INFO] Upgrading pip/setuptools/wheel...
"%PYTHON_EXE%" -m pip install -q --upgrade pip setuptools wheel
if errorlevel 1 exit /b 1

call :install_cpu_pytorch || exit /b 1

echo [INFO] Installing Python dependencies...
set "PY_DEPS_INSTALLED=0"
if exist "requirements.lock.txt" (
    "%PYTHON_EXE%" -m pip install -q -r requirements.lock.txt
    if !errorlevel! equ 0 set "PY_DEPS_INSTALLED=1"
    if "!PY_DEPS_INSTALLED!"=="0" echo [WARN] requirements.lock.txt failed; retrying with requirements.txt.
)

if "%PY_DEPS_INSTALLED%"=="0" (
    "%PYTHON_EXE%" -m pip install -q -r requirements.txt
    if errorlevel 1 exit /b 1
)

call :install_cpu_pytorch || exit /b 1
call :verify_runtime || exit /b 1
> "%PY_STAMP_FILE%" echo %EXPECTED_PY_STAMP%
echo [OK] Python dependencies ready
exit /b 0

:install_cpu_pytorch
echo [INFO] Installing PyTorch CPU wheels...
"%PYTHON_EXE%" -m pip install -q --upgrade --force-reinstall --index-url %PYTORCH_CPU_INDEX% --extra-index-url https://pypi.org/simple torch==2.11.0+cpu torchvision==0.26.0+cpu
if errorlevel 1 (
    echo [ERROR] CPU-only PyTorch installation failed.
    echo Check your internet connection, delete .venv311 if needed, then relaunch bin\run.bat.
    exit /b 1
)
exit /b 0

:verify_runtime
set "VERIFY_MODE=%~1"
"%PYTHON_EXE%" -c "import os, sys, torch; os.environ['CUDA_VISIBLE_DEVICES']=''; cuda=getattr(torch.version,'cuda',None); print('[OK] PyTorch ' + torch.__version__ + ' cuda=' + str(cuda)); raise SystemExit(1 if cuda else 0)"
if errorlevel 1 (
    echo [ERROR] CUDA PyTorch build detected or PyTorch import failed.
    echo Delete .venv311, then relaunch bin\run.bat. The launcher installs CPU-only PyTorch.
    exit /b 1
)

"%PYTHON_EXE%" -c "import numpy, PIL, faiss, fastapi, uvicorn, transformers, open_clip, torchvision; print('[OK] Python dependencies importable')"
if errorlevel 1 (
    echo [ERROR] A Python dependency is not importable. Delete .venv311, then relaunch bin\run.bat.
    exit /b 1
)

if /I "%VERIFY_MODE%"=="skip-artifacts" exit /b 0

call :check_artifact "artifacts\index.faiss" 1000000 || exit /b 1
call :check_artifact "artifacts\index_semantic.faiss" 1000000 || exit /b 1
call :check_artifact "artifacts\ids.json" 1000000 || exit /b 1
call :check_artifact "artifacts\ids_semantic.json" 1000000 || exit /b 1
call :check_artifact "artifacts\cui_categories.json" 100 || exit /b 1
call :check_artifact "artifacts\manifests\visual_stable.json" 100 || exit /b 1
call :check_artifact "artifacts\manifests\semantic_stable.json" 100 || exit /b 1
echo [OK] Runtime verification complete
exit /b 0

:check_artifact
set "ARTIFACT=%~1"
set "MIN_SIZE=%~2"
if not exist "%ARTIFACT%" (
    echo [ERROR] Missing artifact: %ARTIFACT%
    echo Run: git lfs install ^&^& git lfs pull
    exit /b 1
)
for %%F in ("%ARTIFACT%") do set "ARTIFACT_SIZE=%%~zF"
if !ARTIFACT_SIZE! LSS !MIN_SIZE! (
    echo [ERROR] Artifact is too small, probably a Git LFS pointer: %ARTIFACT%
    echo Run: git lfs install ^&^& git lfs pull
    exit /b 1
)
exit /b 0

:install_frontend_dependencies
set "FE_PKG_HASH=NOHASH"
set "FE_LOCK_HASH=NOLOCK"
for /f %%h in ('powershell -NoProfile -Command "(Get-FileHash -Algorithm SHA256 'frontend/package.json').Hash"') do set "FE_PKG_HASH=%%h"
if exist "frontend\package-lock.json" (
    for /f %%h in ('powershell -NoProfile -Command "(Get-FileHash -Algorithm SHA256 'frontend/package-lock.json').Hash"') do set "FE_LOCK_HASH=%%h"
)

set "EXPECTED_FE_STAMP=pkg:%FE_PKG_HASH%;lock:%FE_LOCK_HASH%"
set "CURRENT_FE_STAMP="
if exist "%FE_STAMP_FILE%" set /p CURRENT_FE_STAMP=<"%FE_STAMP_FILE%"

if "%CURRENT_FE_STAMP%"=="%EXPECTED_FE_STAMP%" if exist "frontend\node_modules" (
    echo [OK] Frontend dependencies already up to date
    exit /b 0
)

echo [INFO] Installing frontend dependencies...
cd /d "%FRONTEND_DIR%"
if exist "package-lock.json" (
    call npm ci --silent
) else (
    call npm install --silent
)
if errorlevel 1 exit /b 1
> "%FE_STAMP_FILE%" echo %EXPECTED_FE_STAMP%
cd /d "%PROJECT_DIR%"
echo [OK] Frontend dependencies ready
exit /b 0

:kill_port
set "PORT_TO_KILL=%~1"
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":%PORT_TO_KILL%" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%p >nul 2>&1
)
exit /b 0

:fatal
echo.
echo Launch failed. See the message above.
pause
exit /b 1
