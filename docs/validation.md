# Evidências de validação

Validação local em 23/10/2026, fuso America/Sao_Paulo. Trata-se de uma primeira versão funcional; a lista de funcionalidades restantes está em PROGRESS.md e ROADMAP.md.

| Verificação                            | Resultado                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Instalação pnpm com lockfile congelado | Aprovada; também repetida pelo script da nuvem e no build Docker               |
| Cliente Prisma JavaScript              | Gerado em `apps/api/generated/client`                                          |
| Migrações SQL                          | Duas aplicadas; reaplicação idempotente aprovada com checksum                  |
| TypeScript                             | Três projetos aprovados                                                        |
| ESLint / Prettier                      | Aprovados                                                                      |
| Build de produção                      | shared, API e Next aprovados                                                   |
| Testes unitários/integrados            | 8 aprovados, 0 falhas, 0 ignorados                                             |
| Testes de navegador                    | 2 aprovados, executados contra o Compose de produção                           |
| API empacotada para produção           | Inicialização e 8 testes aprovados sem dependências do frontend                |
| Docker Compose                         | Banco e API saudáveis, frontend HTTP 200 e requisições funcionais autenticadas |
| Planilha real                          | 18 abas; 829 linhas na prévia; zero importadas para operação                   |
| Backup e restauração                   | Banco novo, mídia nova, hashes e acesso autorizado aprovados                   |
| Instalação e startup salvos            | Rascunho confirmado; publicação ainda não realizada                            |

## O que os testes exercitam

Os seis testes unitários cobrem centavos decimais, pagamentos estornados/reembolsados, custo por km, combinações de filtros, datas e valores brasileiros inválidos e proteção de caminhos/nome Windows.

Os dois testes integrados usam empresas isoladas em PostgreSQL. Validam cadastro, contrato, sinal de R$ 50 em R$ 350, saldo de R$ 300, recebimento posterior, reembolso, caixa versus competência, despesas pagas em outro período, consultas de origem dos indicadores, versões antigas e concorrência. Também verificam leitura indevida de foto/cliente por outra empresa, nome/categoria/preço históricos após alteração/arquivamento do catálogo, prévia sem gravação e confirmação idempotente de XLSX sem pagamentos presumidos.

O primeiro fluxo Chromium cadastra conta, cliente/endereço/consentimento/foto, catálogo, atendimento e pagamento parcial. Clica em “A receber”, confere os registros de R$ 300, salva uma visualização e a recupera após recarregar. Gera capturas em desktop e celular.

O segundo fluxo envia CSV, corrige nome e duração prevista antes de marcar a linha como revisada, confirma a importação e verifica os dados gravados no atendimento. Ambos passaram contra os serviços compilados do Docker. Dados de teste são isolados e removidos pelos próprios testes.

## Ensaio de backup

Em uma instalação Compose isolada, foi criada uma cliente de teste com fotografia PNG. O script pausou a API, exportou PostgreSQL em formato custom, arquivou a mídia privada e calculou checksums. A restauração usou um banco vazio e uma pasta nova. Foi iniciada outra API apontando para esses destinos, e a fotografia foi lida com a sessão autorizada restaurada. Seu SHA-256 coincidiu com o original. A instância original não foi apagada para o ensaio.

## Problemas encontrados e resolvidos

A política de rede bloqueou binários nativos do Prisma. O cliente usa o adaptador JavaScript; migrações SQL usam o runner PostgreSQL documentado porque o caminho WASM de `prisma migrate deploy` falhou ao ler o tipo `name`. Nenhuma verificação de integridade foi desativada.

O build Docker precisou receber o proxy e a CA já fornecidos pela máquina. Imagens iniciais com dependências de desenvolvimento em ambos os serviços excederam o disco de 32 GB ao criar contêineres. Foram substituídas por Next standalone e pacote de produção da API; somente artefatos de teste desta sessão foram removidos. Os serviços finais iniciaram com espaço disponível.

Os testes também identificaram erros de atributos de auditoria, atributos de relações aninhadas e edição da prévia sem atualizar o estado do formulário, todos corrigidos. A sincronização de navegação nos testes foi ajustada para aguardar o título da página; a suíte final completou os cenários.

## O que ainda não foi validado

- Publicação do ambiente e restauração de snapshot numa nova tarefa.
- Execução do workflow no GitHub e instalação em Windows real.
- Migração efetiva e conciliação dos registros históricos da usuária.
- Mapas/trânsito automáticos, funções pendentes no roadmap e performance com grandes bases.
- Implantação pública, permissões granulares e hardening de uma instalação multiusuária aberta.

Não há alegação de conclusão integral de todos os requisitos da especificação. Esta entrega estabelece a operação inicial e o mecanismo central de consistência e rastreabilidade.

## Etapa de 16/11/2026: rota do dia, CEP, histórico e visual

Ambiente: Windows 11, Node 22.22.3 (o projeto pede Node 24; pnpm 10.34.8 avisou e seguiu), PostgreSQL 17 do Compose na porta local configurada, API e Next em modo de desenvolvimento.

| Verificação                 | Resultado                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Instalação congelada        | Aprovada                                                                           |
| Cópia antes da migração     | `pg_dump` gravado em `.data/backups/antes-rota-do-dia-2026-11-16.sql`              |
| Migrações SQL               | Terceira migração aplicada sobre a base existente; as duas anteriores reconhecidas |
| TypeScript                  | Três projetos aprovados                                                            |
| ESLint / Prettier           | Aprovados                                                                          |
| Testes unitários/integrados | 18 aprovados, 0 falhas                                                             |
| Consulta de CEP             | Resposta real do ViaCEP para um CEP público, pela API e pelo formulário            |
| Navegador                   | Conferência manual em 375 px e desktop com uma empresa de teste, removida ao final |
| Testes de navegador (e2e)   | **Não executados**; um seletor do fluxo foi ajustado para o novo campo de endereço |
| Build de produção e Docker  | **Não executados** nesta etapa                                                     |

Os nove testes unitários novos cobrem chave de endereço, horários de saída/chegada/volta, os três tipos de alerta, agrupamento por endereço, atendimento sem endereço, uso do trecho registrado, links do Google Maps com divisão acima de três paradas, escolha do próximo dia, consulta de CEP com fonte de reserva e falhas, e a linha única do endereço.

O teste integrado novo cria empresa, endereço de partida, cliente com endereço estruturado e quatro atendimentos (um cancelado), grava estimativas, confere resumo, alerta de atraso, link de navegação, dia padrão, isolamento entre empresas e a auditoria de criação da empresa, configurações com valores anteriores, visualizações, exportação e estimativas, sem senha no histórico.

No navegador foram conferidos: abertura no próximo dia com atendimento, troca de dia, resumo, linha do tempo com parada de duas pessoas, alerta de atraso, gravação de estimativa com recálculo da volta, preenchimento por CEP e foco no número, endereço da cliente copiado para o atendimento, histórico com antes e depois e lista de clientes em cartões.

Ainda não validado: uso em um celular real e fora da rede local (a porta do Compose continua restrita ao próprio computador), abertura dos links no aplicativo do Google Maps e a aparência de todas as telas depois da nova escala tipográfica — foram vistas rota, clientes, atendimentos, formulários de cliente e de atendimento e configurações.

## Etapa de 16/11/2026: acesso pelo celular na rede local

Executado no mesmo computador Windows 11, com o endereço de rede `192.168.15.14`:

| Verificação                             | Resultado                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up -d --build`          | Imagens da API e da web construídas com o código novo (inclui o build de produção); três serviços saudáveis                           |
| Migração dentro do contêiner            | Reconhecida como já aplicada; API iniciou                                                                                             |
| Página pelo endereço de rede            | HTTP 200 em `http://192.168.15.14:3000`                                                                                               |
| Porta da API pelo endereço de rede      | Sem resposta, como esperado (a API não é publicada)                                                                                   |
| Entrada com origem do endereço de rede  | Chega à validação de senha (401 para credenciais inválidas), não é mais recusada pela origem                                          |
| Origem de outro site ou outro aparelho  | 403 “Origem não autorizada”                                                                                                           |
| Fluxo autenticado pelo endereço de rede | Cadastro de empresa de teste, criação de cliente com endereço, rota do dia, CEP, histórico e saída; cookie HttpOnly e SameSite=Strict |
| Testes contra os contêineres            | `TEST_API_URL=http://localhost:3000/api`: 20 aprovados, 0 falhas, passando pelo proxy da web                                          |
| TypeScript / ESLint / Prettier          | Aprovados                                                                                                                             |

Não validado: abertura a partir de um celular de verdade. As requisições acima saíram do próprio computador, portanto não passaram pelo firewall do Windows. Nesta máquina a rede está marcada como Pública e existe regra de entrada liberada para o Docker Desktop nesse perfil; em outra instalação pode ser preciso marcar a rede como Privada. Os testes de navegador (e2e) continuam sem execução nesta etapa.

## Correção de 23/11/2026: inicializador Windows

Sintoma: `INICIAR-WINDOWS.cmd` parava em "A interface ainda nao respondeu", com os três contêineres no ar e a página abrindo no navegador.

Causa: a espera consultava `http://localhost:3000` com tempo limite de 2 s. No Windows, `localhost` resolve primeiro para `::1`; nada escuta em `::1:3000`, e o Windows leva cerca de 2 s para desistir dessa conexão antes de tentar `127.0.0.1`. Todas as 60 tentativas esgotavam o tempo.

Correção: a espera usa `http://127.0.0.1:3000` com tempo limite de 5 s. Verificado: a checagem passou em 0,3 s com o stack do Compose no ar; a consulta a `localhost` continuou esgotando em 2 s.
