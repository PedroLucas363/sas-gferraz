# GFerraz Makeup

Código-fonte: [PedroLucas363/sas-gferraz](https://github.com/PedroLucas363/sas-gferraz), branch `main`.

## Obter e testar o projeto

```bash
git clone https://github.com/PedroLucas363/sas-gferraz.git
cd sas-gferraz
```

No Windows, você também pode usar **Code → Download ZIP** no GitHub e extrair os arquivos. Com o Docker Desktop aberto em modo de containers Linux, execute **INICIAR-WINDOWS.cmd**. Ele prepara a configuração local, inicia os serviços, aguarda a interface responder e abre o navegador do próprio computador. Veja [COMO-TESTAR-NO-WINDOWS.md](COMO-TESTAR-NO-WINDOWS.md).

Sistema de gestão com clientes, catálogo, atendimentos, recebimentos parciais, reembolsos, despesas, veículos, agenda, fotografias privadas, consultas reutilizáveis, dashboards rastreáveis e prévia de importação. Next.js + NestJS + PostgreSQL + Prisma, em pnpm workspaces.

A implementação inicial é funcional e incremental. Consulte [PROGRESS.md](PROGRESS.md), [ROADMAP.md](ROADMAP.md) e [docs/validation.md](docs/validation.md) para distinguir o que foi validado das funcionalidades ainda previstas. Não há dados fictícios inseridos na empresa de produção. O arquivo histórico original permanece intacto; não foi importado automaticamente.

## Execução local com Node.js

Requisitos: Node.js 24 LTS, pnpm 10.34.8 e PostgreSQL 17 (Docker Desktop serve para o banco). A partir da raiz do checkout:

```bash
corepack pnpm install --frozen-lockfile
# copie .env.example para .env; configure valores locais
# Linux/macOS: cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
docker compose up -d db
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Se Corepack não estiver disponível, instale o gerenciador com `npm install -g pnpm@10.34.8`.

A aplicação usa a porta 3000 e a API a porta 3001. Abra a aplicação no navegador local e selecione “Primeiro acesso? Criar uma conta”. Não existe senha administrativa padrão. Cada cadastro cria uma empresa isolada, com uma proprietária. Use senha de pelo menos 12 caracteres. Em produção, restrinja o cadastro de novas empresas conforme a política da instalação.

O backend carrega `.env` da raiz quando executado pelos scripts de workspace. Variáveis injetadas têm prioridade. A pasta atual dos comandos do backend é `apps/api`. `MEDIA_ROOT` relativo é resolvido a partir dessa pasta.

## Execução completa com Docker (Windows ou Linux)

```bash
# crie .env a partir do exemplo e configure MEDIA_HOST_PATH e POSTGRES_PASSWORD
mkdir -p ".data/GFerraz Makeup"   # no PowerShell: New-Item -ItemType Directory -Force ".data/GFerraz Makeup"
docker compose up -d --build
docker compose logs -f api web
docker compose stop
docker compose start
docker compose down
```

`docker compose down` preserva o volume PostgreSQL e a pasta de imagens. Não use `down -v` para uma instalação com dados importantes. No Linux, permita que UID 1000 escreva na pasta de mídia; no Windows configure o compartilhamento da pasta no Docker Desktop. Exemplo de `.env` no Windows: `MEDIA_HOST_PATH=C:/GFerraz Makeup` (caminho absoluto, barras `/`). A pasta estará disponível no Explorador de Arquivos. O banco fica no volume persistente `postgres-data`; as imagens usam bind mount.

Para atualizar uma instalação: faça backup, atualize o código, execute `pnpm install --frozen-lockfile`, `pnpm db:generate` e `pnpm db:migrate` (ou reconstrua o Compose). O inicializador Docker aplica apenas migrações novas. Nunca altere uma migração já aplicada; crie outra.

## Configuração

| Variável                                                       | Finalidade                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                                                 | Conexão PostgreSQL privada. Credenciais do exemplo são somente para desenvolvimento local. |
| `MEDIA_ROOT`                                                   | Raiz privada de imagens no backend; padrão `../../.data/GFerraz Makeup`.                   |
| `MEDIA_HOST_PATH`                                              | Pasta física da máquina hospedeira para o bind mount Docker.                               |
| `API_PORT`, `API_HOST`                                         | Porta e endereço do NestJS; padrão 3001 e 127.0.0.1.                                       |
| `API_INTERNAL_URL`                                             | URL interna consumida pelo proxy do Next em tempo de execução.                             |
| `WEB_ORIGIN`                                                   | Origens autorizadas, separadas por vírgulas; padrão `http://localhost:3000`.               |
| `COOKIE_SECURE`                                                | `true` atrás de HTTPS; `false` apenas para desenvolvimento HTTP local.                     |
| `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `WEB_PORT`               | Configuração local do Compose.                                                             |
| `TEST_API_URL`, `TEST_WEB_URL`, `TEST_ORIGIN`, `CHROMIUM_PATH` | Endereços e navegador dos testes.                                                          |

Não coloque credenciais no frontend ou no Git. Em servidor próprio, use proxy reverso com HTTPS, `COOKIE_SECURE=true`, origem explícita e portas do banco/API privadas. API e imagens exigem sessão. Usuários com acesso direto à pasta no sistema operacional conseguem abrir os originais: configure permissões locais, disco criptografado e backups restritos.

## Verificação

Com API, web e banco iniciados:

```bash
pnpm typecheck
pnpm lint
pnpm test
# Linux da nuvem já possui /usr/bin/chromium.
# Outros sistemas: instale Chromium/Chrome e defina CHROMIUM_PATH, ou use o navegador do Playwright.
pnpm test:e2e
pnpm build
```

Os testes da API criam empresas isoladas e removem seus próprios registros. Testes do navegador usam dados identificados como teste em empresa separada. Resultados e capturas ficam em `test-results/`, ignorado pelo Git. Os testes não importam dados reais automaticamente. A documentação OpenAPI está na rota `/api/docs` do backend em desenvolvimento; os contratos Zod estão em `packages/shared/src/index.ts`.

## Documentação e continuidade

- [ARCHITECTURE.md](ARCHITECTURE.md): componentes, decisões e limites.
- [DATABASE.md](DATABASE.md): entidades e regras financeiras.
- [PROGRESS.md](PROGRESS.md): situação real das entregas e validações.
- [ROADMAP.md](ROADMAP.md): próximas etapas.
- [docs/spreadsheet-analysis.md](docs/spreadsheet-analysis.md): análise das 18 abas e plano de migração.
- [docs/backup.md](docs/backup.md): backup e restauração.
- [AGENTS.md](AGENTS.md): instruções para continuar em outra sessão.

## Primeiro uso e importação

Entre com sua empresa, cadastre as informações atuais e abra **Importação** para analisar o XLSX/CSV. A prévia não grava operações. Corrija identidades, datas, duração prevista e valores, marque apenas as linhas revisadas e confirme. Atendimentos começam como confirmados; marque concluído somente quando a prestação estiver validada. Recebimentos exigem vínculo explícito ao atendimento, cujo ID aparece nos detalhes. Os totais da origem e os resultados importados/ignorados/pendentes ficam visíveis para conciliação. A migração histórica permanece aberta enquanto houver ambiguidades.

A prévia pode propor 60 minutos de duração prevista para um serviço histórico; esse campo é editável e não representa uma duração realizada obtida da planilha. Fórmulas, cabeçalhos e referências são preservados para revisão, não tratados como comandos ou lançamentos automáticos.

O rascunho do ambiente na nuvem contém instalação, inicialização e o checkout real `sas-gferraz`. O versionamento do código na branch `main` é independente da publicação do snapshot do ambiente. Para reutilizar o snapshot preparado, revise e salve o rascunho nas configurações do ambiente e publique pelo produto. Ainda não foi validada uma restauração em outra tarefa.
