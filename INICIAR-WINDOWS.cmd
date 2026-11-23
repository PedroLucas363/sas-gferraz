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
echo.
powershell -NoProfile -Command "$c = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1; if ($c) { $ip = $c.IPv4Address.IPAddress; Write-Host ('No celular, na mesma rede Wi-Fi, abra:  http://' + $ip + ':3000'); $cat = (Get-NetConnectionProfile -InterfaceIndex $c.InterfaceIndex).NetworkCategory; if ($cat -eq 'Public') { Write-Host 'Aviso: esta rede esta marcada como Publica no Windows e o celular pode ser bloqueado.'; Write-Host 'Veja o passo 5 de COMO-TESTAR-NO-WINDOWS.md.' } } else { Write-Host 'Nao encontrei o endereco deste computador na rede.' }"
echo.
start "" "http://localhost:3000"
pause
