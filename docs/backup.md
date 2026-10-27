# Backup e restauração

O backup completo inclui PostgreSQL (metadados, auditoria, importações e caminhos), pasta de originais e miniaturas e configuração da instalação. Exportar CSV/JSON não substitui backup do banco. Preserve os segredos em local seguro separado; o script copia somente o modelo público de configuração.

## Docker em Linux ou Git Bash no Windows

Execute da raiz, com o Compose configurado e permissões adequadas:

```bash
bash scripts/backup.sh /pasta/segura/backup-2026-10-23
```

O script pausa apenas a API escritora, mantém o PostgreSQL disponível, executa `pg_dump -Fc`, arquiva `MEDIA_HOST_PATH`, calcula checksums e reinicia a API via trap. Nenhum serviço externo deve gravar no banco durante a operação. Tenha espaço disponível e verifique os códigos de saída. Para Windows sem Git Bash, os mesmos passos podem ser realizados no PowerShell com `docker compose stop api`, `pg_dump`, `Compress-Archive` da pasta de mídia e reinício da API. Não use redirecionamento binário de versões antigas do PowerShell sem verificar a integridade do dump.

A restauração foi projetada para uma base e pasta novas, sem apagar a instalação original:

```bash
# crie antes um banco PostgreSQL vazio, por exemplo gferraz_restored
RESTORE_DATABASE=gferraz_restored RESTORE_MEDIA_PATH=/nova/pasta/media \
  bash scripts/restore.sh /pasta/segura/backup-2026-10-23
```

Após restaurar, configure `DATABASE_URL` e `MEDIA_ROOT`/bind mount para os destinos novos, inicie API/web, entre e use “Verificar arquivos” em Configurações. Confira totais, clientes e abertura das fotografias. Os metadados contêm caminhos relativos, permitindo mudar a raiz de armazenamento.

Os checksums confirmam integridade de transporte, não autenticidade do backup; proteja o destino e as chaves. Use cópia fora da máquina, criptografia e retenção conforme necessidade do negócio. Teste restauração regularmente. Não exclua o banco ou os arquivos atuais para “testar”. Não há promessa de restauração validada até executar o ensaio completo e documentar a evidência.
