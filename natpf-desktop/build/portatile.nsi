; NATPF Simulator portatile: un solo eseguibile, senza installazione né permessi di amministratore (richiesta del
; 04/11/2026). Compilato con makensis (anche da Linux) da natpf-desktop/scripts/costruisci.mjs, con gli stessi
; parametri dell'installazione (VERSION, BUILD, SRC, ICONA, TESTATA, OUT).
; Al primo avvio di una versione estrae il programma in %LOCALAPPDATA%\NATPF\portatile\<versione> (barra di
; avanzamento, qualche secondo); dagli avvii successivi lo apre subito, senza finestre. Le versioni precedenti del
; portatile si cancellano (se non sono aperte). Il programma sa di essere il portatile da PORTABLE_EXECUTABLE_DIR:
; regola del firewall «NATPF Simulator portatile», chiesta alla prima apertura (permesso di Windows).
Unicode true
ManifestDPIAware true
SetCompressor /SOLID lzma
SetCompressorDictSize 64

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "WinVer.nsh"

!define NOME "NATPF Simulator"
!define EXE "NATPF Simulator.exe"
!define CARTELLA "$LOCALAPPDATA\NATPF\portatile"

Name "${NOME}"
Caption "${NOME} ${BUILD} (portatile)"
OutFile "${OUT}"
InstallDir "${CARTELLA}\${BUILD}"
RequestExecutionLevel user
AutoCloseWindow true
ShowInstDetails nevershow
BrandingText "${NOME} ${BUILD} portatile"

!define MUI_ICON "${ICONA}"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "${TESTATA}"
!define MUI_PAGE_HEADER_TEXT "Primo avvio di questa versione"
!define MUI_PAGE_HEADER_SUBTEXT "Preparazione di NATPF Simulator sul computer: qualche secondo, solo la prima volta."
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "Pronto"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "Avvio di NATPF Simulator."
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Italian"

VIProductVersion "${VERSION}.0"
VIFileVersion "${VERSION}.0"
VIAddVersionKey /LANG=${LANG_ITALIAN} "ProductName" "${NOME}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "FileDescription" "${NOME} portatile"
VIAddVersionKey /LANG=${LANG_ITALIAN} "ProductVersion" "${BUILD}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "CompanyName" "${NOME}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "LegalCopyright" "${NOME}"

Var PARAMETRI

; avvia il programma estratto (variabili d'ambiente ereditate: il programma sa di essere il portatile)
Function Avvia
  System::Call 'Kernel32::SetEnvironmentVariable(t "PORTABLE_EXECUTABLE_DIR", t "$EXEDIR")i'
  System::Call 'Kernel32::SetEnvironmentVariable(t "PORTABLE_EXECUTABLE_FILE", t "$EXEPATH")i'
  Exec '"$INSTDIR\${EXE}" $PARAMETRI'
FunctionEnd

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "NATPF Simulator richiede Windows 10 o 11 a 64 bit." /SD IDOK
    Abort
  ${EndIf}
  ${IfNot} ${AtLeastBuild} 10240
    MessageBox MB_ICONSTOP "NATPF Simulator richiede Windows 10 o 11 a 64 bit." /SD IDOK
    Abort
  ${EndIf}
  ${GetParameters} $PARAMETRI
  ; questa versione è già estratta: si apre subito, senza finestre
  ${If} ${FileExists} "$INSTDIR\.pronto"
  ${AndIf} ${FileExists} "$INSTDIR\${EXE}"
    Call Avvia
    Quit
  ${EndIf}
FunctionEnd

Section
  SetOutPath "$INSTDIR"
  Delete "$INSTDIR\.pronto"
  File /r "${SRC}/*"
  FileOpen $0 "$INSTDIR\.pronto" w
  FileWrite $0 "${BUILD}"
  FileClose $0

  ; versioni precedenti del portatile: via, se non sono aperte (l'eseguibile aperto non si cancella)
  FindFirst $0 $1 "${CARTELLA}\*"
  ${DoWhile} $1 != ""
    ${If} $1 != "."
    ${AndIf} $1 != ".."
    ${AndIf} $1 != "${BUILD}"
      ClearErrors
      Delete "${CARTELLA}\$1\${EXE}"
      ${IfNot} ${Errors}
        RMDir /r "${CARTELLA}\$1"
      ${EndIf}
    ${EndIf}
    FindNext $0 $1
  ${Loop}
  FindClose $0

  Call Avvia
SectionEnd
