# Progresso do projeto

Atualizado em 26/10/2026 (America/Sao_Paulo). Repositório recebido sem commits e sem arquivos. Os requisitos originais e as atualizações técnicas foram preservados em `docs/`.

## Implementado

- Fundação: pnpm workspaces, Next.js/React/TypeScript, NestJS REST, PostgreSQL/Prisma, migração SQL versionada, Compose e identidade bege/verde responsiva.
- Autenticação: cadastro de empresa/proprietária, login, sessão HttpOnly, expiração, validação de origem e isolamento por empresa.
- Operação: clientes e campos personalizados, catálogo, atendimentos com vários serviços, ajustes, vencimento, situação e evento em grupo, recebimentos com várias alocações, taxas, reembolsos, despesas e arquivamentos auditados.
- Financeiro: valores decimais, saldos derivados, caixa e competência separados, validação de excesso, transações serializáveis e concorrência otimista.
- Consultas: `DataTable` central com pesquisa, filtros E/OU, múltiplas ordens, grupos e subtotais, colunas visíveis/ordem/largura, paginação e exportações CSV/XLSX; visualizações persistidas, edição/renomeação/duplicação/exclusão.
- Dashboards: indicadores reais com fontes explícitas, detalhes com a mesma tabela e período, evolução mensal clicável, atualização após mutações e consulta automática entre sessões.
- Histórico de cliente/atendimento: dados, serviços, financeiro e galeria. Originais locais privados, miniaturas, consentimento, upload múltiplo, exclusão e verificação de arquivos ausentes.
- Logística: cadastro de veículos e custos anuais, estimativas de trechos, agenda por dia/intervalo/mês, roteiro ordenado, conflito de horários e abertura de mapas com estimativas manuais identificadas.
- Importação: leitura XLSX/CSV, múltiplas abas, prévia persistida, mapeamento revisável, preservação da origem/fórmulas, confirmação por linha, consolidação supervisionada, deduplicação exata e resultado por linha.
- Configurações de nome/cores, endereço de partida, margem entre atendimentos e indicadores visíveis; auditoria, exportação completa e scripts de backup/restauração.

## Validação concluída desta versão

- `pnpm typecheck`: três projetos aprovados; `pnpm lint` e Prettier aprovados.
- Build de produção Next/Nest/shared aprovado, inclusive no Docker com instalação congelada.
- `pnpm test`: **8 aprovados, 0 falhas, 0 ignorados**. Inclui finanças integradas, conciliação entre indicadores/tabelas, caixa versus competência, privacidade de fotos, isolamento, concorrência, importação e preservação histórica após alterar/arquivar o catálogo.
- `pnpm test:e2e`: **2 aprovados** no Docker: cadastro/foto/atendimento/pagamento parcial/indicador/visualização salva e revisão de CSV antes de confirmar a importação. Capturas desktop e celular geradas; nenhuma falha de JavaScript no primeiro fluxo.
- Stack Docker real iniciou PostgreSQL, API e frontend; imagens finais aproximadas de 513 MB (API) e 281 MB (web). O build na nuvem usou proxy e certificado de confiança fornecidos, sem desativar TLS.
- Migrações aplicadas e reaplicadas sem alterações; scripts de instalação e reinício da nuvem exercitados.
- Arquivo XLSX real: 18 abas e 829 linhas preservadas na prévia isolada, **zero linhas históricas confirmadas**.
- Backup e restauração reais em banco/pasta novos: checksums aprovados, metadados preservados e fotografia original aberta pela API restaurada com autorização.

A instância de desenvolvimento permanece iniciada. `install_script`, `start_skill` e o caminho real do checkout foram salvos no rascunho do ambiente. O código utiliza a branch `main` para versionamento em `PedroLucas363/sas-gferraz`. O envio inclui código, migrações, documentação e inicializador Windows; registros operacionais, segredos e arquivos gerados são excluídos. Publicação do ambiente e restauração em uma nova tarefa não foram executadas. A usuária deve revisar/salvar as configurações e publicar pelo produto quando desejar.

O workflow de CI está configurado, mas ainda não foi executado no GitHub. Windows e implantação pública não foram validados. As evidências detalhadas estão em `docs/validation.md`.

## Pendente e limites explícitos

- Revisão e migração efetiva dos registros históricos da planilha real; nenhuma linha foi gravada sem revisão da usuária.
- Integração automática de rotas/trânsito, reordenação manual visual de paradas e validação do planejamento completo.
- Recorrência automática de despesas e agenda visual em grade.
- Identidade com upload de logotipo, editor visual de campos personalizados e composição de filtros aninhados.
- Seletores de valores por tipo e filtros aninhados mais completos no editor de consultas.
- Alocações financeiras por item individual dentro de um mesmo atendimento (a versão atual aloca por atendimento).
- Permissões granulares, convites, recuperação de senha, MFA e política de cadastro para servidor aberto.
- Segmentação comercial avançada, gráficos detalhados por categoria/produto e comparação dedicada entre períodos.
- Mapeamento visual de qualquer planilha arbitrária; o importador atual reconhece as estruturas observadas e conserva dados não mapeados.
- Validação de backup/restauração completa com imagens numa instalação Windows real; hardening, testes de escala e auditoria externa.

Estes itens não são anunciados como concluídos. A próxima sessão deve manter as regras centrais e atualizar este documento ao concluir cada entrega.

## Distribuição do código

A publicação no GitHub foi solicitada pela usuária em 26/10/2026. Foram incluídos um inicializador Windows e um guia para obter o projeto pelo GitHub e executar o Compose localmente. O link privado da planilha foi retirado da especificação versionada; o arquivo original permanece privado e inalterado. A validação de Windows real continua pendente. O upload do código não implanta uma aplicação web pública nem publica o snapshot da nuvem.
