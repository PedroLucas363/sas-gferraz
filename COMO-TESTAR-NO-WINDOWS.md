# Como testar no Windows

1. Instale e abra o Docker Desktop, usando containers Linux.
2. No GitHub, use Code → Download ZIP e extraia tudo para uma pasta normal, ou clone o repositório.
3. Dê dois cliques em INICIAR-WINDOWS.cmd. O primeiro build baixa dependências e pode levar alguns minutos.
4. Ao terminar, o navegador do seu próprio computador será aberto na aplicação. Selecione “Primeiro acesso? Criar uma conta” e defina sua senha com pelo menos 12 caracteres.

Alternativa pelo PowerShell, dentro da pasta extraída:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
New-Item -ItemType Directory -Force ".data/GFerraz Makeup" | Out-Null
docker compose up -d --build
Start-Process 'http://localhost:3000'
```

Para parar: `docker compose stop`. Para retornar: `docker compose start`. Para diagnosticar: `docker compose logs api web`.

O banco e as imagens permanecem na sua máquina. Não use `docker compose down -v` se quiser preservar os dados. O repositório contém somente código e instruções; não inclui credenciais, fotos, registros pessoais, banco de dados ou a planilha histórica. A importação da planilha é feita depois do login, com prévia e revisão.

A aplicação na nuvem e a cópia no seu computador são instalações distintas. A aplicação foi validada em Linux; a execução em Windows ainda depende do Docker Desktop instalado e funcionando no seu computador. Leia README.md e PROGRESS.md para funcionalidades e pendências.
