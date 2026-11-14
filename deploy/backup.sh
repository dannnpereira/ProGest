#!/usr/bin/env bash
# Copia o banco H2 (volume progest-data) para ./backups, mantendo os 7 mais recentes.
# O backend fica parado por alguns segundos para o arquivo do banco ficar consistente.
# Uso (na raiz do projeto, dentro da EC2):  bash deploy/backup.sh
# Agendar todo dia as 3h:  crontab -e  ->  0 3 * * * cd ~/ProGest && bash deploy/backup.sh
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups
arquivo="progest-$(date +%Y%m%d-%H%M%S).tar.gz"
volume="$(docker volume ls -q --filter name=progest-data | head -n1)"

docker compose stop backend
docker run --rm -v "$volume":/data:ro -v "$PWD/backups":/backup alpine \
  tar czf "/backup/$arquivo" -C /data .
docker compose start backend

ls -1t backups/progest-*.tar.gz | tail -n +8 | xargs -r rm --
echo "Backup salvo em backups/$arquivo"
