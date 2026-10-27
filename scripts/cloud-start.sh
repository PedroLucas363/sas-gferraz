#!/usr/bin/env bash
set -euo pipefail
cd /workspace/sas-gferraz
export PATH="/workspace/.tools/node_modules/.bin:$PATH"
source scripts/cloud-db.sh
pnpm db:migrate
exec pnpm dev
