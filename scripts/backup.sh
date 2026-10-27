#!/usr/bin/env bash
set -euo pipefail
umask 077
# Run from the repository root, with the complete Compose stack running.
backup_dir="${1:?Usage: bash scripts/backup.sh /path/outside/repository}"
media_dir="${MEDIA_HOST_PATH:-./.data/GFerraz Makeup}"
mkdir -p "$backup_dir"
# Stop only the writing service; DB stays available for pg_dump.
docker compose stop api
trap 'docker compose start api >/dev/null' EXIT
docker compose exec -T db pg_dump -U gferraz -d gferraz -Fc > "$backup_dir/database.dump"
tar -czf "$backup_dir/media.tar.gz" -C "$media_dir" .
cp .env.example "$backup_dir/configuration-template.env"
(cd "$backup_dir" && sha256sum database.dump media.tar.gz > SHA256SUMS)
printf '%s\n' 'Backup finished. Store actual configuration secrets separately in a secure vault.'
