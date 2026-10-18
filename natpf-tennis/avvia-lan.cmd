@echo off
rem NATPF Simulator - motore base in LAN: server HTTPS su questo computer per gioco, telefono (racchetta) e 1v1.
rem Doppio clic. Tieni aperta la finestra mentre giochi. Opzioni: --build (rifa' la build), --offline, --port=8443
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Installa Node.js 20 o successivo, poi riapri questo file.
  pause
  exit /b 1
)
node -e "const major=Number(process.versions.node.split('.')[0]);if(Math.max(20,major)!==major)process.exit(1)"
if errorlevel 1 (
  echo Serve Node.js 20 o successivo. Aggiorna Node.js e riapri questo file.
  pause
  exit /b 1
)
set NATPF_BUILD=
echo %* | find "--build" >nul && set NATPF_BUILD=--build
node lan\prepare.mjs %NATPF_BUILD%
if errorlevel 1 (
  pause
  exit /b 1
)
node lan\server.mjs %*
pause
