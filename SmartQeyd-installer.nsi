; SmartQeyd NSIS Installer Script
Unicode true

!define APP_NAME "SmartQeyd"
!define APP_VERSION "1.5.8"
!define APP_PUBLISHER "SmartQeyd"
!define APP_EXE "SmartQeyd.exe"
!define APP_DIR "dist-electron\SmartQeyd-win32-x64"
!define INSTALL_DIR "$PROGRAMFILES64\${APP_NAME}"
!define REG_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
!define OUTPUT_FILE "dist-electron\SmartQeyd-Setup-${APP_VERSION}.exe"

; Include modern UI
!include "MUI2.nsh"

; General settings
Name "${APP_NAME} ${APP_VERSION}"
OutFile "${OUTPUT_FILE}"
InstallDir "${INSTALL_DIR}"
InstallDirRegKey HKLM "${REG_KEY}" "InstallLocation"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

; Icon
!define MUI_ICON "assets\logo.ico"
!define MUI_UNICON "assets\logo.ico"

; UI settings
!define MUI_ABORTWARNING

; Welcome/Finish page logo (big)
!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\installer-welcome.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "assets\installer-welcome.bmp"

; Header logo
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "assets\installer-header.bmp"
!define MUI_HEADERIMAGE_RIGHT

!define MUI_WELCOMEPAGE_TITLE "${APP_NAME} Qurulum Sehberi"
!define MUI_WELCOMEPAGE_TEXT "Bu sehber ${APP_NAME} ${APP_VERSION} versiyasini kompyuterinize qurmaginizda kome edecek.$\r$\n$\r$\nDavam etmeden once diger butun proqramlari baglayin.$\r$\n$\r$\nDavam etmek ucun 'Sonraki' duzmeye basin."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "${APP_NAME} proqramini indi acin"
!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "English"

; Installer section
Section "Install" SecInstall
  SetOutPath "$INSTDIR"
  
  ; Copy all application files
  File /r "${APP_DIR}\*.*"
  
  ; Copy icon file
  File /oname=SmartQeyd.ico "assets\logo.ico"
  
  ; Create desktop shortcut
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\SmartQeyd.ico" 0
  
  ; Create start menu shortcut
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\SmartQeyd.ico" 0
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}-i sil.lnk" "$INSTDIR\uninstall.exe"
  
  ; Write registry entries
  WriteRegStr HKLM "${REG_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "${REG_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "${REG_KEY}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "${REG_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${REG_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKLM "${REG_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${REG_KEY}" "NoRepair" 1
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; Uninstaller section
Section "Uninstall"
  ; Stop any running instances
  ExecWait 'taskkill /f /im "${APP_EXE}" /t' $0
  
  ; Wait a moment for processes to close
  Sleep 1000
  
  ; Remove application files
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$DESKTOP\${APP_NAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APP_NAME}"
  
  ; Remove registry entries
  DeleteRegKey HKLM "${REG_KEY}"
  
  ; Remove user data (optional - ask user)
  MessageBox MB_YESNO "İstifadəçi məlumatlarını da silmək istəyirsiniz?" IDNO skip_userdata
  RMDir /r "$APPDATA\${APP_NAME}"
  skip_userdata:
SectionEnd
