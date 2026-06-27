#!/usr/bin/env bash
# Dokonchi — CapRover'dagi PostgreSQL uchun avtomatik backup.
# Cron orqali har kuni ishlaydi. Oxirgi 14 kunlik nusxalar saqlanadi.
set -euo pipefail

# CapRover'dagi PostgreSQL app nomi ("srv-captain--" siz). Kerak bo'lsa o'zgartiring.
PG_APP="${PG_APP:-dokonchi-db}"
BACKUP_DIR="/opt/dokonchi-backups"

mkdir -p "$BACKUP_DIR"

CID="$(docker ps -q -f "name=srv-captain--${PG_APP}" | head -n1)"
if [ -z "$CID" ]; then
  echo "✗ Postgres konteyner topilmadi: srv-captain--${PG_APP}"
  exit 1
fi

STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
FILE="$BACKUP_DIR/dokonchi_${STAMP}.sql.gz"

# Konteyner ichidagi POSTGRES_USER / POSTGRES_DB env'laridan foydalanamiz
docker exec "$CID" sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$FILE"

echo "✓ Backup tayyor: $FILE ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -name 'dokonchi_*.sql.gz' -mtime +14 -delete
echo "✓ Eski backuplar tozalandi (14 kundan eski)"
