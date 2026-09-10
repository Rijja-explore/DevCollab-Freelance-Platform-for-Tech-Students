@echo off
REM Minimal Maven wrapper entrypoint.
REM Falls back to mvn when available.
where mvn >nul 2>&1
if %errorlevel% equ 0 (
  mvn %*
  exit /b %errorlevel%
)

echo mvn not found on PATH. Install Maven or generate the official Maven Wrapper files.
exit /b 1
