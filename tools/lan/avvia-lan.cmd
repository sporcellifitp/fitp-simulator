@echo off
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
if not exist "node_modules\ws" (
  call npm ci
  if errorlevel 1 (
    echo Installazione dipendenze non riuscita. Verifica la connessione Internet e riprova.
    pause
    exit /b 1
  )
)
node launcher.mjs
pause
