# Progresso do projeto

Atualizado em 25/11/2026 (America/Sao_Paulo). Repositório recebido sem commits e sem arquivos. Os requisitos originais e as atualizações técnicas foram preservados em `docs/`.

## Implementado

- Fundação: pnpm workspaces, Next.js/React/TypeScript, NestJS REST, PostgreSQL/Prisma, migração SQL versionada, Compose e identidade bege/verde responsiva.
- Autenticação: cadastro de empresa/proprietária, login, sessão HttpOnly, expiração, validação de origem e isolamento por empresa.
- Operação: clientes e campos personalizados, catálogo, atendimentos com vários serviços, ajustes, vencimento, situação e evento em grupo, recebimentos com várias alocações, taxas, reembolsos, despesas e arquivamentos auditados.
- Financeiro: valores decimais, saldos derivados, caixa e competência separados, validação de excesso, transações serializáveis e concorrência otimista.
- Consultas: `DataTable` central com pesquisa, filtros E/OU, múltiplas ordens, grupos e subtotais, colunas visíveis/ordem/largura, paginação e exportações CSV/XLSX; visualizações persistidas, edição/renomeação/duplicação/exclusão.
- Dashboards: indicadores reais com fontes explícitas, detalhes com a mesma tabela e período, evolução mensal clicável, atualização após mutações e consulta automática entre sessões.
- Histórico de cliente/atendimento: dados, serviços, financeiro e galeria. Originais locais privados, miniaturas, consentimento, upload múltiplo, exclusão e verificação de arquivos ausentes.
- Logística: cadastro de veículos e custos anuais, trechos realizados para custo, agenda por dia/intervalo/mês.
- Rota do dia (16/11/2026): tela própria, inicial no celular, que abre no próximo dia com atendimento em aberto e permite escolher outro dia. Mostra saída de casa, paradas em ordem de horário (pessoas no mesmo endereço formam uma parada), tempo e distância de cada trecho, chegada prevista, término, volta para casa, total do trajeto e valor a receber no dia. Alerta atraso, horário apertado e sobreposição. Abre a rota completa e cada trecho no Google Maps por link gratuito e navega até cada parada. Os tempos vêm de estimativas informadas pela usuária, guardadas por par de endereços e reaproveitadas; nada é estimado automaticamente.
- Endereço por CEP (16/11/2026): clientes, atendimentos e endereço de partida têm CEP, rua, número, complemento, bairro, cidade e UF. O CEP preenche o restante (ViaCEP, com BrasilAPI de reserva) e todos os campos continuam editáveis. O atendimento novo recebe o endereço da cliente.
- Histórico (16/11/2026): todas as ações gravam auditoria, inclusive acesso, visualizações salvas, exportações, prévia de importação, estimativas de trajeto e criação da empresa. A tela mostra quem fez, quando e o valor de antes e de depois por campo; cada cadastro tem a aba “Alterações”.
- Visual (16/11/2026): escala tipográfica com corpo de 16 px e mínimo de 11 px apenas em rótulos decorativos, alvos de toque de 44 px, contraste revisado, formulários em uma coluna e diálogos em tela cheia no celular, tabelas em cartões no celular.
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
- Tempo e distância automáticos (Google Routes API ou outro provedor): a rota do dia usa apenas estimativas informadas. Geração dos km rodados a partir da rota e reordenação manual de paradas.
- Recorrência automática de despesas e agenda visual em grade.
- Identidade com upload de logotipo, editor visual de campos personalizados e composição de filtros aninhados.
- Seletores de valores por tipo e filtros aninhados mais completos no editor de consultas.
- Alocações financeiras por item individual dentro de um mesmo atendimento (a versão atual aloca por atendimento).
- Permissões granulares, convites, recuperação de senha e MFA. O cadastro de novas empresas permanece aberto por decisão da usuária em 16/11/2026, inclusive para aparelhos da rede local.
- Acesso de fora da rede local (4G), HTTPS e cópia de segurança automática.
- Segmentação comercial avançada, gráficos detalhados por categoria/produto e comparação dedicada entre períodos.
- Mapeamento visual de qualquer planilha arbitrária; o importador atual reconhece as estruturas observadas e conserva dados não mapeados.
- Validação de backup/restauração completa com imagens numa instalação Windows real; hardening, testes de escala e auditoria externa.

Estes itens não são anunciados como concluídos. A próxima sessão deve manter as regras centrais e atualizar este documento ao concluir cada entrega.

## Distribuição do código

A publicação no GitHub foi solicitada pela usuária em 26/10/2026. Foram incluídos um inicializador Windows e um guia para obter o projeto pelo GitHub e executar o Compose localmente. O link privado da planilha foi retirado da especificação versionada; o arquivo original permanece privado e inalterado. A validação de Windows real continua pendente. O upload do código não implanta uma aplicação web pública nem publica o snapshot da nuvem.

## Etapa de 16/11/2026: rota do dia, CEP, histórico e visual

Validação executada em Windows 11 com Node 22.22.3 (o projeto pede Node 24; o pnpm apenas avisou) e PostgreSQL 17 do Compose:

- Migração `202611160001_route_address` aplicada sobre a base existente, depois de um `pg_dump` em `.data/backups/`.
- `pnpm typecheck`, ESLint e Prettier aprovados.
- `pnpm test`: **18 aprovados, 0 falhas** (15 unitários e 3 integrados contra a API e o banco reais).
- Conferência manual no navegador, em 375 px e em desktop: rota do dia, estimativa de trecho, cadastro por CEP com consulta real, endereço da cliente no atendimento, histórico com antes e depois, tabelas em cartões.

Não executado nesta etapa: `pnpm test:e2e` (o seletor do endereço no fluxo foi ajustado, sem rodar), `pnpm build`, imagens Docker e teste em um celular real. Detalhes em `docs/validation.md`.

## Etapa de 16/11/2026: acesso pelo celular na rede local

- O Compose publica a interface na rede local (`WEB_BIND`) e a API aceita o endereço local do computador (`ALLOW_LAN_ORIGIN`), mantendo recusadas as origens de outros sites. API e banco continuam fora da rede.
- O inicializador Windows mostra o endereço para abrir no celular e avisa quando a rede está marcada como Pública.
- O limite de tentativas de login continua único para todos os aparelhos (15 a cada 15 minutos), porque o proxy não informa o endereço de cada um.

## Etapa de 25/11/2026: formulários mais simples

- Campos de valor com o “R$” dentro da caixa, alinhados com os vizinhos.
- Filtro e busca por situação e tipo aceitam a palavra mostrada na tela (“Confirmado”) e o código interno; o filtro “Igual a” desses campos usa uma lista.
- Dashboard abre no mês atual inteiro, com o botão “Este mês”.
- Evento com nome repetido é recusado (sem diferenciar maiúsculas, acentos e espaços), com atalho para vincular ao existente.
- Cliente escolhida por busca com pausa na digitação; clientes, serviços e eventos em ordem alfabética nos formulários.
- Data e horário separados; durações em `00:00`; campos numéricos sem valores negativos.
- Atendimento com total na tela, deslocamento sugerido pelo trajeto e pelo custo do carro, duração sugerida (serviços + ida), vencimento igual à data e nome automático pelos serviços.

Sem migração de banco.
