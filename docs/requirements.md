# PROMPT PARA CODEX — SISTEMA DE GESTÃO GFERRAZ MAKEUP

## 1. Objetivo geral do projeto

Quero que você atue como um desenvolvedor full-stack sênior, arquiteto de software, especialista em experiência do usuário (UX/UI) e analista de sistemas.

Sua missão é **planejar, desenvolver, testar e documentar um sistema web de gestão para a GFerraz Makeup**, uma empresa de serviços de maquiagem, penteados, cursos e atendimentos de beleza.

O sistema deverá ser simples, intuitivo, visualmente agradável e funcional para uma profissional autônoma, mas possuir uma arquitetura robusta, segura, escalável e modular, permitindo futuras expansões e adaptações para outras empresas.

**Não quero apenas telas demonstrativas ou um protótipo. Quero uma aplicação real, com banco de dados persistente, operações de cadastro, edição, exclusão, consultas, relatórios e funcionalidades integradas.**

O principal objetivo é substituir o controle atualmente realizado em planilhas, centralizando informações de clientes, serviços, agendamentos, pagamentos, despesas, deslocamentos e resultados financeiros.

## 2. Referência obrigatória: planilha existente

Atualmente, a GFerraz Makeup utiliza uma planilha para registrar clientes, serviços e movimentações financeiras.

Link:

[Referência privada fornecida pela usuária. Utilize o arquivo XLSX original; o endereço da planilha não é publicado no código.]

**Antes de definir completamente o banco de dados, tente acessar e analisar essa planilha.**

Quero que você:

1. Identifique todas as abas e como estão organizadas.
2. Analise os campos, fórmulas, categorias e relacionamentos.
3. Entenda como os registros de clientes, serviços e pagamentos são realizados atualmente.
4. Considere que podem existir diversas abas mensais contendo a mesma estrutura, mas informações diferentes.
5. Identifique inconsistências, duplicidades e oportunidades de melhoria.
6. Utilize os dados e fluxos existentes como referência para a modelagem do sistema.
7. Elabore um plano de migração dos registros históricos.

Não copie simplesmente a estrutura da planilha. Transforme-a em um modelo de dados relacional, consistente e mais eficiente.

Se não conseguir acessar o link, implemente um mecanismo para importar arquivos XLSX e CSV, incluindo múltiplas abas. Não invente informações presentes na planilha e não considere uma importação concluída sem validação.

Após o desenvolvimento, quero que o sistema possa ser preenchido com os registros históricos existentes na planilha.

## 3. Identidade visual e experiência do usuário

O sistema deve seguir a identidade visual da GFerraz Makeup.

Como referência inicial, considere:

- Nome: GFerraz Makeup
- Cor bege: `#F9EAD2`
- Verde: `#546B57`
- Tons neutros e suaves como apoio
- Estética elegante, delicada, minimalista e profissional

Essas cores são referências iniciais. O sistema deverá permitir ajustes a partir do logotipo e de outros arquivos de identidade visual disponibilizados.

### Diretrizes de design

Quero um sistema que seja:

- Limpo, moderno e visualmente consistente.
- Intuitivo mesmo para quem não possui conhecimentos técnicos.
- Totalmente responsivo para desktop, tablet e celular.
- Fácil de navegar, com poucos cliques para tarefas recorrentes.
- Organizado em listas, cartões, formulários e painéis.
- Capaz de exibir grandes quantidades de informações sem ficar visualmente poluído.

Utilize uma barra lateral com acesso aos principais módulos, cabeçalhos claros, botões de ação consistentes e indicadores visuais discretos.

Permita personalização do logotipo, cores, nome da empresa e preferências de exibição.

Priorize a usabilidade. Não quero excesso de efeitos visuais, animações desnecessárias ou interfaces complicadas.

## 4. Módulo de clientes

Crie um cadastro completo de clientes, incluindo, quando disponíveis:

- Identificador único.
- Nome completo.
- Telefone e WhatsApp.
- E-mail.
- Data de nascimento.
- Endereço.
- Fotografia de identificação.
- Observações gerais.
- Preferências de maquiagem e penteado.
- Restrições, sensibilidades e informações relevantes autorizadas pela cliente.
- Histórico de atendimentos.
- Histórico de pagamentos.
- Saldo financeiro pendente.
- Data do primeiro e do último atendimento.

O cadastro deverá permitir campos opcionais e campos personalizados.

### Página individual da cliente

Ao clicar em uma cliente, quero visualizar uma página com suas informações e diferentes seções:

**Dados gerais:** informações pessoais, fotografia e contatos.

**Histórico de serviços:** todos os serviços contratados, concluídos, agendados ou cancelados.

**Financeiro:** valor total contratado, valor recebido, pagamentos parciais e valores pendentes.

**Galeria:** fotografias dos atendimentos anteriores.

**Observações:** informações relevantes para atendimentos futuros.

O sistema deverá permitir acessar diretamente um atendimento a partir do histórico da cliente.

Também quero filtros para identificar clientes recorrentes, clientes com pagamentos pendentes, clientes atendidas em determinado período e clientes que não retornam há algum tempo.

## 5. Módulo de serviços

O sistema deve permitir cadastrar os tipos de serviços oferecidos pela empresa.

Exemplos:

- Maquiagem Express.
- Maquiagem Social.
- Maquiagem Personalizada.
- Penteado.
- Maquiagem e penteado.
- Serviços para noivas.
- Serviços para debutantes.
- Cursos de automaquiagem.
- Cursos profissionais.
- Outros serviços personalizados.

Cada tipo poderá possuir um preço de referência, duração estimada, categoria e descrição.

Entretanto, **o valor de um atendimento deve poder ser diferente do preço de referência**.

### Registro individual de atendimento

Cada atendimento deverá conter:

- Cliente vinculada.
- Um ou mais serviços contratados.
- Data e horário.
- Duração prevista e realizada.
- Local e endereço do atendimento.
- Valor dos serviços.
- Descontos e adicionais.
- Taxa de deslocamento.
- Valor total contratado.
- Valor recebido.
- Saldo restante.
- Forma e situação de pagamento.
- Custos associados.
- Observações.
- Fotos do resultado.
- Status do atendimento.

Status sugeridos: orçamento, aguardando confirmação, confirmado, em andamento, concluído, cancelado e não compareceu.

É importante separar **agendamento, serviço prestado e pagamento**, pois eles são eventos diferentes.

Um agendamento pode envolver vários serviços. Uma cliente pode ter diferentes agendamentos, realizar pagamentos antecipados e pagar um mesmo atendimento em várias parcelas.

Também pode haver atendimentos realizados em grupo, por exemplo, uma noiva, sua mãe e quatro madrinhas no mesmo evento.

Nesse cenário, quero vincular os atendimentos ao mesmo evento, mantendo os dados, valores e pagamentos individuais quando necessário.

## 6. Módulo financeiro

Este é um dos módulos mais importantes do sistema.

Quero acompanhar contratos, recebimentos, despesas, saldos, custos e lucratividade.

### Controle de recebimentos

O sistema deve permitir:

- Registrar pagamentos integrais e parciais.
- Registrar sinais de reserva.
- Definir vencimentos.
- Associar pagamentos a serviços ou agendamentos.
- Registrar a data efetiva de recebimento.
- Identificar formas de pagamento: Pix, dinheiro, cartão, transferência e outras.
- Registrar taxas de cartão.
- Registrar reembolsos e estornos.
- Consultar o histórico financeiro por cliente.
- Identificar saldos pendentes automaticamente.

Um pagamento deve poder ser distribuído entre diferentes serviços de uma mesma cliente, caso seja necessário.

Evite valores duplicados e inconsistências entre pagamentos e saldos.

### Indicadores financeiros

Quero visualizar:

- Faturamento mensal.
- Valores efetivamente recebidos no mês.
- Valores a receber.
- Valores vencidos.
- Total de despesas.
- Lucro mensal estimado.
- Margem de lucro.
- Receita por categoria de serviço.
- Receita de deslocamentos.
- Custos de deslocamento.
- Ticket médio.
- Evolução dos resultados financeiros.

**É fundamental diferenciar faturamento, recebimento e lucro.**

Definições iniciais:

- Faturamento: valor dos serviços efetivamente prestados no período, conforme regra de reconhecimento definida no sistema.
- Recebimento: dinheiro que efetivamente entrou no período, inclusive sinais e pagamentos referentes a outros meses.
- Saldo a receber: valor contratado ainda não quitado.
- Resultado financeiro: receitas menos despesas, com possibilidade de consultar por regime de caixa ou competência.

Os cálculos precisam ter regras claras, documentadas e consistentes.

Não confunda dinheiro recebido com lucro.

### Despesas

Permita registrar despesas como:

- Cosméticos e produtos.
- Materiais descartáveis.
- Ferramentas e equipamentos.
- Deslocamento.
- Manutenção.
- Taxas financeiras.
- Aluguel e estrutura.
- Marketing.
- Pagamento de profissionais parceiros.
- Outras despesas.

Permita classificar despesas como fixas ou variáveis, vinculá-las a atendimentos quando aplicável e cadastrar despesas recorrentes.

## 7. Tabelas dinâmicas e visualizações personalizadas

Uma das funcionalidades que mais quero é a possibilidade de **construir visualizações dos dados de maneira semelhante ao Excel, Airtable ou Notion**.

Não quero depender de um programador para criar toda nova consulta.

Cada módulo deverá apresentar uma tabela interativa com recursos como:

- Pesquisa textual.
- Ordenação por uma ou várias colunas.
- Filtros simples e avançados.
- Agrupamento por campos.
- Seleção de colunas visíveis.
- Reorganização de colunas.
- Ajuste de largura.
- Paginação.
- Totais e subtotais.
- Exportação de dados.
- Salvamento de visualizações.

Os filtros devem permitir condições como igual a, diferente de, contém, maior que, menor que, entre datas, vazio e não vazio.

Permita combinar filtros com operadores E/OU.

### Salvamento de visualizações

Quero poder criar e salvar visualizações, por exemplo:

**Clientes inadimplentes de outubro**

Filtro de atendimentos em outubro + saldo pendente maior que zero + vencimento ultrapassado, permitindo também consultar pendências ainda não vencidas.

**Atendimentos de novembro**

Todos os serviços agendados para novembro, ordenados por data.

**Recebimentos pendentes**

Serviços com pagamento parcial ou não realizado.

**Receita por tipo de serviço**

Agrupamento por categoria, com soma dos valores.

**Clientes recorrentes**

Clientes organizadas pela quantidade de atendimentos.

As visualizações salvas deverão aparecer em uma área de fácil acesso, preservando filtros, agrupamentos, ordenações, colunas e demais configurações.

Também quero poder editar, duplicar, renomear e excluir essas visualizações.

Implemente essa funcionalidade como um componente reutilizável, para que funcione em diferentes módulos sem duplicar código.

Priorize uma interface visual de configuração, não comandos SQL.

## 8. Dashboards

Crie um dashboard inicial para apresentar as principais informações do negócio.

Desejo visualizar rapidamente:

- Atendimentos de hoje.
- Próximos atendimentos.
- Faturamento do mês.
- Recebimentos do mês.
- Valor pendente de recebimento.
- Pagamentos atrasados.
- Despesas do mês.
- Lucro estimado.
- Clientes atendidas.
- Comparação com meses anteriores.

Inclua gráficos relevantes como:

- Evolução mensal do faturamento.
- Comparativo de receitas e despesas.
- Distribuição de serviços por categoria.
- Histórico dos recebimentos.
- Composição dos custos.

Todos os gráficos devem utilizar os dados reais cadastrados.

Permita selecionar períodos específicos e personalizar os indicadores exibidos.

O usuário deverá conseguir acessar os registros que originaram determinado indicador.

O dashboard deverá ser útil para a tomada de decisões, não apenas visualmente bonito.

## 9. Agenda e roteiro diário de atendimentos

Quero uma agenda integrada aos atendimentos cadastrados.

Ela deverá oferecer visualização por dia, semana e mês.

Ao selecionar um dia, quero gerar um **roteiro de trabalho completo**.

### Exemplo de funcionamento

Considere que existam três clientes agendadas para determinado dia.

O sistema deverá:

1. Identificar os atendimentos confirmados.
2. Ordená-los pelos horários previstos.
3. Consultar os endereços.
4. Considerar o endereço de partida configurado pela profissional.
5. Calcular o deslocamento da casa até a primeira cliente.
6. Calcular os deslocamentos entre clientes sucessivas.
7. Estimar os horários necessários de saída.
8. Considerar as durações dos serviços.
9. Identificar conflitos ou riscos de atraso.
10. Apresentar o roteiro em uma interface clara e organizada.

### Exemplo de informações exibidas

**Atendimento 1**

Cliente: Maria

Horário: 08h00

Endereço: cadastrado no atendimento

Serviço: maquiagem + penteado

Duração estimada: 1h30

Saída de casa: horário calculado

Tempo estimado de deslocamento: calculado por serviço de rotas

**Atendimento 2**

Cliente: Ana

Horário: 11h00

Origem: endereço do atendimento anterior

Tempo estimado de deslocamento: calculado

Horário recomendado de saída: calculado

### Requisitos adicionais

- Integração com um provedor de mapas e rotas, como Google Maps Platform.
- Cálculo de distância e tempo previsto.
- Consideração de trânsito e horário de partida quando suportados.
- Configuração de tempo de segurança entre atendimentos.
- Identificação de agendamentos conflitantes.
- Opção de abrir o trajeto em um aplicativo de navegação.
- Possibilidade de informar o endereço de partida manualmente.
- Possibilidade de alterar a sequência de visitas, respeitando os horários contratados.
- Exibição clara quando uma estimativa de deslocamento não estiver disponível.

Não invente distâncias ou tempos caso a API esteja indisponível. Permita inserir estimativas manualmente.

O roteiro deve ser responsivo e especialmente fácil de consultar pelo celular.

## 10. Módulo de veículos e deslocamento

Quero um módulo específico para cadastrar veículos e calcular o custo dos deslocamentos profissionais.

Cada veículo poderá conter:

- Marca e modelo.
- Ano.
- Combustível utilizado.
- Consumo médio em km/L.
- Preço do combustível.
- Quilometragem anual estimada.
- Seguro.
- IPVA e licenciamento.
- Manutenção.
- Revisões.
- Pneus.
- Trocas de óleo.
- Alinhamento e balanceamento.
- Depreciação.
- Outros custos.

Como referência inicial, a profissional utiliza um Fox Rock in Rio 1.6, ano 2016, abastecido com etanol, com uso estimado de 15.000 km por ano.

Entre os custos históricos informados estão seguro de R$ 250 por mês, revisão anual de R$ 3.000, pneus de R$ 2.000 a cada quatro anos, alinhamento/balanceamento de R$ 500 a cada seis meses e óleo de R$ 400 a cada seis meses.

Essas informações deverão ser editáveis e validadas, não tratadas como valores definitivos.

### Cálculo de deslocamento

O sistema deverá calcular um custo estimado por quilômetro considerando:

- Combustível.
- Manutenção proporcional.
- Seguro proporcional.
- Depreciação.
- Outros custos fixos e variáveis.

Permita calcular deslocamentos de ida e volta, percursos com múltiplas paradas e custos adicionais como estacionamento e pedágio.

O valor cobrado da cliente deve ser independente do custo real do deslocamento.

Exemplo:

Custo estimado do deslocamento: R$ 24,00

Valor cobrado da cliente: R$ 35,00

Resultado estimado do deslocamento: R$ 11,00

O usuário deverá poder ajustar manualmente o valor cobrado.

Permita cadastrar diferentes veículos e selecionar qual será utilizado no atendimento.

Evite contabilizar os mesmos custos duas vezes no cálculo do lucro geral. Documente como os custos estimados e as despesas efetivamente pagas entram nos relatórios.

## 11. Fotografias e anexos

O sistema deverá permitir anexar arquivos e fotografias.

### Fotografias de clientes

Quero adicionar uma foto de identificação para reconhecer a cliente com facilidade.

### Fotografias de atendimentos

Quero armazenar fotos dos serviços realizados, permitindo visualizar os resultados anteriores e consultar um histórico visual.

### Funcionalidades

- Upload de múltiplas imagens.
- Miniaturas de visualização.
- Galeria por cliente.
- Galeria por atendimento.
- Visualização ampliada.
- Exclusão de arquivos.
- Armazenamento seguro.
- Compressão e otimização de imagens quando apropriado.

Considere a necessidade de consentimento para armazenamento e eventual utilização das fotografias, respeitando a LGPD.

As fotos devem permanecer privadas e não poderão ser acessadas por URLs públicas sem controle de autorização.

## 12. Relatórios

Crie uma área para relatórios financeiros, operacionais e comerciais.

Relatórios iniciais:

**Financeiros**

- Faturamento por período.
- Recebimentos por período.
- Valores a receber.
- Pagamentos atrasados.
- Lucro e margem.
- Despesas por categoria.
- Recebimentos por forma de pagamento.
- Taxas de cartão.
- Receitas e custos de deslocamento.

**Clientes**

- Clientes atendidas no período.
- Clientes com maior volume financeiro.
- Clientes recorrentes.
- Clientes sem atendimentos recentes.
- Histórico de uma cliente específica.
- Clientes com pagamentos pendentes.

**Serviços**

- Serviços mais realizados.
- Receita por serviço.
- Quantidade de serviços por mês.
- Ticket médio por categoria.
- Cancelamentos.

**Operacionais**

- Agenda diária.
- Roteiro de atendimentos.
- Horas previstas de trabalho.
- Deslocamentos realizados.

Permita filtrar, visualizar e exportar relatórios em formatos adequados, como CSV, XLSX ou PDF.

Os relatórios deverão utilizar uma fonte de dados consistente com o restante do sistema.

## 13. Arquitetura e modelagem do banco de dados

Quero uma arquitetura profissional, sem complexidade desnecessária.

A aplicação deve utilizar um banco de dados relacional, com relacionamentos bem definidos, integridade referencial e migrações versionadas.

Sugestões de entidades:

- Organizações/empresas.
- Usuários.
- Permissões.
- Clientes.
- Endereços.
- Categorias de serviço.
- Tipos de serviço.
- Eventos.
- Agendamentos.
- Itens de serviço contratados.
- Pagamentos.
- Alocações de pagamento.
- Despesas.
- Categorias de despesas.
- Veículos.
- Custos de veículos.
- Deslocamentos.
- Fotografias e anexos.
- Visualizações salvas.
- Configurações da empresa.
- Histórico de alterações.

Essas entidades são referências, não uma obrigação de reproduzi-las literalmente.

Analise os relacionamentos antes de implementar e apresente sua justificativa para as principais decisões.

### Regras de integridade

- Cada cliente deverá ter um identificador único.
- Cada serviço poderá estar associado a um agendamento e a uma cliente.
- Um agendamento poderá conter vários itens de serviço.
- Um serviço poderá receber pagamentos parciais.
- Um pagamento poderá ter alocações para diferentes itens.
- Os saldos deverão ser calculados com base nos registros financeiros.
- Não deverá haver duplicação de receita ao registrar pagamentos.
- Exclusões financeiras deverão preservar rastreabilidade.
- Valores monetários deverão utilizar tipos decimais apropriados, evitando erros de ponto flutuante.

Registre datas corretamente, considerando o fuso horário `America/Sao_Paulo`, e apresente valores em reais, com formatação brasileira.

## 14. Tecnologia sugerida

Caso o repositório ainda não possua uma arquitetura definida, recomendo avaliar:

- Next.js com TypeScript.
- React.
- Tailwind CSS.
- shadcn/ui.
- PostgreSQL.
- Supabase para autenticação, banco e armazenamento, se adequado.
- TanStack Table para tabelas interativas.
- React Hook Form e Zod para formulários e validações.
- Recharts para gráficos.
- Um provedor de mapas e rotas com integração isolada.
- Testes automatizados.

Você pode sugerir tecnologias diferentes se apresentar uma justificativa técnica consistente.

Prefira soluções maduras, com boa documentação e manutenção ativa.

Se o projeto já possuir código, inspecione a estrutura antes de modificar qualquer arquivo e preserve decisões existentes que façam sentido.

## 15. Expansão futura e possibilidade de reutilização

Embora o sistema seja inicialmente utilizado pela GFerraz Makeup, quero que ele possa evoluir para um produto usado por outras empresas e profissionais.

Por isso, considere desde o início:

- Separação dos dados por empresa.
- Configurações específicas de cada negócio.
- Identidade visual personalizável.
- Categorias e serviços configuráveis.
- Campos personalizados.
- Permissões de acesso.
- Módulos independentes.
- Componentes reutilizáveis.
- Estrutura preparada para múltiplos usuários.

Projete um modelo multiempresa, com isolamento seguro dos dados.

**Isso não significa que quero um SaaS complexo agora.**

Não implemente funcionalidades desnecessárias como assinaturas, cobrança da plataforma, marketplaces ou automações avançadas nesta primeira versão.

Quero apenas uma base que permita essas evoluções sem reconstruir todo o sistema.

## 16. Segurança, privacidade e confiabilidade

O sistema trabalhará com dados pessoais e financeiros.

Implemente:

- Autenticação segura.
- Controle de acesso.
- Isolamento de dados por empresa.
- Validação de entradas.
- Proteção contra acesso indevido.
- Armazenamento privado de imagens.
- Registro de operações importantes.
- Tratamento de erros.
- Estratégia de backups.
- Exportação dos dados.
- Boas práticas de proteção de dados e LGPD.

Não exponha chaves de API, tokens ou credenciais no frontend ou no repositório.

Qualquer integração externa deverá utilizar configurações seguras por variáveis de ambiente.

## 17. Importação e migração da planilha

Depois de implementar a estrutura necessária, quero importar os dados históricos.

O processo deverá ser seguro e verificável.

Crie uma rotina ou assistente de importação capaz de:

1. Ler as abas da planilha.
2. Mapear as colunas de origem para o banco de dados.
3. Identificar registros duplicados.
4. Consolidar clientes repetidas em diferentes meses.
5. Preservar o histórico individual dos atendimentos.
6. Importar informações financeiras sem criar pagamentos fictícios.
7. Interpretar corretamente datas e valores no formato brasileiro.
8. Identificar campos vazios e dados inconsistentes.
9. Mostrar uma prévia das alterações antes de gravar os dados.
10. Permitir corrigir erros de correspondência.
11. Registrar a origem dos dados importados.
12. Evitar duplicações ao executar novamente a importação.
13. Gerar um relatório com os registros importados, ignorados e pendentes de revisão.
14. Comparar os totais financeiros da origem com os dados importados.

Nunca descarte informações antigas silenciosamente.

Se algum campo não puder ser mapeado automaticamente, preserve o dado original para revisão.

Não modifique a planilha de origem sem autorização.

## 18. Critérios de aceitação

Antes de considerar o projeto concluído, valide no mínimo os seguintes cenários:

**Cenário A — Cadastro de cliente**

Cadastrar uma cliente com telefone, endereço e fotografia, depois encontrá-la pela busca e abrir sua página de detalhes.

**Cenário B — Agendamento com vários serviços**

Criar um atendimento com maquiagem, penteado e deslocamento, verificando o valor total.

**Cenário C — Pagamento parcial**

Registrar sinal de R$ 50 em um atendimento de R$ 350 e confirmar que o saldo pendente seja R$ 300.

Registrar posteriormente outro pagamento e conferir a atualização do saldo.

**Cenário D — Separação entre competência e caixa**

Cadastrar um serviço realizado em outubro, com pagamento recebido em novembro, e conferir sua classificação correta nos relatórios de faturamento e recebimento.

**Cenário E — Relatórios**

Consultar todos os serviços de outubro com saldo pendente e verificar a consistência dos resultados.

**Cenário F — Visualizações salvas**

Criar uma visualização personalizada, aplicar filtros, ocultar colunas, salvar e recuperá-la posteriormente com todas as configurações.

**Cenário G — Roteiro diário**

Cadastrar três atendimentos com horários e endereços diferentes e gerar o roteiro considerando origem, deslocamentos e duração dos serviços.

**Cenário H — Custos do veículo**

Cadastrar os custos do veículo, calcular o custo estimado por quilômetro e utilizar esse cálculo em um atendimento.

**Cenário I — Importação**

Importar registros de uma planilha com abas mensais, identificando clientes repetidas sem duplicar os atendimentos.

**Cenário J — Isolamento de dados**

Criar duas empresas de teste e comprovar que uma não consiga consultar ou modificar dados privados da outra.

Automatize os testes sempre que possível.

## 19. Ordem de desenvolvimento

Organize a implementação em fases, priorizando uma versão funcional e testável.

**Fase 1 — Fundação**

Inspeção do projeto, definição da arquitetura, banco de dados, autenticação, identidade visual e layout principal.

**Fase 2 — Operação principal**

Cadastros de clientes, serviços, agendamentos, histórico, pagamentos e despesas.

**Fase 3 — Consultas e análise**

Tabelas dinâmicas, visualizações salvas, dashboards e relatórios.

**Fase 4 — Logística**

Cadastro de veículos, custos de deslocamento, agenda e roteiros diários.

**Fase 5 — Importação**

Mapeamento final, importação e validação dos registros históricos da planilha.

**Fase 6 — Qualidade**

Testes automatizados, revisão de segurança, ajustes de usabilidade, documentação e preparação para implantação.

Mantenha o sistema executável e funcional ao final de cada fase.

Caso seja necessário utilizar uma API externa ainda sem credenciais, implemente sua interface e um tratamento apropriado de indisponibilidade, documentando claramente a configuração necessária.

Não substitua dados reais por simulações sem avisar.

## 20. Instruções de execução

Quero que você trabalhe efetivamente no projeto, e não apenas descreva como desenvolvê-lo.

Comece inspecionando o repositório e o ambiente de execução.

Em seguida:

1. Analise os requisitos e a planilha, quando acessível.
2. Apresente uma proposta resumida da arquitetura.
3. Defina as entidades principais e os relacionamentos.
4. Crie um plano de implementação por etapas.
5. Implemente a aplicação, incluindo frontend, backend, banco de dados e migrações.
6. Execute os testes possíveis.
7. Corrija os problemas encontrados.
8. Documente a instalação, execução, variáveis de ambiente, estrutura e implantação.
9. Prepare a importação dos dados e realize-a quando houver acesso autorizado e ambiente adequado.
10. Entregue um resumo do que foi implementado, o que foi validado e o que ainda depende de configuração.

Não pare após criar uma estrutura de pastas ou algumas telas estáticas.

Tome decisões técnicas razoáveis de maneira autônoma. Solicite esclarecimentos somente quando faltar uma informação realmente indispensável, como credenciais, arquivos privados ou decisões que não possam ser tomadas com segurança.

Se houver limitações de ambiente, avance com o que puder ser implementado e testado sem depender delas.

**Resultado esperado:** um sistema de gestão GFerraz Makeup utilizável, bonito, confiável e organizado, capaz de substituir a planilha atual, oferecer uma visão completa do negócio e servir como base para expansões futuras.

O princípio central do projeto deve ser:

**Simplicidade para quem utiliza, consistência nos dados e robustez na arquitetura.**
