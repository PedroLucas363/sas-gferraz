#!/usr/bin/env bash
set -euo pipefail
cd /workspace/sas-gferraz
export npm_config_cache=/workspace/.cache/npm
if [ ! -x /workspace/.tools/node_modules/.bin/pnpm ]; then
  npm install --prefix /workspace/.tools pnpm@10.34.8 --no-audit --no-fund
fi
export PATH="/workspace/.tools/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile --store-dir /workspace/.cache/pnpm-store
source scripts/cloud-db.sh
pnpm --filter @gferraz/shared build
pnpm db:generate

pnpm db:migrate
