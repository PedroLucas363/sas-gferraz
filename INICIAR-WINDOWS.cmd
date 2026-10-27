@echo off
setlocal
cd /d "%~dp0"
where docker >nul 2>nul
if errorlevel 1 (
  echo Instale e abra o Docker Desktop antes de continuar.
  pause
  exit /b 1
)
if not exist ".env" copy ".env.example" ".env" >nul
if not exist ".data\GFerraz Makeup" mkdir ".data\GFerraz Makeup"
echo Iniciando o projeto. O primeiro build pode levar alguns minutos.
docker compose up -d --build
if errorlevel 1 (
  echo Falha ao iniciar. Consulte: docker compose logs api web
  pause
  exit /b 1
)
echo Aguardando a interface ficar disponivel...
powershell -NoProfile -Command "for ($i=0; $i -lt 60; $i++) { try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo A interface ainda nao respondeu. Consulte: docker compose logs api web
  pause
  exit /b 1
)
echo A aplicacao foi iniciada no seu computador.
start "" "http://localhost:3000"
pause
