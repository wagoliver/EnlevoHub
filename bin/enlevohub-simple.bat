@echo off
setlocal

:: EnlevoHub Simple Launcher - Frontend Only
:: Usage: enlevohub-simple.bat {start|stop}

set ENLEVOHUB_HOME=%~dp0..
set ACTION=%1

if "%ACTION%"=="" (
    set ACTION=start
)

cd /d "%ENLEVOHUB_HOME%"

if "%ACTION%"=="start" goto :start
if "%ACTION%"=="stop" goto :stop

:start
    echo.
    echo ========================================
    echo   Starting EnlevoHub (Frontend)
    echo ========================================
    echo.

    :: Check if node_modules exists
    if not exist "packages\frontend\node_modules" (
        echo [Setup] Installing frontend dependencies...
        cd packages\frontend
        call npm install
        cd ..\..
    )

    echo [Starting] EnlevoHub Frontend...
    echo.

    :: Start frontend in a new window
    start "EnlevoHub Frontend" cmd /c "cd packages\frontend && npm run dev && pause"

    timeout /t 3 /nobreak >nul

    echo ========================================
    echo   EnlevoHub Frontend Started!
    echo ========================================
    echo.
    echo   Frontend: http://localhost:3000
    echo.
    echo   Check the "EnlevoHub Frontend" window
    echo   for the actual port if 3000 is busy.
    echo.
    echo   To stop: Close the EnlevoHub window
    echo            or run: enlevohub-simple.bat stop
    echo ========================================
    echo.

    :: Open browser
    timeout /t 5 /nobreak >nul
    start http://localhost:3000

    goto :end

:stop
    echo.
    echo Stopping EnlevoHub Frontend...
    taskkill /FI "WINDOWTITLE eq EnlevoHub Frontend*" /F 2>nul
    echo.
    echo EnlevoHub Frontend stopped.
    echo.
    goto :end

:end
endlocal
