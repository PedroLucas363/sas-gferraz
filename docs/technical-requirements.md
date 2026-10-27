# Atualização dos requisitos técnicos — GFerraz Makeup

## 11. Armazenamento local e organização de imagens

Inicialmente, todas as fotografias de clientes e atendimentos deverão ser armazenadas localmente no sistema de arquivos do computador ou servidor onde a aplicação estiver instalada.

**Não quero depender de serviços de armazenamento em nuvem nesta primeira versão.**

Além de permitir o acesso às imagens pelo sistema web, quero que os arquivos sejam organizados automaticamente em pastas convencionais, permitindo que a usuária abra essas pastas pelo Explorador de Arquivos do Windows e visualize as fotografias sem precisar acessar o sistema.

### Organização das pastas

O backend deverá criar e gerenciar uma estrutura de diretórios organizada por cliente e atendimento.

Exemplo:

```text
GFerraz Makeup/
└── Clientes/
    ├── Maria Silva - 0001/
    │   ├── Perfil/
    │   │   └── foto_perfil.jpg
    │   └── Atendimentos/
    │       ├── 2026-10-24 - Casamento - 0125/
    │       │   ├── maquiagem_01.jpg
    │       │   ├── maquiagem_02.jpg
    │       │   └── penteado_01.jpg
    │       └── 2026-11-15 - Evento Social - 0182/
    │           └── maquiagem_01.jpg
    └── Ana Costa - 0002/
        ├── Perfil/
        └── Atendimentos/
```

Os nomes devem ser legíveis e úteis para a organização, mas utilizar identificadores únicos para evitar conflitos entre clientes com nomes iguais.

Sanitize nomes de arquivos e diretórios para impedir caracteres inválidos, conflitos de caminhos e ataques de path traversal.

### Requisitos funcionais

- Permitir upload de imagens diretamente no cadastro da cliente e no registro de atendimento.
- Criar automaticamente as pastas correspondentes.
- Salvar as fotografias originais, preservando sua qualidade.
- Gerar miniaturas otimizadas separadamente para utilização no frontend.
- Permitir múltiplas imagens por atendimento.
- Associar as imagens aos registros correspondentes no banco de dados.
- Permitir visualizar, adicionar e excluir imagens pelo sistema.
- Organizar as imagens de maneira que continuem compreensíveis mesmo fora da aplicação.
- Evitar duplicação desnecessária dos arquivos.

A localização raiz das imagens deve ser configurável por uma variável de ambiente, como `MEDIA_ROOT`.

Não armazene imagens como dados binários no PostgreSQL. Guarde no banco apenas os metadados, identificadores e caminhos relativos necessários.

### Integração com o sistema operacional

O sistema deverá funcionar corretamente em ambiente Windows, incluindo instalações locais executadas com Docker.

Caso seja utilizado Docker, configure um bind mount para que a pasta de imagens exista fisicamente no computador hospedeiro e permaneça acessível pelo Explorador de Arquivos.

Os arquivos não poderão ficar exclusivamente dentro do sistema de arquivos temporário de um container.

### Segurança

Apesar de estarem armazenadas localmente, as imagens devem ser acessadas pela aplicação somente mediante autorização.

Não exponha a pasta de imagens como diretório público do servidor web.

Considere que usuários com acesso direto à pasta no sistema operacional poderão visualizar os arquivos independentemente da autenticação da aplicação. Documente essa característica e recomende permissões apropriadas.

### Backup e integridade

Implemente uma estratégia de backup que contemple:

- Banco de dados PostgreSQL.
- Fotografias originais.
- Metadados e caminhos das imagens.
- Configurações necessárias para restauração.

O sistema também deverá ser capaz de identificar arquivos referenciados no banco que não existam mais no armazenamento.

### Expansão futura

Crie uma abstração de armazenamento com interfaces reutilizáveis.

Implemente inicialmente um adaptador de armazenamento local, mas permita futuramente incorporar serviços como Amazon S3 sem precisar reescrever os módulos de clientes e atendimentos.

Não implemente armazenamento em nuvem agora.

## 14. Arquitetura e stack tecnológica obrigatória

Quero utilizar tecnologias modernas, amplamente adotadas em projetos profissionais, com suporte ativo, documentação e possibilidade de expansão.

A arquitetura deverá separar frontend, backend e banco de dados, mantendo contratos de comunicação bem definidos.

### 14.1. Frontend

Utilize:

- Next.js com App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- TanStack Table.
- React Hook Form.
- Zod.
- Recharts.

O Next.js será o framework principal do frontend.

Organize os componentes para permitir reutilização de formulários, tabelas, filtros, modais, indicadores, dashboards e demais elementos.

Implemente gerenciamento consistente de estados de carregamento, erros e dados vazios.

O frontend deverá consumir os serviços da API do backend, evitando duplicar regras de negócio.

### 14.2. Backend

Utilize:

- Node.js em uma versão LTS compatível e suportada.
- NestJS.
- TypeScript.
- API REST.
- Validação estruturada de dados.
- Autenticação e autorização.
- Documentação OpenAPI/Swagger.

Desenvolva o backend como um monólito modular, com separação clara das responsabilidades.

Crie módulos por domínio de negócio, como clientes, atendimentos, serviços, financeiro, agenda, deslocamento, veículos, relatórios, imagens e configurações.

Não utilize microsserviços nesta primeira versão.

Centralize cálculos, validações e regras financeiras no backend, mantendo-os independentes dos componentes de interface.

O backend deve ser utilizável futuramente por outros clientes, como aplicativos móveis ou integrações externas.

### 14.3. Banco de dados

Utilize obrigatoriamente PostgreSQL como banco de dados relacional.

Para acesso ao banco, utilize Prisma ORM em versão estável e compatível com o projeto.

Implemente:

- Migrações versionadas.
- Chaves primárias e estrangeiras.
- Índices apropriados.
- Restrições de integridade.
- Transações financeiras atômicas.
- Isolamento de dados entre empresas.
- Consultas e agregações eficientes.
- Estratégia de backup e restauração.

Evite cálculos financeiros realizados exclusivamente no frontend.

Utilize tipos decimais adequados para representar valores monetários.

### 14.4. Estrutura do repositório

Prefira um monorepositório organizado, por exemplo:

```text
gferraz-makeup/
├── apps/
│   ├── web/          # Next.js
│   └── api/          # NestJS
├── packages/
│   └── shared/       # Contratos e tipos compartilhados
├── infra/
│   └── docker/       # Infraestrutura
├── docs/             # Documentação
├── docker-compose.yml
├── .env.example
└── README.md
```

Utilize pnpm workspaces e, se houver justificativa, Turborepo.

Não adicione ferramentas que aumentem a complexidade sem benefício concreto.

### 14.5. Execução local e implantação

O projeto deverá permitir execução local durante o desenvolvimento e implantação em um servidor próprio futuramente.

Crie configurações Docker Compose para:

1. Frontend Next.js.
2. Backend NestJS.
3. PostgreSQL.
4. Volumes persistentes do banco de dados.
5. Bind mount configurável para as imagens.

Disponibilize comandos claros para iniciar, parar, atualizar e testar a aplicação.

O sistema não deve depender obrigatoriamente de Vercel, Supabase ou serviços pagos.

Documente como executar o projeto no Windows e como migrá-lo para um servidor Linux.

### 14.6. Qualidade do projeto

Configure:

- ESLint.
- Prettier.
- Testes unitários.
- Testes de integração.
- Testes end-to-end dos principais fluxos.
- Validação dos tipos TypeScript.
- Tratamento centralizado de erros.
- Logs estruturados.
- Variáveis de ambiente.
- Documentação da API.

Utilize bibliotecas estáveis e compatíveis entre si.

Antes de instalar dependências, verifique as versões estáveis e os requisitos de compatibilidade.

Não utilize versões beta, release candidates ou experimentais sem necessidade justificada.

### 14.7. Princípios de arquitetura

Priorize:

- Separação de responsabilidades.
- Código legível e sustentável.
- Componentes e serviços reutilizáveis.
- Ausência de lógica de negócio duplicada.
- Independência entre interface e persistência.
- Segurança por padrão.
- Evolução incremental.
- Facilidade de manutenção.
- Baixo acoplamento.

O objetivo é desenvolver um software profissional, mas evitar arquiteturas excessivamente complexas para o tamanho inicial do projeto.
