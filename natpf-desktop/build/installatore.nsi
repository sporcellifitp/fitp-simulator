; NATPF Simulator: installazione per Windows 10/11 a 64 bit (richiesta del 04/11/2026).
; Compilata con makensis (anche da Linux, senza wine) da natpf-desktop/scripts/costruisci.mjs, che passa:
;   VERSION (2026.1104.5)  BUILD (2026-11-04.5)  SRC (dist/win-unpacked)  ELENCO (dist/elenco.nsh: file del programma)
;   ICONA, LATO, TESTATA (grafica in build/)  OUT (eseguibile da creare)
; Fa: copia il programma in Programmi, collegamenti nel menu Start e sul desktop, regola del firewall di Windows
; «NATPF Simulator» (solo rete locale: i telefoni raggiungono il gioco), voce in «App installate» con la
; disinstallazione. I dati (certificati, impostazioni, registri) restano in %LOCALAPPDATA%\NATPF.
; Il programma di disinstallazione si scrive durante l'installazione (WriteUninstaller): niente wine per costruirlo.
Unicode true
ManifestDPIAware true
SetCompressor /SOLID lzma
SetCompressorDictSize 64

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "WinVer.nsh"
!include "${ELENCO}"

!define NOME "NATPF Simulator"
!define EXE "NATPF Simulator.exe"
!define DISINST "Disinstalla NATPF Simulator.exe"
!define CHIAVE "Software\Microsoft\Windows\CurrentVersion\Uninstall\NATPF Simulator"
!define REGOLA "NATPF Simulator"

Name "${NOME}"
Caption "Installazione di ${NOME} ${BUILD}"
UninstallCaption "Disinstallazione di ${NOME}"
OutFile "${OUT}"
InstallDir "$PROGRAMFILES64\${NOME}"
RequestExecutionLevel admin
BrandingText "${NOME} ${BUILD}"

!define MUI_ICON "${ICONA}"
!define MUI_UNICON "${ICONA}"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${LATO}"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "${LATO}"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "${TESTATA}"
!define MUI_HEADERIMAGE_UNBITMAP "${TESTATA}"
!define MUI_ABORTWARNING

!define MUI_WELCOMEPAGE_TITLE "Installazione di ${NOME}"
!define MUI_WELCOMEPAGE_TEXT "Versione ${BUILD}.$\r$\n$\r$\nVerranno creati i collegamenti nel menu Start e sul desktop e una regola del firewall di Windows che apre il gioco ai telefoni della rete locale (solo dispositivi della stessa rete).$\r$\n$\r$\nSe NATPF Simulator è aperto, verrà chiuso.$\r$\n$\r$\nFai clic su Avanti per continuare."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TITLE "${NOME} è installato"
!define MUI_FINISHPAGE_TEXT "Avvialo dal collegamento sul desktop o dal menu Start.$\r$\n$\r$\nIl gioco si apre a schermo intero sul monitor più grande (il ledwall, se collegato come monitor esteso). Menu nascosto: tasto Alt. F11 schermo intero, Ctrl+Maiusc+M monitor successivo.$\r$\n$\r$\nCertificati e impostazioni: %LOCALAPPDATA%\NATPF (restano anche se disinstalli)."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Avvia NATPF Simulator"
!define MUI_FINISHPAGE_RUN_FUNCTION Avvia
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Italian"

VIProductVersion "${VERSION}.0"
VIFileVersion "${VERSION}.0"
VIAddVersionKey /LANG=${LANG_ITALIAN} "ProductName" "${NOME}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "FileDescription" "Installazione di ${NOME}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "ProductVersion" "${BUILD}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "CompanyName" "${NOME}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "LegalCopyright" "${NOME}"

; NATPF Simulator aperto (i file sarebbero bloccati): si chiude, chiedendo prima
!macro ChiudiProgramma
  nsExec::ExecToStack 'cmd.exe /c tasklist /FI "IMAGENAME eq ${EXE}" /NH | find /I "${EXE}"'
  Pop $0
  Pop $1
  ${If} $0 == 0
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "NATPF Simulator è aperto: per continuare verrà chiuso." /SD IDOK IDOK +2
    Abort "Annullato: NATPF Simulator è ancora aperto."
    DetailPrint "Chiusura di NATPF Simulator"
    nsExec::Exec 'taskkill /F /T /IM "${EXE}"'
    Pop $0
    Sleep 2000
  ${EndIf}
!macroend

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "NATPF Simulator richiede Windows 10 o 11 a 64 bit." /SD IDOK
    Abort
  ${EndIf}
  ${IfNot} ${AtLeastBuild} 10240
    MessageBox MB_ICONSTOP "NATPF Simulator richiede Windows 10 o 11 a 64 bit." /SD IDOK
    Abort
  ${EndIf}
  SetRegView 64
  ; aggiornamento: stessa cartella dell'installazione precedente
  ReadRegStr $0 HKLM "${CHIAVE}" "InstallLocation"
  ${If} $0 != ""
    StrCpy $INSTDIR $0
  ${EndIf}
FunctionEnd

; avvio dalla pagina finale senza i permessi di amministratore dell'installazione (lo apre Esplora risorse)
Function Avvia
  Exec '"$WINDIR\explorer.exe" "$INSTDIR\${EXE}"'
FunctionEnd

Section "NATPF Simulator"
  SectionIn RO
  SetRegView 64
  SetShellVarContext all
  !insertmacro ChiudiProgramma
  ; versione precedente nella stessa cartella: via i suoi file (solo quelli del programma), poi i nuovi
  ${If} ${FileExists} "$INSTDIR\${EXE}"
    DetailPrint "Aggiornamento della versione precedente"
    !insertmacro RimuoviProgramma
  ${EndIf}
  SetOutPath "$INSTDIR"
  File /r "${SRC}/*"
  WriteUninstaller "$INSTDIR\${DISINST}"

  CreateShortCut "$SMPROGRAMS\${NOME}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  CreateShortCut "$DESKTOP\${NOME}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0

  ; firewall: HTTPS del gioco (8443), pagina del certificato (8081), WebRTC dei telefoni; solo dalla rete locale
  DetailPrint "Regola del firewall di Windows «${REGOLA}» (solo rete locale)"
  ; via anche le regole legate all'eseguibile: se qualcuno ha premuto «Annulla» sull'avviso del firewall, Windows ha
  ; creato regole di blocco, che vincono su quelle che consentono
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="${REGOLA}"'
  Pop $0
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name=all program="$INSTDIR\${EXE}"'
  Pop $0
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="${REGOLA}" dir=in action=allow program="$INSTDIR\${EXE}" enable=yes profile=any remoteip=localsubnet'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_ICONEXCLAMATION "Regola del firewall non creata (codice $0).$\r$\nIl gioco funziona; per i telefoni, nel programma: tasto Alt → Rete → Apri la rete ai telefoni." /SD IDOK
  ${EndIf}

  WriteRegStr HKLM "${CHIAVE}" "DisplayName" "${NOME}"
  WriteRegStr HKLM "${CHIAVE}" "DisplayVersion" "${BUILD}"
  WriteRegStr HKLM "${CHIAVE}" "Publisher" "${NOME}"
  WriteRegStr HKLM "${CHIAVE}" "DisplayIcon" '"$INSTDIR\${EXE}",0'
  WriteRegStr HKLM "${CHIAVE}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${CHIAVE}" "UninstallString" '"$INSTDIR\${DISINST}"'
  WriteRegStr HKLM "${CHIAVE}" "QuietUninstallString" '"$INSTDIR\${DISINST}" /S'
  WriteRegDWORD HKLM "${CHIAVE}" "NoModify" 1
  WriteRegDWORD HKLM "${CHIAVE}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "${CHIAVE}" "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  SetRegView 64
  SetShellVarContext all
  !insertmacro ChiudiProgramma
  DetailPrint "Regola del firewall «${REGOLA}»: via"
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="${REGOLA}"'
  Pop $0
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name=all program="$INSTDIR\${EXE}"'
  Pop $0
  Delete "$SMPROGRAMS\${NOME}.lnk"
  Delete "$DESKTOP\${NOME}.lnk"
  !insertmacro RimuoviProgramma
  Delete "$INSTDIR\${DISINST}"
  RMDir "$INSTDIR"
  DeleteRegKey HKLM "${CHIAVE}"
SectionEnd
