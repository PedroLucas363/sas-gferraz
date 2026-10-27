# Análise da planilha GFerraz Makeup

Arquivo fornecido: `FECHAMENTO - GFERRAZ MAKEUP 2026.xlsx`, 18 abas. A fonte foi lida sem alteração. Este documento descreve estruturas, sem copiar nomes, telefones ou registros financeiros pessoais para o Git.

| Abas                                                | Estrutura observada                                                                                                                                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clientes_2025, Clientes_2026                        | Data e horário, nome, tipo de cliente, abreviação do serviço e valor contratado. Resumos de quantidades e valores em colunas laterais.                                                                          |
| ABRIL a DEZEMBRO 2025 (9 abas)                      | Despesas: compra, local/site, banco, forma, parcela, classificação/subclassificação, valor, status e vencimento. Data da compra presente somente em algumas estruturas; mudanças de coluna em abas posteriores. |
| ABRIL, JUNHO, JULHO, AGOSTO, SETEMBRO 2026 (5 abas) | Recebimentos por transferência, cliente, serviço/evento, data do evento, valor do serviço, deslocamento, forma, tipo/parcela e valor transferido. Telefone aparece em setembro; colunas mudam entre meses.      |
| Página1                                             | Duas tabelas de preços, lado a lado, com diferenças. Exige revisão de vigência antes de popular o catálogo.                                                                                                     |
| CARRO                                               | Tarifas por distância, combustível, consumo, quilômetros anuais e custos proporcionais/depreciação. Não são despesas automaticamente.                                                                           |

## Achados

- Nomes de abas e cabeçalhos podem divergir do ano das datas. A linha real deve prevalecer após validação.
- Há data com ano `0202`, datas ausentes e informações de “sinal” em campos de valor ou parcela.
- Há recebimentos sem identificação completa da cliente, serviço ou data do evento.
- `VALOR DO SERVIÇO` se repete em parcelas: somá-lo entre recebimentos duplicaria o contrato.
- Fórmulas `COUNTIF`, `SUMIF` e `SUM` usam intervalos diferentes, por vezes incompletos. Algumas fórmulas misturam transferências, despesas e deslocamentos. Não devem definir a regra financeira do novo sistema.
- Algumas abas têm mais de mil linhas dimensionadas por formatação, mas poucas dezenas de linhas preenchidas. A leitura ignora linhas realmente vazias.
- Existem resumos e pagamentos de assistentes em colunas laterais. Eles precisam ser preservados para revisão, sem virar recebimentos de clientes por posição da célula.
- Existem vendas de atividade comercial distinta dos serviços de beleza; é necessário decidir classificação e empresa apropriada.
- Apenas nome não é identificador seguro para homônimos. A consolidação deve ser supervisionada.

## Plano de migração

1. Guardar arquivo original com checksum e backup privado.
2. Gerar prévia de todas as abas, com linha e conteúdo original, sem gravar operações.
3. Revisar catálogo e tipos comerciais; não converter fórmulas de resumo em pagamentos.
4. Confirmar identidades e cadastrar atendimentos com valores e datas validados.
5. Vincular cada transferência a um contrato; se faltam dados, manter pendente.
6. Importar despesas com competência e data efetiva confirmadas; parcelas são obrigações individuais.
7. Conferir totais de linhas reconhecidas contra importadas, ignoradas e pendentes, por tipo e período.
8. Testar reexecução sem duplicação. Exportar relatório e resolver pendências antes de declarar a migração concluída.

O importador atual armazena conteúdo original, oferece edição das correspondências e confirma somente linhas revisadas. Fórmulas com resultado cacheado são lidas; não há avaliação livre de fórmulas. Resumos, preços, veículo e informações laterais permanecem na origem para revisão e etapas posteriores. O processo não altera o XLSX.

## Ensaio de prévia no backend

A leitura do arquivo real pela API identificou **18 abas e 829 linhas preservadas**: 276 candidatas a atendimento, 112 a recebimento, 297 a despesa e 144 de referência/revisão. São candidatos sujeitos a validação, não registros financeiros já conciliados. O ensaio ocorreu numa empresa isolada de teste, sem confirmar importação. O relatório estrutural, sem dados pessoais ou valores históricos, está em `spreadsheet-validation.json`. O upload original também é preservado no armazenamento privado, fora do Git.
