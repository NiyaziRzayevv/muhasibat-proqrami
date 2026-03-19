!macro customInit
  ; SmartQeyd prosesini avtomatik bağla (installer başlamazdan əvvəl)
  nsExec::ExecToLog 'taskkill /F /IM "SmartQeyd.exe"'
  Sleep 1000
!macroend

!macro customInstall
  ; Masaüstü qısayolunun ikonunu düzgün təyin et
  SetOutPath "$INSTDIR"
  File "/oname=app.ico" "${BUILD_RESOURCES_DIR}\icon.ico"
  CreateShortCut "$DESKTOP\SmartQeyd.lnk" "$INSTDIR\SmartQeyd.exe" "" "$INSTDIR\app.ico" 0
  CreateShortCut "$SMPROGRAMS\SmartQeyd\SmartQeyd.lnk" "$INSTDIR\SmartQeyd.exe" "" "$INSTDIR\app.ico" 0
!macroend
