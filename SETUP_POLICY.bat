@echo off
title NHIF SigWeb Loader - Policy Setup
color 0A

:: -------------------------------------------------------
:: Self-elevate to Administrator if not already elevated
:: -------------------------------------------------------
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator access...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo  NHIF SigWeb Loader - Policy Setup
echo  ===================================
echo  This installs the extension permanently for Edge and Chrome
echo  with NO Developer Mode popup.
echo.

set SRC=%~dp0
if "%SRC:~-1%"=="\" set SRC=%SRC:~0,-1%
set DEST=C:\nhif-sigweb-loader
set EXT_ID=onlfllkbkcnbcijcnnpgheccmoghmnak

:: -------------------------------------------------------
:: 1. Copy extension folder to C:\nhif-sigweb-loader
:: -------------------------------------------------------
echo Step 1: Copying extension to %DEST% ...
if not exist "%DEST%" mkdir "%DEST%"
xcopy /E /Y /Q "%SRC%\*" "%DEST%\"
echo Done.
echo.

:: -------------------------------------------------------
:: 2. Write update.xml pointing to the installed CRX
:: -------------------------------------------------------
echo Step 2: Writing update.xml ...
(
echo ^<?xml version='1.0' encoding='UTF-8'^?>
echo ^<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'^>
echo   ^<app appid='%EXT_ID%'^>
echo     ^<updatecheck codebase='file:///C:/nhif-sigweb-loader/nhif-sigweb-loader.crx' version='1.1' /^>
echo   ^</app^>
echo ^</gupdate^>
) > "%DEST%\update.xml"
echo Done.
echo.

:: -------------------------------------------------------
:: 3. Register with Edge Group Policy
:: -------------------------------------------------------
echo Step 3: Setting Edge policy ...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /v 1 /t REG_SZ /d "%EXT_ID%;file:///C:/nhif-sigweb-loader/update.xml" /f
if %errorLevel%==0 (echo Edge: OK) else (echo Edge: may already exist or Edge not installed)
echo.

:: -------------------------------------------------------
:: 4. Register with Chrome Group Policy
:: -------------------------------------------------------
echo Step 4: Setting Chrome policy ...
reg add "HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" /v 1 /t REG_SZ /d "%EXT_ID%;file:///C:/nhif-sigweb-loader/update.xml" /f
if %errorLevel%==0 (echo Chrome: OK) else (echo Chrome: may already exist or Chrome not installed)
echo.

:: -------------------------------------------------------
:: 5. Done
:: -------------------------------------------------------
echo  ============================================
echo   Setup complete!
echo   Extension ID: %EXT_ID%
echo  ============================================
echo.
echo  NEXT STEPS:
echo  1. Close ALL Edge / Chrome windows completely
echo  2. Reopen Edge or Chrome normally
echo  3. The extension installs automatically - no
echo     Developer Mode toggle, no popup, ever.
echo.
echo  If asked "Disable developer mode extensions?"
echo  click CANCEL - that only appears once on first
echo  install and won't show again.
echo.
pause
