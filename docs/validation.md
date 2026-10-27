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
