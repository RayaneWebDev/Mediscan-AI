@echo off
REM run.bat — Lance MediScan AI (backend + frontend) sous Windows
setlocal enabledelayedexpansion

cd /d "%~dp0"
for %%I in ("%~dp0..") do set "PROJECT_DIR=%%~fI"
cd /d "%PROJECT_DIR%"
set BACKEND_PORT=8000

if exist ".env" (
    for /f "tokens=1,* delims==" %%a in ('findstr /R "^BACKEND_PORT=" ".env"') do (
        if not "%%b"=="" set BACKEND_PORT=%%b
    )
)

REM ── Python 3.11 : essaie d'abord le Python Launcher (py), puis python3.11, puis python ──
set PYTHON311=
where py >nul 2>&1
if %errorlevel% equ 0 (
    py -3.11 --version >nul 2>&1
    if !errorlevel! equ 0 (
        set PYTHON311=py -3.11
    )
)

if "!PYTHON311!"=="" (
    where python3.11 >nul 2>&1
    if !errorlevel! equ 0 (
        set PYTHON311=python3.11
    )
)

if "!PYTHON311!"=="" (
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        python --version 2>&1 | findstr /C:"3.11" >nul
        if !errorlevel! equ 0 (
            set PYTHON311=python
        )
    )
)

if "!PYTHON311!"=="" (
    echo [ERREUR] Python 3.11 introuvable.
    echo  Installe Python 3.11 : https://www.python.org/downloads/release/python-31119/
    echo  Coche bien "Add Python to PATH" lors de l'installation.
    echo  Ou utilise le Python Launcher : py -3.11 --version
    pause & exit /b 1
)
echo [OK] Python 3.11 trouve : !PYTHON311!

REM ── Node.js : Vite 8 requiert Node >=20.19.0 ou >=22.12.0 ──────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js introuvable.
    echo  Installe Node.js 22 LTS : https://nodejs.org/
    pause & exit /b 1
)

for /f "tokens=1" %%v in ('node -e "process.stdout.write(process.version.slice(1))"') do set NODE_VERSION=%%v
for /f "tokens=1 delims=." %%a in ("!NODE_VERSION!") do set NODE_MAJOR=%%a
for /f "tokens=2 delims=." %%b in ("!NODE_VERSION!") do set NODE_MINOR=%%b

set NODE_OK=0
if !NODE_MAJOR! geq 23 set NODE_OK=1
if !NODE_MAJOR! equ 22 if !NODE_MINOR! geq 12 set NODE_OK=1
if !NODE_MAJOR! equ 20 if !NODE_MINOR! geq 19 set NODE_OK=1

if !NODE_OK! equ 0 (
    echo [ERREUR] Node.js !NODE_VERSION! trop ancien.
    echo  Vite 8 requiert Node ^>=20.19.0 ou ^>=22.12.0.
    echo  Installe Node.js 22 LTS : https://nodejs.org/
    pause & exit /b 1
)
echo [OK] Node.js !NODE_VERSION!

REM ── Git LFS (avertissement) ──────────────────────────────────────────────────
git lfs version >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVERTISSEMENT] Git LFS introuvable. Les index FAISS pourraient etre vides.
    echo  Installe : winget install GitHub.GitLFS  puis  git lfs install  puis  git lfs pull
)

REM ── Venv Python 3.11 ─────────────────────────────────────────────────────────
if not exist ".venv311\Scripts\activate.bat" (
    echo [1/3] Creation du venv Python 3.11...
    !PYTHON311! -m venv .venv311
    if !errorlevel! neq 0 (
        echo [ERREUR] Impossible de creer le venv.
        pause & exit /b 1
    )
) else (
    echo [1/3] Venv deja present.
)

if not exist ".venv311\.mediscan_deps_ok" (
    echo [1/3] Installation des dependances Python...
    .venv311\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
    if !errorlevel! neq 0 (
        echo [ERREUR] Impossible de mettre pip/setuptools/wheel a jour.
        pause & exit /b 1
    )

    set PY_DEPS_INSTALLED=0
    if exist "requirements.lock.txt" (
        echo      Essai avec requirements.lock.txt...
        .venv311\Scripts\python.exe -m pip install -r requirements.lock.txt
        if !errorlevel! equ 0 set PY_DEPS_INSTALLED=1
        if !PY_DEPS_INSTALLED! equ 0 (
            echo.
            echo [AVERTISSEMENT] Le lockfile a echoue sur cette machine Windows.
            echo      Nouvel essai avec requirements.txt, plus souple pour Windows...
            echo.
        )
    )

    if !PY_DEPS_INSTALLED! equ 0 (
        .venv311\Scripts\python.exe -m pip install -r requirements.txt
        if !errorlevel! equ 0 set PY_DEPS_INSTALLED=1
    )

    if !PY_DEPS_INSTALLED! equ 0 (
        echo.
        echo [ERREUR] Installation des dependances Python impossible.
        echo  Verifie :
        echo   - Python 3.11 installe, pas Python 3.12/3.13
        echo   - connexion Internet active
        echo   - Visual C++ Redistributable installe si Windows le demande
        echo   - Git LFS execute : git lfs pull
        echo.
        echo  Tu peux relancer apres correction : bin\run.bat
        pause & exit /b 1
    )

    echo ok > .venv311\.mediscan_deps_ok
    echo      OK
) else (
    echo [1/3] Dependances Python deja installees.
)

REM ── Frontend ─────────────────────────────────────────────────────────────────
echo [2/3] Installation des dependances frontend (npm ci)...
cd frontend
call npm ci --silent
if %errorlevel% neq 0 (
    echo [ERREUR] npm ci a echoue. Essaie : cd frontend ^&^& npm ci
    pause & exit /b 1
)
cd ..
echo      OK

if /I "%~1"=="docs" (
    echo [3/3] Generation de la documentation unifiee...
    .venv311\Scripts\python.exe scripts\generate_docs.py
    if !errorlevel! neq 0 (
        echo [ERREUR] La generation de la documentation a echoue.
        pause & exit /b 1
    )
    echo      OK - ouvre docs\index.html
    exit /b 0
)

REM ── Backend ──────────────────────────────────────────────────────────────────
echo [3/3] Demarrage du backend sur le port !BACKEND_PORT!...

REM Tuer d'eventuels processus existants sur le port choisi
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":!BACKEND_PORT!" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

set PYTHONPATH=%cd%\src;%cd%
start "MediScan-Backend" /b cmd /c "set PYTHONPATH=%cd%\src;%cd% && .venv311\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port !BACKEND_PORT! > %TEMP%\mediscan-backend.log 2>&1"

REM Attente health check
echo  En attente du backend (max 30s)...
set READY=0
for /l %%i in (1,1,30) do (
    if !READY! equ 0 (
        curl -sf http://127.0.0.1:!BACKEND_PORT!/api/health >nul 2>&1
        if !errorlevel! equ 0 (
            set READY=1
        ) else (
            timeout /t 1 /nobreak >nul
        )
    )
)

if !READY! equ 0 (
    echo [ERREUR] Backend non demarre apres 30s.
    echo  Logs : %TEMP%\mediscan-backend.log
    type %TEMP%\mediscan-backend.log
    pause & exit /b 1
)
echo  Backend pret  =^>  http://127.0.0.1:!BACKEND_PORT!

REM ── Frontend dev server ───────────────────────────────────────────────────────
echo.
echo  ===========================================
echo   MediScan AI est pret !
echo   Frontend : http://127.0.0.1:5173
echo   Backend  : http://127.0.0.1:!BACKEND_PORT!
echo   Ctrl+C pour arreter le frontend
echo  ===========================================
echo.

cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
