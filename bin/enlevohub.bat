@echo off
setlocal enabledelayedexpansion

:: EnlevoHub Control Script for Windows
:: Usage: enlevohub.bat {start|stop|restart|status}

set ENLEVOHUB_HOME=%~dp0..
set ACTION=%1
set DEBUG_MODE=0

:: Check for --debug flag
if "%1"=="--debug" (
    set DEBUG_MODE=1
    set ACTION=%2
)
if "%2"=="--debug" (
    set DEBUG_MODE=1
)

if "%ACTION%"=="" (
    echo Usage: enlevohub.bat {start^|stop^|restart^|status} [--debug]
    exit /b 1
)

cd /d "%ENLEVOHUB_HOME%"

if "%ACTION%"=="start" goto :start
if "%ACTION%"=="stop" goto :stop
if "%ACTION%"=="restart" goto :restart
if "%ACTION%"=="status" goto :status

echo Invalid action: %ACTION%
echo Usage: enlevohub.bat {start^|stop^|restart^|status}
exit /b 1

:start
    echo.
    echo ========================================
    echo Starting EnlevoHub...
    echo ========================================
    echo.

    :: Step 1: Verify Node.js
    echo [1/7] Verifying Node.js...
    where node >nul 2>&1
    if errorlevel 1 (
        echo   [ERROR] Node.js not found
        echo   Install Node.js 20+ from https://nodejs.org/
        exit /b 1
    )
    node --version
    echo   [OK] Node.js is installed
    echo.

    :: Step 2: Verify and Start PostgreSQL
    echo [2/7] Verifying PostgreSQL...
    netstat -ano | findstr ":5432" | findstr "LISTENING" >nul 2>&1
    if errorlevel 1 (
        echo   [WARN] PostgreSQL is not running on port 5432
        echo   [AUTO] Attempting to start PostgreSQL...

        :: Try common service names
        set PG_STARTED=0

        :: Try postgresql-x64-16
        net start postgresql-x64-16 >nul 2>&1
        if not errorlevel 1 (
            set PG_STARTED=1
            echo   [OK] Started PostgreSQL service: postgresql-x64-16
        )

        :: Try postgresql-16
        if !PG_STARTED!==0 (
            net start postgresql-16 >nul 2>&1
            if not errorlevel 1 (
                set PG_STARTED=1
                echo   [OK] Started PostgreSQL service: postgresql-16
            )
        )

        :: Try just postgresql
        if !PG_STARTED!==0 (
            net start postgresql >nul 2>&1
            if not errorlevel 1 (
                set PG_STARTED=1
                echo   [OK] Started PostgreSQL service: postgresql
            )
        )

        :: If service start failed, try pg_ctl
        if !PG_STARTED!==0 (
            if exist "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" (
                echo   [AUTO] Trying pg_ctl...
                "C:\Program Files\PostgreSQL\16\bin\pg_ctl" start -D "C:\Program Files\PostgreSQL\16\data" >nul 2>&1
                if not errorlevel 1 (
                    set PG_STARTED=1
                    echo   [OK] Started PostgreSQL via pg_ctl
                )
            )
        )

        :: Wait for PostgreSQL to be ready
        if !PG_STARTED!==1 (
            echo   [WAIT] Waiting for PostgreSQL to be ready...
            timeout /t 3 /nobreak >nul

            :: Verify it's really up
            netstat -ano | findstr ":5432" | findstr "LISTENING" >nul 2>&1
            if errorlevel 1 (
                echo   [ERROR] PostgreSQL service started but port 5432 not available
                echo.
                echo   Please check PostgreSQL manually:
                echo   - Check service status: sc query postgresql-x64-16
                echo   - Check logs: C:\Program Files\PostgreSQL\16\data\log\
                echo.
                exit /b 1
            )
        ) else (
            echo   [ERROR] Could not start PostgreSQL automatically
            echo.
            echo   Please start PostgreSQL manually:
            echo   1. Check service name: sc query type= service state= all ^| findstr postgres
            echo   2. Start service: net start [service-name]
            echo   3. Or run: "C:\Program Files\PostgreSQL\16\bin\pg_ctl" start -D "C:\Program Files\PostgreSQL\16\data"
            echo.
            echo   Then run: bin\enlevohub.bat start
            echo.
            exit /b 1
        )
    ) else (
        echo   [OK] PostgreSQL is already running on port 5432
    )
    echo.

    :: Step 3: Check root dependencies
    echo [3/7] Checking root dependencies...
    if not exist "node_modules" (
        echo   [WARN] Root dependencies not installed
        echo   [INSTALL] Running npm install...
        call npm install
        if errorlevel 1 (
            echo   [ERROR] Failed to install root dependencies
            exit /b 1
        )
        echo   [OK] Root dependencies installed
    ) else (
        echo   [OK] Root dependencies found
    )
    echo.

    :: Step 4: Check backend dependencies
    echo [4/7] Checking backend dependencies...
    if not exist "packages\backend\node_modules" (
        echo   [WARN] Backend dependencies not installed
        echo   [INSTALL] Running npm install in backend...
        cd packages\backend
        call npm install
        if errorlevel 1 (
            echo   [ERROR] Failed to install backend dependencies
            exit /b 1
        )
        cd ..\..
        echo   [OK] Backend dependencies installed
    ) else (
        echo   [OK] Backend dependencies found
    )
    echo.

    :: Step 5: Check frontend dependencies
    echo [5/7] Checking frontend dependencies...
    if not exist "packages\frontend\node_modules" (
        echo   [WARN] Frontend dependencies not installed
        echo   [INSTALL] Running npm install in frontend...
        cd packages\frontend
        call npm install
        if errorlevel 1 (
            echo   [ERROR] Failed to install frontend dependencies
            exit /b 1
        )
        cd ..\..
        echo   [OK] Frontend dependencies installed
    ) else (
        echo   [OK] Frontend dependencies found
    )
    echo.

    :: Step 6: Verify .env files
    echo [6/7] Verifying configuration files...

    if not exist "packages\backend\.env" (
        echo   [ERROR] Backend .env file not found
        echo   Please run: bin\install.bat
        exit /b 1
    )
    echo   [OK] Backend .env found

    if not exist "packages\frontend\.env" (
        echo   [WARN] Frontend .env not found, creating...
        echo VITE_API_URL=http://localhost:3001/api/v1 > packages\frontend\.env
        echo   [OK] Frontend .env created
    ) else (
        echo   [OK] Frontend .env found
    )
    echo.

    :: Create necessary directories
    if not exist "runtime" mkdir runtime >nul 2>&1
    if not exist "logs" mkdir logs >nul 2>&1
    if not exist "backups" mkdir backups >nul 2>&1

    :: Step 7: Starting services
    echo [7/7] Starting services...
    echo.

    :: Start Backend first
    echo   [Backend] Starting API server on port 3001...

    if "!DEBUG_MODE!"=="1" (
        echo   [Backend] Opening window in DEBUG mode...
        start "EnlevoHub Backend - DEBUG MODE" cmd /c "cd packages\backend && echo [Backend] Starting... && npm run dev && pause"
    ) else (
        start "EnlevoHub Backend" /MIN cmd /c "cd packages\backend && npm run dev"
    )

    :: Wait for backend to start
    echo   [Backend] Initializing... (this may take 10-30 seconds)
    timeout /t 3 /nobreak >nul

    :: Check if backend is up
    set BACKEND_UP=0

    :: Try up to 10 times (50 seconds total)
    for /L %%i in (1,1,10) do (
        netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
        if not errorlevel 1 (
            set BACKEND_UP=1
            goto :backend_ready
        )
        if %%i LEQ 3 (
            echo   [Backend] Starting... ^(%%i/10^)
        ) else (
            echo   [Backend] Still starting... ^(%%i/10^) - Check Backend window if this takes too long
        )
        timeout /t 5 /nobreak >nul
    )

    :backend_ready
    if !BACKEND_UP!==0 (
        echo.
        echo ========================================
        echo [ERROR] Backend failed to start
        echo ========================================
        echo.
        echo The backend did not start after 50 seconds.
        echo.
        echo Common causes:
        echo   1. Database connection failed
        echo      - Check if PostgreSQL is running: netstat -ano ^| findstr ":5432"
        echo      - Verify DATABASE_URL in packages\backend\.env
        echo.
        echo   2. Port 3001 already in use
        echo      - Check: netstat -ano ^| findstr ":3001"
        echo.
        echo   3. Missing dependencies
        echo      - Run: cd packages\backend ^&^& npm install
        echo.
        echo   4. Code errors
        echo      - Check the "EnlevoHub Backend" window for error details
        echo      - Or run manually: cd packages\backend ^&^& npm run dev
        echo.
        echo Debug:
        echo   Run with debug mode to see detailed logs:
        echo   bin\enlevohub.bat start --debug
        echo.
        exit /b 1
    )

    echo   [Backend] Started successfully on port 3001
    echo.

    :: Start Frontend
    echo   [Frontend] Starting development server on port 3000...

    if "!DEBUG_MODE!"=="1" (
        echo   [Frontend] Opening window in DEBUG mode...
        start "EnlevoHub Frontend - DEBUG MODE" cmd /c "cd packages\frontend && echo [Frontend] Starting Vite... && npm run dev && pause"
    ) else (
        start "EnlevoHub Frontend" /MIN cmd /c "cd packages\frontend && npm run dev"
    )

    :: Wait for frontend to start
    echo   [Frontend] Initializing Vite... (this may take 5-15 seconds)
    timeout /t 3 /nobreak >nul

    :: Check if frontend is up
    set FRONTEND_UP=0
    set FRONTEND_PORT=3000

    :: Try up to 8 times (40 seconds total)
    for /L %%i in (1,1,8) do (
        netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
        if not errorlevel 1 (
            set FRONTEND_UP=1
            goto :frontend_ready
        )
        netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
        if not errorlevel 1 (
            set FRONTEND_UP=1
            set FRONTEND_PORT=5173
            goto :frontend_ready
        )
        if %%i LEQ 3 (
            echo   [Frontend] Starting... ^(%%i/8^)
        ) else (
            echo   [Frontend] Still starting... ^(%%i/8^)
        )
        timeout /t 5 /nobreak >nul
    )

    :frontend_ready
    if !FRONTEND_UP!==1 (
        :: Save PID info
        for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":!FRONTEND_PORT!" ^| findstr "LISTENING"') do (
            echo %%p > runtime\frontend.pid
            goto :show_success
        )

        :show_success
        echo.
        echo ========================================
        echo   EnlevoHub Started Successfully!
        echo ========================================
        echo.
        echo Services:
        echo   [OK] Backend  - http://localhost:3001
        echo   [OK] Frontend - http://localhost:!FRONTEND_PORT!
        echo   [OK] Database - PostgreSQL on port 5432
        echo.
        echo Resources:
        echo   API Docs:  http://localhost:3001/docs
        echo   Health:    http://localhost:3001/health
        echo.
        echo Management:
        echo   Status:    bin\enlevohub.bat status
        echo   Stop:      bin\enlevohub.bat stop
        echo   Restart:   bin\enlevohub.bat restart
        echo   Debug:     bin\enlevohub.bat start --debug

        if "!DEBUG_MODE!"=="1" (
            echo.
            echo Debug Info:
            echo   Backend Window:  "EnlevoHub Backend - DEBUG MODE"
            echo   Frontend Window: "EnlevoHub Frontend - DEBUG MODE"
            echo   Frontend Port:   !FRONTEND_PORT!
            if exist "runtime\frontend.pid" (
                set /p DEBUG_PID=<runtime\frontend.pid
                echo   Frontend PID:    !DEBUG_PID!
            )
            echo.
            echo   Check the windows above for detailed logs
        )

        echo.
        echo ========================================
        echo.
        echo EnlevoHub is now running in the background!
        echo.
        echo IMPORTANT:
        echo   - Do NOT close this window if you want to keep services running
        echo   - Backend and Frontend are running in separate windows
        echo   - To stop: bin\enlevohub.bat stop
        echo.

        :: Open browser (skip in debug mode to see logs first)
        if "!DEBUG_MODE!"=="0" (
            echo Opening browser...
            timeout /t 2 /nobreak >nul
            start http://localhost:!FRONTEND_PORT!
            echo.
            echo You can close this window now.
            echo Services will keep running in the background.
            echo.
        ) else (
            echo DEBUG: Browser NOT auto-opened (debug mode)
            echo DEBUG: Open manually: http://localhost:!FRONTEND_PORT!
            echo.
        )

        :: Exit successfully
        goto :end
    ) else (
        echo.
        echo ========================================
        echo FAILED: Could not start EnlevoHub
        echo ========================================
        echo.
        echo Possible causes:
        echo   - Port 3000 already in use by another application
        echo   - Node.js not installed or not in PATH
        echo   - Missing dependencies
        echo.
        echo Troubleshooting:
        echo.
        echo   1. Check if port 3000 is already in use:
        echo      netstat -ano ^| findstr ":3000"
        echo.
        echo   2. If port is in use, stop the other application
        echo      or restart your computer
        echo.
        echo   3. For advanced troubleshooting, see logs:
        echo      Check the EnlevoHub Frontend window for errors
        echo.
        echo   4. Get help:
        echo      See TROUBLESHOOTING.md for more solutions
        echo.
        exit /b 1
    )

    goto :end

:stop
    echo.
    echo Stopping EnlevoHub...
    echo.

    set STOPPED=0

    :: Stop frontend using PID file
    if exist "runtime\frontend.pid" (
        set /p FRONTEND_PID=<runtime\frontend.pid
        taskkill /PID !FRONTEND_PID! /F /T >nul 2>&1
        if not errorlevel 1 (
            echo   Stopped: Frontend ^(PID !FRONTEND_PID!^)
            set STOPPED=1
        )
        del runtime\frontend.pid >nul 2>&1
    )

    :: Kill any remaining Vite processes
    for /f "tokens=2" %%p in ('tasklist ^| findstr /i "node.exe"') do (
        wmic process where "ProcessId=%%p" get CommandLine 2>nul | findstr /i "vite" >nul 2>&1
        if not errorlevel 1 (
            taskkill /PID %%p /F /T >nul 2>&1
            echo   Stopped: Vite process ^(PID %%p^)
            set STOPPED=1
        )
    )

    :: Kill EnlevoHub daemon processes
    for /f "tokens=2" %%p in ('tasklist ^| findstr /i "node.exe"') do (
        wmic process where "ProcessId=%%p" get CommandLine 2>nul | findstr /i "enlevohub" >nul 2>&1
        if not errorlevel 1 (
            taskkill /PID %%p /F /T >nul 2>&1
            echo   Stopped: EnlevoHub daemon ^(PID %%p^)
            set STOPPED=1
        )
    )

    :: Kill PostgreSQL if running
    taskkill /IM postgres.exe /F >nul 2>&1
    if not errorlevel 1 (
        echo   Stopped: PostgreSQL
        set STOPPED=1
    )

    :: Clean up PID files
    if exist "runtime\enlevohub.pid" del runtime\enlevohub.pid >nul 2>&1

    echo.
    if !STOPPED!==1 (
        echo ========================================
        echo SUCCESS: EnlevoHub stopped
        echo ========================================
    ) else (
        echo ========================================
        echo INFO: EnlevoHub was not running
        echo ========================================
    )
    echo.
    goto :end

:restart
    echo.
    echo Restarting EnlevoHub...
    echo.

    call :stop
    echo Waiting 3 seconds...
    timeout /t 3 /nobreak >nul
    echo.
    call :start
    goto :end

:status
    echo.
    echo EnlevoHub Status
    echo ================
    echo.

    :: Initialize variables
    set DAEMON_STATUS=STOPPED
    set DAEMON_PID=-
    set FRONTEND_STATUS=STOPPED
    set FRONTEND_PID=-
    set FRONTEND_PORT=-
    set BACKEND_STATUS=STOPPED
    set BACKEND_PID=-
    set BACKEND_PORT=-
    set DATABASE_STATUS=STOPPED
    set DATABASE_PID=-
    set DATABASE_PORT=-

    :: Check Daemon
    if exist "runtime\enlevohub.pid" (
        set /p DAEMON_PID=<runtime\enlevohub.pid
        tasklist /FI "PID eq !DAEMON_PID!" 2>nul | find /I "node.exe" >nul
        if not errorlevel 1 (
            set DAEMON_STATUS=RUNNING
        ) else (
            set DAEMON_PID=-
        )
    )

    :: Check Frontend (port 3000)
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING" 2^>nul') do (
        set FRONTEND_PID=%%p
        set FRONTEND_STATUS=RUNNING
        set FRONTEND_PORT=3000
        goto :check_backend
    )
    :check_backend

    :: Check Backend (port 3001)
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING" 2^>nul') do (
        set BACKEND_PID=%%p
        set BACKEND_STATUS=RUNNING
        set BACKEND_PORT=3001
        goto :check_database
    )
    :check_database

    :: Check Database (port 5432)
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5432" ^| findstr "LISTENING" 2^>nul') do (
        set DATABASE_PID=%%p
        set DATABASE_STATUS=RUNNING
        set DATABASE_PORT=5432
        goto :display_status
    )
    :display_status

    :: Display table
    echo Service         Name                      Status      PID       Port
    echo -------         ----                      ------      ---       ----
    echo Frontend        frontend-service          !FRONTEND_STATUS!       !FRONTEND_PID!      !FRONTEND_PORT!
    echo Backend         backend-service           !BACKEND_STATUS!       !BACKEND_PID!      !BACKEND_PORT!
    echo Database        postgres-database         !DATABASE_STATUS!       !DATABASE_PID!      !DATABASE_PORT!
    echo Daemon          enlevohub-daemon          !DAEMON_STATUS!       !DAEMON_PID!      -
    echo.

    :: Overall Status
    if "!DAEMON_STATUS!"=="RUNNING" (
        echo Overall Status: RUNNING
    ) else (
        echo Overall Status: STOPPED
    )
    echo.

    :: Show additional info if running
    if "!DAEMON_STATUS!"=="RUNNING" (
        echo Health Checks:

        :: Frontend health
        curl -s http://localhost:3000 >nul 2>&1
        if not errorlevel 1 (
            echo   Frontend:     OK ^(http://localhost:3000^)
        ) else (
            if "!FRONTEND_STATUS!"=="RUNNING" (
                echo   Frontend:     NO RESPONSE ^(port open but not responding^)
            ) else (
                echo   Frontend:     STOPPED
            )
        )

        :: Backend health
        curl -s http://localhost:3001/health >nul 2>&1
        if not errorlevel 1 (
            echo   Backend:      OK ^(http://localhost:3001^)
        ) else (
            if "!BACKEND_STATUS!"=="RUNNING" (
                echo   Backend:      NO RESPONSE ^(port open but not responding^)
            ) else (
                echo   Backend:      STOPPED
            )
        )

        :: API Docs
        curl -s http://localhost:3001/docs >nul 2>&1
        if not errorlevel 1 (
            echo   API Docs:     OK ^(http://localhost:3001/docs^)
        ) else (
            echo   API Docs:     NOT AVAILABLE
        )

        echo.
        echo Resources:

        :: Log size
        if exist "logs\enlevohub.log" (
            for %%F in ("logs\enlevohub.log") do (
                set size=%%~zF
                set /a sizekb=!size!/1024
                echo   Log Size:     !sizekb! KB
            )
        ) else (
            echo   Log Size:     0 KB
        )

        :: Memory usage (total for all node processes)
        set TOTAL_MEM=0
        for /f "skip=3 tokens=5" %%m in ('tasklist /FI "IMAGENAME eq node.exe" 2^>nul') do (
            set MEM=%%m
            set MEM=!MEM:,=!
            set /a TOTAL_MEM+=!MEM!
        )
        set /a TOTAL_MEM_MB=!TOTAL_MEM!/1024
        if !TOTAL_MEM_MB! GTR 0 (
            echo   Memory:       !TOTAL_MEM_MB! MB
        )

        echo.
        echo Quick Actions:
        echo   View logs:    type logs\enlevohub.log
        echo   Restart:      enlevohub.bat restart
        echo   Stop:         enlevohub.bat stop
    ) else (
        echo To start:
        echo   enlevohub.bat start
    )

    echo.
    goto :end

:end
endlocal
