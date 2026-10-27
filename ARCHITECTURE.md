# Arquitetura

## Componentes e contratos

Monorepositório pnpm: `apps/web` (Next.js App Router, React e TypeScript), `apps/api` (NestJS REST e Prisma), `packages/shared` (contratos Zod e metadados das consultas). PostgreSQL 17 é a única base operacional. As fotografias ficam no filesystem, sob `MEDIA_ROOT`; o banco guarda caminhos e metadados. Docker Compose separa web, API e banco.

O frontend utiliza Tailwind CSS, componentes próprios com o padrão shadcn/ui (Radix Dialog e Slot, CVA, classes extensíveis), TanStack Table, React Hook Form/Zod, TanStack Query e Recharts. O proxy `app/api/[...path]/route.ts` lê a URL interna em runtime e preserva cookie/origem. Nenhuma chave privada vai ao browser.

O backend é um monólito com serviços de autenticação, negócio, consulta/financeiro, importação e armazenamento. O controller REST ainda é central: extrair controllers por domínio sem duplicar as regras está no roadmap. O Swagger documenta as rotas; contratos de entrada completos ficam nos schemas compartilhados. Somente a API decide totais, saldos, taxas, resultados e custos.

## Fonte única e navegação rastreável

`finance.ts` define valores contratados, pagamentos alocados, reembolsos e custo por km. `business.service.ts` valida relacionamentos e grava em transações serializáveis, incluindo auditoria. `data.service.ts` carrega um snapshot PostgreSQL com isolamento repeatable-read. `query.ts` aplica o contrato `Query` para tabelas, indicadores e exportações.

Cada indicador carrega entidade, medida, consulta original, sinal e subtotal de suas fontes. Resultado e margem possuem múltiplas fontes. O detalhe usa o mesmo `DataTable`; período, pesquisa e regras de situação são mantidos. Para despesas em caixa, `dateField=paidOn` garante que indicador e tabela usem a data efetiva, enquanto competência usa `incurredOn`. Faturamento e recebimento permanecem distintos.

`DataTable` é central para clientes, serviços, atendimentos, recebimentos, despesas, veículos, relatórios e históricos. `SavedView.query` persiste filtro E/OU, período, ordenações múltiplas, agrupamento, visibilidade, ordem, largura e paginação. Filtros têm campos permitidos e não aceitam SQL. A URL mantém a consulta da página. A API fornece totais do conjunto completo filtrado, não apenas da página visível.

Após qualquer mutação bem-sucedida, TanStack Query invalida as consultas ativas. Há atualização automática a cada 15 segundos e ao focar a janela para alterações de outra sessão. Não existe saldo armazenado separadamente que precise de correção manual.

## Integridade e segurança

Sessões opacas de 256 bits: somente SHA-256 do token no banco, expiração em 7 dias, cookie HttpOnly/SameSite Strict. Senhas com scrypt e salt aleatório. Origem obrigatória para mutações autenticadas e comparação com `WEB_ORIGIN`; entradas validadas com Zod. Não há IDs de empresa aceitos em payloads. A empresa é derivada da sessão. Chaves estrangeiras compostas impedem relações entre empresas.

Versão otimista evita sobrescrever cadastros antigos. Transações financeiras serializáveis rejeitam concorrência e excesso de pagamento/reembolso. O usuário recebe conflito para recarregar e tentar novamente; não há repetição cega de gravação. Arquivamentos e estornos mantêm histórico e motivo. Fotos exigem consentimento e autorização em toda leitura; originais e miniaturas não ficam em `public`.

A versão inicial possui uma proprietária por empresa; convite, matriz granular de permissões, recuperação de senha, MFA e fechamento do cadastro público ainda precisam de implementação antes de uma implantação multiusuária aberta. O limitador de tentativas é local ao processo; em múltiplas instâncias precisará de armazenamento compartilhado. A política de logs evita imprimir tokens, senhas e payloads pessoais.

## Decisões de ferramentas

Node 24 LTS e versões estáveis de Next/Nest/React foram consultadas no registro antes da instalação. Prisma 6.19.3 usa o cliente JavaScript e `@prisma/adapter-pg`; não depende de engine Rust para consultas. A geração de cliente usa `engine: js` no arquivo de configuração. Esse recurso do **CLI** requer `experimental.adapter` nesta versão: sua adoção está justificada pelo bloqueio de rede aos binários nativos; não é uma dependência beta do runtime.

A aplicação usa migrações SQL versionadas na pasta Prisma. O comando `pnpm db:migrate` usa `pg`, transação, advisory lock e checksum SHA-256 em `_gferraz_migrations`. O `prisma migrate deploy` com engine WASM apresentou incompatibilidade ao desserializar o tipo PostgreSQL `name`; por isso ele não é o comando operacional deste projeto. Não execute dois mecanismos de migração na mesma instalação. Não foram desativadas verificações de TLS, assinatura ou checksum.

## Limites de escala e próximas separações

A versão inicial agrega snapshots da empresa em memória para garantir regras idênticas em todos os consumidores. Índices estão presentes, mas consultas de grandes volumes devem migrar as mesmas regras para SQL/visões e paginação no banco. São necessários benchmarks antes de anunciar suporte a grandes bases. Uploads têm limites de tamanho e pixels; proteção adicional contra arquivos XLSX comprimidos maliciosos é etapa de hardening. Nenhuma informação da planilha é tratada como comando executável.

## Empacotamento de produção

O frontend usa o output standalone do Next, incluindo os arquivos estáticos no contêiner. A API é empacotada com `pnpm deploy --legacy --prod` e executa `dist/migrate.js` e `dist/main.js`, sem dependências do frontend nem compiladores de desenvolvimento. O cliente Prisma é gerado explicitamente em `apps/api/generated/client` (ignorado pelo Git) e incluído no pacote. Não depende de arquivos gerados soltos no node_modules do builder.

O comando de empacotamento do pnpm 10 é sinalizado como experimental na própria ajuda; o uso está restrito ao build, com versão fixa, e é justificado pelo limite de disco de 32 GB da nuvem. O pacote de produção da API foi medido em 328 MB. O runtime utiliza dependências estáveis. A geração automática redundante do Prisma no empacotamento é desabilitada depois da geração explícita, sem alterar verificação de TLS ou checksum.

## Distribuição do código

A branch `main` do repositório `PedroLucas363/sas-gferraz` reúne fontes, contratos compartilhados, migrações, infraestrutura, testes e documentação. O inicializador Windows apenas orquestra o Docker Compose existente; as regras de negócio continuam na API. A aplicação foi validada em Linux, e o guia Windows descreve os pré-requisitos para teste na máquina da usuária. Publicar o código no GitHub e implantar os serviços são operações distintas.
