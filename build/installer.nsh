!macro customInit
  ; SmartQeyd prosesini avtomatik bağla (installer başlamazdan əvvəl)
  nsExec::ExecToLog 'taskkill /F /IM "SmartQeyd.exe"'
  Sleep 1000
!macroend
