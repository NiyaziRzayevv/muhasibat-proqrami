@echo off
cd /d "%~dp0"

:: Admin yoxlanışı
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Administrator huququ var.
) else (
    echo [DIQQET] Administrator huququ yoxdur! Avtomatik teleb olunur...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

echo "Proqram hazirlanir..."
echo "Zehmet olmasa gozleyin, kohne fayllar silinir..."

:: Prosesləri bağla
taskkill /F /IM SmartQeyd.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Cache qovluğunu təyin et (icazə xətası olmaması üçün)
set ELECTRON_BUILDER_CACHE=%~dp0\build-cache
if not exist build-cache mkdir build-cache

:: winCodeSign qovluğunu sil ki, təzədən təmiz yükləsin
if exist build-cache\winCodeSign (
    echo "winCodeSign təmizlənir..."
    rmdir /s /q build-cache\winCodeSign
)

:: dist qovluğunu təmizlə
if exist dist-electron (
    echo "Köhne build silinir..."
    rmdir /s /q dist-electron 2>nul
    if exist dist-electron ren dist-electron dist-electron-bak-%RANDOM%
)

echo "Setup yaradilir..."
echo "Bu proses internetden alətləri yükləyəcək, zəhmət olmasa gözləyin..."

call npm run build

if %errorlevel% neq 0 (
    echo.
    echo "XETA BAS VERDI!"
    echo "Zehmet olmasa internet elaqesini yoxlayin ve yeniden cəhd edin."
) else (
    echo.
    echo "TEBRIKLER! Setup fayli hazirdir."
    echo "Yeri: dist-electron/SmartQeyd Setup 1.0.0.exe"
)
pause
