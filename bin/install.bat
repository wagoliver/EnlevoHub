@echo off
setlocal enabledelayedexpansion

:: EnlevoHub Installer for Windows
:: Installs everything needed to run EnlevoHub

set ENLEVOHUB_HOME=%~dp0..\
set POSTGRES_VERSION=16
set DB_NAME=enlevohub

echo.
echo ========================================
echo   EnlevoHub Installer
echo ========================================
echo.
echo This will install and configure:
echo   - PostgreSQL %POSTGRES_VERSION% (if not installed)
echo   - Node.js dependencies
echo   - Database setup
echo.

:: Ask for PostgreSQL password
echo ========================================
echo   PostgreSQL Configuration
echo ========================================
echo.
echo You need to set a password for PostgreSQL database.
echo This password will be used for all database connections.
echo.
echo IMPORTANT: Remember this password! You'll need it to manage the database.
echo.
echo Suggestions:
echo   - Use at least 12 characters
echo   - Mix letters, numbers, and symbols (avoid @ and special URL chars)
echo   - Example: MySecurePass2024!
echo.

:ask_password
:: Use PowerShell to read password securely (with asterisks)
echo Enter PostgreSQL password:
for /f "delims=" %%p in ('powershell -Command "$p = Read-Host -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p))"') do set POSTGRES_PASSWORD=%%p

if "%POSTGRES_PASSWORD%"=="" (
    echo.
    echo   [ERROR] Password cannot be empty!
    echo.
    goto :ask_password
)

:: Confirm password
echo.
echo Confirm PostgreSQL password:
for /f "delims=" %%p in ('powershell -Command "$p = Read-Host -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p))"') do set POSTGRES_PASSWORD_CONFIRM=%%p

if not "%POSTGRES_PASSWORD%"=="%POSTGRES_PASSWORD_CONFIRM%" (
    echo.
    echo   [ERROR] Passwords do not match! Try again.
    echo.
    goto :ask_password
)

echo.
echo   [OK] Password set successfully!
echo.
echo Press any key to continue installation...
pause >nul

cd /d "%ENLEVOHUB_HOME%"

:: ========================================
:: Step 1: Check if PostgreSQL is installed
:: ========================================
echo.
echo [1/6] Checking PostgreSQL...

where psql >nul 2>&1
if %errorlevel% equ 0 (
    echo   PostgreSQL is already installed!
    goto :node_check
)

where pg_ctl >nul 2>&1
if %errorlevel% equ 0 (
    echo   PostgreSQL is already installed!
    goto :node_check
)

echo   PostgreSQL not found.
echo.
echo   Choose installation method:
echo   1) Install from local package (Recommended - Fast, Offline)
echo   2) Download latest version (Requires internet)
echo   3) Use existing PostgreSQL (Manual setup)
echo   0) Cancel installation
echo.
set /p INSTALL_CHOICE="  Option [1-3, 0=cancel, default=1]: "
if "%INSTALL_CHOICE%"=="" set INSTALL_CHOICE=1

if "%INSTALL_CHOICE%"=="0" (
    echo.
    echo   Installation cancelled.
    pause
    exit /b 0
)

if "%INSTALL_CHOICE%"=="3" (
    echo.
    echo   Please install PostgreSQL manually and run this installer again.
    echo   Download: https://www.postgresql.org/download/windows/
    echo   Password: %POSTGRES_PASSWORD%
    pause
    exit /b 0
)

:: ========================================
:: Step 2: Install PostgreSQL Silently
:: ========================================
echo.
echo [2/6] Installing PostgreSQL %POSTGRES_VERSION%...

if "%INSTALL_CHOICE%"=="1" (
    :: Option 1: Install from local package
    set LOCAL_INSTALLER=installers\postgresql-16.4-1-windows-x64.exe

    if exist "!LOCAL_INSTALLER!" (
        echo   Using local installer: !LOCAL_INSTALLER!
        set INSTALLER_PATH=!LOCAL_INSTALLER!
        goto :do_install
    ) else (
        echo.
        echo   ERROR: Local installer not found: !LOCAL_INSTALLER!
        echo   Falling back to online download...
        echo.
        timeout /t 3 /nobreak >nul
        goto :download_installer
    )
)

if "%INSTALL_CHOICE%"=="2" (
    :: Option 2: Download from internet
    goto :download_installer
)

:: Invalid choice
echo   Invalid option. Please run installer again.
pause
exit /b 1

:download_installer
echo   Downloading PostgreSQL installer...
echo   This may take 5-10 minutes depending on your connection...

:: Create temp directory
if not exist "temp" mkdir temp

:: Download PostgreSQL installer
set INSTALLER_URL=https://get.enterprisedb.com/postgresql/postgresql-16.4-1-windows-x64.exe
set INSTALLER_PATH=temp\postgresql-installer.exe

echo   Downloading from: %INSTALLER_URL%
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%INSTALLER_URL%' -OutFile '%INSTALLER_PATH%'}"

if not exist "%INSTALLER_PATH%" (
    echo.
    echo   ERROR: Failed to download PostgreSQL installer
    echo.
    echo   Please check your internet connection or choose option 3 to install manually.
    echo.
    pause
    exit /b 1
)

:do_install
echo   Installing PostgreSQL silently...
echo   This may take 5-10 minutes...

:: Install silently
"%INSTALLER_PATH%" ^
    --mode unattended ^
    --superpassword "%POSTGRES_PASSWORD%" ^
    --serverport 5432 ^
    --install_runtimes 0

if %errorlevel% neq 0 (
    echo.
    echo   ERROR: PostgreSQL installation failed
    echo.
    echo   Please install manually:
    echo   https://www.postgresql.org/download/windows/
    echo.
    pause
    exit /b 1
)

:: Add PostgreSQL to PATH
set "PG_BIN=C:\Program Files\PostgreSQL\%POSTGRES_VERSION%\bin"
if exist "%PG_BIN%" (
    setx PATH "%PATH%;%PG_BIN%" >nul 2>&1
    set "PATH=%PATH%;%PG_BIN%"
)

echo   PostgreSQL installed successfully!

:: Clean up downloaded installer (keep local package)
if exist "temp\postgresql-installer.exe" del "temp\postgresql-installer.exe"

:postgres_installed
echo.
echo   Configuring PostgreSQL service...

:: Update PostgreSQL password (works for both new and existing installations)
echo.
echo   Updating PostgreSQL password...

:: Find and configure PostgreSQL service
set PG_SERVICE_FOUND=0

:: Try common service names
for %%s in (postgresql-x64-16 postgresql-16 postgresql) do (
    sc query %%s >nul 2>&1
    if not errorlevel 1 (
        echo   Found PostgreSQL service: %%s

        :: Configure to start automatically
        sc config %%s start= auto >nul 2>&1
        echo   Configured for automatic startup

        :: Start the service
        echo   Starting PostgreSQL service...
        net start %%s >nul 2>&1
        if not errorlevel 1 (
            echo   PostgreSQL service started successfully
            set PG_SERVICE_FOUND=1
            goto :pg_service_configured
        ) else (
            echo   Note: Service will start on next boot
            set PG_SERVICE_FOUND=1
            goto :pg_service_configured
        )
    )
)

:pg_service_configured
if !PG_SERVICE_FOUND!==0 (
    echo   Warning: PostgreSQL service not found, will try to start manually...
)

echo   Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

:: Verify PostgreSQL is running
netstat -ano | findstr ":5432" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo   Warning: PostgreSQL may not be running on port 5432
    echo   Attempting to start...

    :: Try pg_ctl if service didn't work
    if exist "C:\Program Files\PostgreSQL\%POSTGRES_VERSION%\bin\pg_ctl.exe" (
        "C:\Program Files\PostgreSQL\%POSTGRES_VERSION%\bin\pg_ctl" start -D "C:\Program Files\PostgreSQL\%POSTGRES_VERSION%\data" >nul 2>&1
        timeout /t 3 /nobreak >nul
    )
)

:: Final verification
netstat -ano | findstr ":5432" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo   PostgreSQL is running on port 5432
) else (
    echo   Warning: PostgreSQL is not responding on port 5432
    echo   You may need to start it manually before using EnlevoHub
    pause
    exit /b 1
)

:: Set PostgreSQL password reliably
echo.
echo   Setting PostgreSQL password...

set "PG_BIN=C:\Program Files\PostgreSQL\%POSTGRES_VERSION%\bin"
set "PG_DATA=C:\Program Files\PostgreSQL\%POSTGRES_VERSION%\data"
set "PG_HBA=%PG_DATA%\pg_hba.conf"

:: Step 1: Try connecting with the password set by installer
set PGPASSWORD=%POSTGRES_PASSWORD%
"%PG_BIN%\psql.exe" -U postgres -h 127.0.0.1 -c "SELECT 1" >nul 2>&1
if not errorlevel 1 (
    echo   [OK] PostgreSQL password is already configured correctly
    goto :password_done
)

:: Step 2: Try common default passwords
for %%p in (postgres root admin) do (
    set PGPASSWORD=%%p
    "%PG_BIN%\psql.exe" -U postgres -h 127.0.0.1 -c "ALTER USER postgres PASSWORD '!POSTGRES_PASSWORD!';" >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] PostgreSQL password updated successfully
        set PGPASSWORD=%POSTGRES_PASSWORD%
        goto :password_done
    )
)

:: Step 3: Fallback - temporarily use trust auth in pg_hba.conf
echo   Using pg_hba.conf trust method to set password...

:: Backup pg_hba.conf
copy "%PG_HBA%" "%PG_HBA%.bak" >nul 2>&1

:: Write temporary trust-based pg_hba.conf
(
    echo # Temporary trust configuration for password setup
    echo host    all    all    127.0.0.1/32    trust
    echo host    all    all    ::1/128         trust
) > "%PG_HBA%"

:: Reload PostgreSQL config
"%PG_BIN%\pg_ctl.exe" reload -D "%PG_DATA%" >nul 2>&1
timeout /t 2 /nobreak >nul

:: Set the password via trust connection
set PGPASSWORD=
"%PG_BIN%\psql.exe" -U postgres -h 127.0.0.1 -c "ALTER USER postgres PASSWORD '%POSTGRES_PASSWORD%';" >nul 2>&1
if not errorlevel 1 (
    echo   [OK] PostgreSQL password set successfully
) else (
    echo   [WARN] Could not set PostgreSQL password
    echo   Please set manually: psql -U postgres -c "ALTER USER postgres PASSWORD 'yourpassword';"
)

:: Restore pg_hba.conf from backup
copy "%PG_HBA%.bak" "%PG_HBA%" >nul 2>&1
del "%PG_HBA%.bak" >nul 2>&1

:: Reload PostgreSQL config again
"%PG_BIN%\pg_ctl.exe" reload -D "%PG_DATA%" >nul 2>&1
timeout /t 2 /nobreak >nul

:: Verify the password works
set PGPASSWORD=%POSTGRES_PASSWORD%
"%PG_BIN%\psql.exe" -U postgres -h 127.0.0.1 -c "SELECT 1" >nul 2>&1
if not errorlevel 1 (
    echo   [OK] Password verified successfully
) else (
    echo   [WARN] Password verification failed
    echo   You may need to set the password manually
)

:password_done
set PGPASSWORD=%POSTGRES_PASSWORD%

:: ========================================
:: Step 3: Create Database
:: ========================================
:node_check
echo.
echo [3/6] Creating database...

:: Set PostgreSQL password for current session
set PGPASSWORD=%POSTGRES_PASSWORD%

:: Create database
"%PG_BIN%\psql.exe" -U postgres -h 127.0.0.1 -tc "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" 2>nul | findstr "1" >nul
if %errorlevel% neq 0 (
    echo   Creating database '%DB_NAME%'...
    "%PG_BIN%\createdb.exe" -U postgres -h 127.0.0.1 %DB_NAME%
    if %errorlevel% neq 0 (
        echo   ERROR: Failed to create database
        echo.
        echo   Please create manually:
        echo   psql -U postgres -h 127.0.0.1
        echo   CREATE DATABASE %DB_NAME%;
        echo.
        pause
        exit /b 1
    )
    echo   Database created successfully!
) else (
    echo   Database '%DB_NAME%' already exists!
)

:: ========================================
:: Step 4: Check Node.js
:: ========================================
echo.
echo [4/6] Checking Node.js...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   ERROR: Node.js is not installed
    echo.
    echo   Please install Node.js 20+ from:
    echo   https://nodejs.org/
    echo.
    echo   Then run this installer again.
    echo.
    pause
    exit /b 1
)

node --version
echo   Node.js is installed!

:: ========================================
:: Step 5: Install Dependencies
:: ========================================
echo.
echo [5/6] Installing dependencies...
echo   This may take a few minutes...

call npm install
if %errorlevel% neq 0 (
    echo   ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo   Dependencies installed!

:: ========================================
:: Step 6: Setup Database Schema
:: ========================================
echo.
echo [6/6] Setting up database schema...

:: Create/update .env file
if not exist "packages\backend\.env" (
    echo   Creating .env file...
    (
        echo # Database
        echo DATABASE_URL="postgresql://postgres:%POSTGRES_PASSWORD%@localhost:5432/%DB_NAME%"
        echo.
        echo # Application
        echo NODE_ENV="development"
        echo PORT=3001
        echo HOST="0.0.0.0"
        echo.
        echo # JWT
        echo JWT_SECRET="enlevohub-secret-key-change-in-production"
        echo JWT_EXPIRES_IN="15m"
        echo JWT_REFRESH_EXPIRES_IN="7d"
        echo.
        echo # Upload
        echo UPLOAD_MAX_SIZE="10485760"
        echo.
        echo # Logs
        echo LOG_LEVEL="info"
    ) > packages\backend\.env
)

:: Generate Prisma Client and run migrations
cd packages\backend

echo   Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo   ERROR: Failed to generate Prisma Client
    pause
    exit /b 1
)

echo   Running database migrations...
call npx prisma migrate deploy
if %errorlevel% neq 0 (
    echo   Running first migration...
    call npx prisma migrate dev --name init
)
cd ..\..

:: Create frontend .env
if not exist "packages\frontend\.env" (
    echo   Creating frontend .env...
    echo VITE_API_URL=http://localhost:3001/api/v1 > packages\frontend\.env
)

:: Save credentials for reference
echo.
echo   Saving credentials reference...
(
    echo EnlevoHub - Database Credentials
    echo =================================
    echo.
    echo Host:     localhost
    echo Port:     5432
    echo Database: %DB_NAME%
    echo User:     postgres
    echo Password: %POSTGRES_PASSWORD%
    echo.
    echo Generated: %DATE% %TIME%
    echo.
    echo IMPORTANT: Keep this file secure and do not commit to version control!
) > .db-credentials.txt

echo   Credentials saved to: .db-credentials.txt

:: ========================================
:: Done!
:: ========================================
echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo   PostgreSQL Configuration:
echo   ------------------------
echo   Host:     localhost
echo   Port:     5432
echo   Database: %DB_NAME%
echo   User:     postgres
echo   Password: %POSTGRES_PASSWORD%
echo.
echo   [IMPORTANT] Credentials saved in: .db-credentials.txt
echo   Keep this file secure!
echo.
echo   To start EnlevoHub:
echo   bin\enlevohub.bat start
echo.
echo   First time setup:
echo   1. Run: bin\enlevohub.bat start
echo   2. Open: http://localhost:3000
echo   3. Create your account
echo.
echo ========================================
echo.
pause
