# Continuidade do GFerraz Makeup

Leia README.md, ARCHITECTURE.md, DATABASE.md, PROGRESS.md e ROADMAP.md antes de alterar o projeto. Os requisitos recebidos estão em docs/requirements.md e docs/technical-requirements.md; o item 21 em docs/continuity-requirements.md tem prioridade na consistência e reutilização.
Use o checkout existente. Cada tarefa da nuvem é isolada; não crie worktrees sem pedido explícito.
Regras financeiras pertencem a apps/api/src/finance.ts e às transações de business.service.ts. Consultas, dashboards e exportações usam query.ts e data.service.ts. Nunca calcule saldos separadamente no frontend. Valores monetários são strings decimais na API e Decimal no banco.
Toda consulta privada usa a empresa da sessão, nunca uma empresa enviada no corpo. Relações de negócio possuem chaves compostas por empresa. Preserve estornos, reembolsos, auditoria e versão otimista.
O componente DataTable é compartilhado por todos os módulos. O contrato Query é a fonte única de filtros/ordens/colunas/agrupamentos e visualizações persistidas.
Nunca importe a planilha histórica automaticamente. Preserve a origem e revise as correspondências. Dados reais, fotos, credenciais e backups não entram no Git.
Ao concluir uma etapa, atualize os cinco documentos principais, os testes relevantes e docs/validation.md com evidências reais. Pendências não são funcionalidades concluídas. Não desative verificações TLS, assinaturas ou checksums para instalar dependências.
Comandos: pnpm install --frozen-lockfile; pnpm db:generate; pnpm db:migrate; pnpm dev. Com aplicação iniciada: pnpm test; pnpm test:e2e. Verificação estática: pnpm typecheck; pnpm lint; pnpm build.
