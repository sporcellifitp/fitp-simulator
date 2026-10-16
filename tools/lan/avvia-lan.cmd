@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Installa Node.js 20 o successivo, poi riapri questo file.
  pause
  exit /b 1
)
if not exist "node_modules\ws" (
  call npm ci
  if errorlevel 1 exit /b 1
)
if not exist "certs\cert.pem" (
  echo Leggi README.md: servono certs\cert.pem e certs\key.pem attendibili anche sul telefono.
  pause
  exit /b 1
)
if not exist "certs\key.pem" (
  echo Manca certs\key.pem. Leggi README.md.
  pause
  exit /b 1
)
node server.mjs --cert=certs/cert.pem --key=certs/key.pem --port=8443
pause
