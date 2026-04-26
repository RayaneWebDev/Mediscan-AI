@echo off
REM Executable local MediScan AI pour Windows.
setlocal

REM %~dp0 pointe vers le dossier exe\. On remonte au dossier projet mediscan\.
for %%I in ("%~dp0..") do set "PROJECT_DIR=%%~fI"

echo ===========================================
echo  MediScan AI - Lanceur Windows
echo ===========================================
echo Dossier projet : "%PROJECT_DIR%"
echo.

if not exist "%PROJECT_DIR%\run.bat" (
    echo [ERREUR] run.bat introuvable dans "%PROJECT_DIR%".
    echo Verifie que le dossier exe est bien a l'interieur du dossier mediscan.
    echo.
    pause
    exit /b 1
)

pushd "%PROJECT_DIR%"
call "%PROJECT_DIR%\run.bat"
set "EXIT_CODE=%ERRORLEVEL%"
popd

if not "%EXIT_CODE%"=="0" (
    echo.
    echo [ERREUR] MediScan s'est arrete avec le code %EXIT_CODE%.
    echo.
    pause
)

exit /b %EXIT_CODE%
