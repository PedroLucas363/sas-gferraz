# Como testar no Windows

1. Instale e abra o Docker Desktop, usando containers Linux.
2. No GitHub, use Code → Download ZIP e extraia tudo para uma pasta normal, ou clone o repositório.
3. Dê dois cliques em INICIAR-WINDOWS.cmd. O primeiro build baixa dependências e pode levar alguns minutos.
4. Ao terminar, o navegador do seu próprio computador será aberto na aplicação. Selecione “Primeiro acesso? Criar uma conta” e defina sua senha com pelo menos 12 caracteres.

5. **Para usar no celular**, com o celular no mesmo Wi-Fi do computador: abra no navegador do celular o endereço que o inicializador mostra ao final, no formato `http://192.168.x.x:3000`. Entre com o mesmo e-mail e senha.

Se o celular não abrir a página:

- O computador precisa estar ligado, com o Docker Desktop aberto.
- No Windows, a rede deve estar como **Privada**: Configurações → Rede e Internet → propriedades da rede → Tipo de perfil de rede → Rede privada.
- Se o Windows perguntar sobre o Docker Desktop no firewall, permita em redes privadas.
- O endereço do computador pode mudar quando o roteador reinicia. Rode o inicializador de novo para ver o endereço atual, ou reserve um endereço fixo para o computador no roteador.
- Fora de casa (4G) não funciona: o sistema só é publicado na rede local.

Qualquer aparelho conectado à mesma rede alcança a tela de entrada e pode criar uma conta nova, que é uma empresa separada e não vê os seus dados. Para atender somente o próprio computador, coloque `WEB_BIND=127.0.0.1` e `ALLOW_LAN_ORIGIN=false` no arquivo `.env` e inicie de novo.

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
