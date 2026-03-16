@echo off
setlocal
cd /d "%~dp0"

set "SRC=%~dp0dist-output\win-unpacked"
if not exist "%SRC%\SmartQeyd.exe" (
  echo [XETA] Tapilmadi: "%SRC%\SmartQeyd.exe"
  echo Evvel "dist-output\win-unpacked" qovlugunda SmartQeyd.exe olmalidir.
  pause
  exit /b 1
)

net session >nul 2>&1
if %errorlevel%==0 (
  set "DEST=%ProgramFiles%\SmartQeyd"
  echo [OK] Administrator rejimi. Qurasdirma: "%DEST%"
) else (
  set "DEST=%LocalAppData%\SmartQeyd"
  echo [OK] Normal rejim. Qurasdirma: "%DEST%"
)

taskkill /F /IM SmartQeyd.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1

if not exist "%DEST%" mkdir "%DEST%"

echo Kopyalanir...
robocopy "%SRC%" "%DEST%" /E /R:1 /W:1 /NFL /NDL /NP /NJH /NJS >nul
if %errorlevel% GEQ 8 (
  echo [XETA] Kopyalama alinmadi.
  pause
  exit /b 2
)

set "DESKTOP=%USERPROFILE%\Desktop"
set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%DESKTOP%\SmartQeyd.lnk');" ^
  "$s.TargetPath='%DEST%\SmartQeyd.exe';" ^
  "$s.WorkingDirectory='%DEST%';" ^
  "$s.IconLocation='%DEST%\SmartQeyd.exe,0';" ^
  "$s.Save();" ^
  "$s2=(New-Object -ComObject WScript.Shell).CreateShortcut('%STARTMENU%\SmartQeyd.lnk');" ^
  "$s2.TargetPath='%DEST%\SmartQeyd.exe';" ^
  "$s2.WorkingDirectory='%DEST%';" ^
  "$s2.IconLocation='%DEST%\SmartQeyd.exe,0';" ^
  "$s2.Save();"

echo [OK] Qurasdirma tamamlandi.
start "" "%DEST%\SmartQeyd.exe"
exit /b 0

