#!/usr/bin/env bash
# Source from the repository root; respects existing injected or .env database configuration.
if [ -z "${DATABASE_URL:-}" ] && [ ! -f .env ]; then
  # This is an isolated local development database, not external credentials.
  if docker inspect gferraz-postgres >/dev/null 2>&1; then
    docker start gferraz-postgres >/dev/null
  else
    docker run -d --name gferraz-postgres -e POSTGRES_USER=gferraz -e POSTGRES_PASSWORD=gferraz_local_dev -e POSTGRES_DB=gferraz -p 127.0.0.1:5432:5432 -v gferraz_pgdata:/var/lib/postgresql/data postgres:17-alpine >/dev/null
  fi
  export DATABASE_URL=postgresql://gferraz:gferraz_local_dev@127.0.0.1:5432/gferraz
  for attempt in $(seq 1 20); do
    if docker exec gferraz-postgres pg_isready -U gferraz -d gferraz >/dev/null; then break; fi
    sleep 1
  done
fi
