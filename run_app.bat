@echo off
setlocal

title Task Journal Web App (15-Day Consolidation)
color 0B

echo ===================================================
echo     TASK JOURNAL - 15 DAYS REPORT SYSTEM
echo ===================================================
echo.

cd /d "%~dp0"

where py >nul 2>1
if %ERRORLEVEL% EQU 0 (
    set "PYTHON_CMD=py"
) else (
    where python >nul 2>1
    if %ERRORLEVEL% EQU 0 (
        set "PYTHON_CMD=python"
    ) else (
        echo ERROR: Python was not found on this machine.
        echo Install Python 3 and ensure either "py" or "python" is available in PATH.
        pause
        exit /b 1
    )
)

echo [1/3] Checking and installing requirements...
%PYTHON_CMD% -m pip install -r requirements.txt --quiet

echo [2/3] Seeding sample data (Sep 16-30)...
%PYTHON_CMD% seed_sample_data.py

echo [3/3] Starting Task Journal Web Application...
echo.
echo ===================================================
echo   Access on your computer: http://localhost:5000
echo   Access on office Wi-Fi:  http://[Your-IP]:5000
echo ===================================================
echo.
echo Press CTRL+C in this window anytime to stop the server.
echo.

start http://localhost:5000
%PYTHON_CMD% app.py

pause
