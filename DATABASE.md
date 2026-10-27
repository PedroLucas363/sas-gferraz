# Banco de dados e regras de negócio

PostgreSQL 17, Prisma, dinheiro em `Decimal(14,2)` e respostas monetárias como strings. IDs UUID, exceto hash de sessão. Instantes em `timestamptz`; datas civis em `date`. Apresentação no fuso `America/Sao_Paulo`. A interface brasileira usa real e datas dia/mês/ano.

## Entidades

| Entidade                    | Papel e relacionamentos                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| Organization                | Empresa, nome e preferências. Limite de isolamento de todos os registros.                   |
| User / Session              | Proprietária de uma empresa e sessões expirantes. Senha nunca exportada.                    |
| Client                      | Dados opcionais, preferências, consentimento, campos personalizados e arquivamento.         |
| Service                     | Catálogo, categoria, duração e preço de referência.                                         |
| Event                       | Agrupa atendimentos de várias clientes num mesmo evento.                                    |
| Appointment                 | Cliente, evento opcional, instante, duração, situação, endereço, ajustes e vencimento.      |
| AppointmentItem             | Vários serviços por atendimento; quantidade, preço contratado, nome e categoria históricos. |
| Payment / Allocation        | Recebimento efetivo com taxa; distribui o valor entre atendimentos da mesma cliente.        |
| Refund                      | Devolução parcial por alocação, data efetiva e motivo, sem apagar o pagamento original.     |
| Expense                     | Competência, vencimento, pagamento opcional, categoria fixa/variável, atendimento opcional. |
| Vehicle / Trip              | Custos anuais configuráveis, consumo, combustível e trechos estimados.                      |
| Media                       | Cliente, atendimento opcional, caminhos privados relativos, checksum e metadados.           |
| SavedView                   | Consulta serializada do mecanismo central, com versão otimista.                             |
| Audit                       | Antes/depois das operações de negócio, ator e instante.                                     |
| ImportBatch / ImportReceipt | Prévia original preservada, relatório, origem, fingerprint e registro criado.               |
| _gferraz_migrations         | Controle operacional das migrações SQL e seus checksums.                                    |

Relações de negócio usam `(organizationId, id)` como chave candidata e FKs compostas. Consultas também filtram a empresa da sessão. O banco rejeita relações entre clientes/serviços/atendimentos de empresas diferentes. A migração adiciona checks de valores positivos, quantidades e situações permitidas. Acesso direto com credenciais administrativas do PostgreSQL exige proteção da infraestrutura; não há RLS nesta versão.

## Regras centrais

`Contratado = Σ(quantidade × preço do item) − desconto + adicionais + deslocamento cobrado`.

`Recebido do atendimento = Σ(alocações de pagamentos ativos − reembolsos dessas alocações)`.

`Saldo = contratado − recebido`. Não existe coluna de saldo mutável. Descontos não podem gerar total negativo. Recebimentos não podem superar o saldo. Alocações repetidas para o mesmo atendimento no mesmo pagamento são rejeitadas. Todas as alocações devem ser da mesma cliente e empresa. Reembolsos não podem superar a alocação disponível. Reduzir o total abaixo do que já foi recebido exige reembolsar antes.

Uma alteração de preço no catálogo não modifica contratos históricos: nome, categoria e preço são copiados para o item no ato da contratação. Editar os itens de um atendimento é uma alteração contratual explícita e auditada. Se o atendimento já possui pagamento ou mídia, sua cliente não pode ser trocada.

Recebimentos não são editados destrutivamente. Uma correção é feita por estorno com motivo e novo lançamento. Recebimentos com reembolso devem preservar ambos os eventos. Despesas têm edição versionada e estorno lógico. Clientes, serviços e veículos são arquivados; atendimentos são cancelados por situação. Histórico financeiro não é apagado pela aplicação.

## Indicadores e períodos

- **Faturamento:** total dos atendimentos concluídos cuja data em São Paulo pertence ao período. Inclui o deslocamento cobrado e os ajustes contratuais.
- **Recebimentos:** entradas na data efetiva menos reembolsos na data da devolução; sinais futuros também entram no caixa.
- **A receber:** saldo positivo de contratos ativos no período do atendimento. Orçamentos, cancelados e não comparecimentos não compõem esse indicador. O filtro de período é explícito; “Todo o histórico” mostra a carteira completa.
- **Vencidos:** a receber com vencimento estritamente anterior à data atual de São Paulo.
- **Despesas por competência:** valores por `incurredOn`, pagos ou pendentes.
- **Despesas pagas:** valores por `paidOn`; a tabela de origem usa a mesma base.
- **Resultado por competência:** faturamento − despesas por competência − taxas financeiras no período de recebimento.
- **Resultado de caixa:** recebimentos líquidos de reembolsos − despesas pagas − taxas financeiras recebidas no período.
- **Margem:** resultado / receita do regime × 100; receita zero mostra margem zero.
- **Clientes atendidas:** clientes distintas em atendimentos concluídos, rastreáveis pelos mesmos atendimentos.

Taxas registradas em pagamentos já entram no resultado: não cadastre a mesma taxa como despesa avulsa. Reembolso diminui caixa e reabre saldo; não altera a prestação histórica. Cancelamento retira o contrato das contas a receber e do faturamento, preservando movimentos; devolva os valores recebidos quando aplicável. A regra de reconhecimento de taxas por data efetiva é uma decisão inicial explícita e poderá ser refinada para competência contratual.

## Veículos e estimativas

`Custo/km = preço do combustível / consumo + (seguro + manutenção + pneus + óleo + impostos + depreciação + outros custos anuais) / km anuais`.

`Custo estimado do trecho = km informados × custo/km + estacionamento + pedágio`. O valor cobrado da cliente é independente. Provisões anuais e trechos estimados não criam despesas e não são deduzidos novamente do resultado. Despesas reais devem ser lançadas uma única vez. O custo/km e os trechos servem ao orçamento e ao roteiro, com fonte manual identificada.

## Migração histórica

A prévia mantém abas, linhas, colunas, fórmulas e resultados disponíveis. Não avalia fórmulas arbitrárias. Campos desconhecidos permanecem no JSON original. Cada linha exige revisão. Nomes exatamente normalizados podem ser consolidados quando a usuária confirma a identidade; homônimos ou telefones conflitantes exigem ID explícito. Horário, data, valor e serviço precisam ser corrigidos quando ausentes. Registros comerciais de outros negócios precisam de classificação antes de gravação.

Recebimentos históricos exigem vinculação explícita a um atendimento. Status “Pago” sem data efetiva em despesa exige correção. Não há pagamentos presumidos. SHA do arquivo + aba/linha e fingerprint do mapeamento impedem reimportação exata; duplicidades semânticas entre arquivos editados continuam sujeitas à revisão. Resultados distinguem importados, ignorados e pendentes.

Na tabela de clientes, um filtro de período seleciona quem teve pelo menos um atendimento concluído no intervalo; os totais da ficha continuam sendo históricos. Despesas ligadas a atendimentos incluem o nome da cliente na pesquisa; despesas gerais não pertencem a uma cliente. No detalhe de atendimento, os recebimentos são mostrados pelos valores alocados àquele contrato, evitando atribuir o pagamento inteiro quando ele foi dividido entre contratos.

Alterar observações, data ou situação de um atendimento mantém os snapshots de nome e categoria dos itens existentes, inclusive se o serviço for arquivado. O catálogo não reescreve o histórico. Um serviço arquivado não pode ser usado em novos atendimentos; contratos antigos continuam editáveis e recebíveis.

Na importação, a duração **prevista** de 60 minutos é apenas uma proposta explícita na prévia e pode ser corrigida antes de gravar. O sistema não infere duração realizada. A referência de preço de um serviço histórico ainda não catalogado começa em zero, sinalizada para revisão; o valor contratado vem exclusivamente da linha validada.

## Distribuição e privacidade

O código versionado contém o schema, as migrações e as regras de negócio. Os dados PostgreSQL, mídias, planilhas originais, backups e configurações com valores privados ficam fora do Git. Uma nova instalação cria sua própria base e sua conta de acesso; o envio ao GitHub não transfere os registros da instalação de desenvolvimento.
