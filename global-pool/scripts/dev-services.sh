#!/usr/bin/env bash
# Local dev services without Docker daemon: Postgres 16 + Redis 7 (data in global-pool/.dev, git-ignored).
# Usage: bash scripts/dev-services.sh start|stop|status
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; DEV="$ROOT/.dev"; PGBIN=/usr/lib/postgresql/16/bin; PGDATA="$DEV/pg"
mkdir -p "$DEV"
id -u gpdev >/dev/null 2>&1 || useradd -r -m gpdev 2>/dev/null || true
case "${1:-start}" in
  start)
    if [ ! -f "$PGDATA/PG_VERSION" ]; then mkdir -p "$PGDATA"; chown -R gpdev "$DEV"; su gpdev -s /bin/bash -c "$PGBIN/initdb -D '$PGDATA' -U postgres --auth=trust >/dev/null"; fi
    chown -R gpdev "$DEV"
    su gpdev -s /bin/bash -c "$PGBIN/pg_ctl -D '$PGDATA' -l '$DEV/pg.log' -o '-p 5432 -k /tmp' status" >/dev/null 2>&1 || su gpdev -s /bin/bash -c "$PGBIN/pg_ctl -D '$PGDATA' -l '$DEV/pg.log' -o '-p 5432 -k /tmp' -w start" >/dev/null
    psql -h 127.0.0.1 -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='globalpool'" | grep -q 1 || psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE globalpool" >/dev/null
    psql -h 127.0.0.1 -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='globalpool_test'" | grep -q 1 || psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE globalpool_test" >/dev/null
    redis-cli -p 6379 ping >/dev/null 2>&1 || redis-server --port 6379 --daemonize yes --dir "$DEV" --logfile "$DEV/redis.log" >/dev/null
    echo "postgres: postgresql://postgres@127.0.0.1:5432/globalpool  redis: redis://127.0.0.1:6379";;
  stop) su gpdev -s /bin/bash -c "$PGBIN/pg_ctl -D '$PGDATA' stop" || true; redis-cli -p 6379 shutdown nosave || true;;
  status) su gpdev -s /bin/bash -c "$PGBIN/pg_ctl -D '$PGDATA' status" || true; redis-cli -p 6379 ping || true;;
esac
