@echo off
echo Testing paths...
echo.
echo Script location: %~dp0
echo ENLEVOHUB_HOME: %~dp0..\
echo.
cd /d "%~dp0..\"
echo Current directory after cd: %cd%
echo.
if exist "installers\postgresql-16.4-1-windows-x64.exe" (
    echo SUCCESS: Found installers\postgresql-16.4-1-windows-x64.exe
) else (
    echo ERROR: installers\postgresql-16.4-1-windows-x64.exe not found
)
echo.
pause
