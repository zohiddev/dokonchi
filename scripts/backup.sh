#!/usr/bin/env bash
# Dokonchi — PostgreSQL avtomatik backup.
# Cron orqali har kuni ishlaydi. Oxirgi 14 kunlik nusxalar saqlanadi.
set -euo pipefail

APP_DIR="/opt/dokonchi"
BACKUP_DIR="/opt/dokonchi-backups"
COMPOSE_FILE="docker-compose.prod.yml"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

# .env dan POSTGRES_USER / POSTGRES_DB ni o'qib olamiz
set -a
[ -f .env ] && . ./.env
set +a

STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
FILE="$BACKUP_DIR/dokonchi_${STAMP}.sql.gz"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-dokonchi}" "${POSTGRES_DB:-dokonchi}" \
  | gzip > "$FILE"

echo "✓ Backup tayyor: $FILE ($(du -h "$FILE" | cut -f1))"

# 14 kundan eski backuplarni o'chirish
find "$BACKUP_DIR" -name 'dokonchi_*.sql.gz' -mtime +14 -delete
echo "✓ Eski backuplar tozalandi (14 kundan eski)"
