#!/usr/bin/env bash
set -euo pipefail
umask 077
backup_dir="${1:?Usage: bash scripts/restore.sh /path/to/backup}"
# Restore to a fresh, isolated database. Does not erase an existing installation.
media_dir="${RESTORE_MEDIA_PATH:?Set RESTORE_MEDIA_PATH to a new empty directory}"
if [ -d "$media_dir" ] && [ -n "$(ls -A "$media_dir")" ]; then printf '%s\n' 'Media directory must be empty' >&2; exit 1; fi
(cd "$backup_dir" && sha256sum -c SHA256SUMS)
mkdir -p "$media_dir"
docker compose exec -T db pg_restore -U gferraz -d "${RESTORE_DATABASE:?Set RESTORE_DATABASE to an existing empty database}" --exit-on-error --no-owner < "$backup_dir/database.dump"
tar -xzf "$backup_dir/media.tar.gz" -C "$media_dir"
printf '%s\n' 'Restore finished. Configure the restored DB/media paths and run the application integrity check.'
