#!/usr/bin/env bash
# Prepara uma EC2 Ubuntu 24.04 nova para rodar o ProGest.
# Uso (dentro da EC2):  bash deploy/setup-ec2.sh
set -euo pipefail

# 1) Swap de 2 GB: o build do Angular e do Maven precisa de memoria
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 2) Docker + plugin do Compose (script oficial da Docker)
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo
echo "Pronto. Saia e entre de novo no SSH (para o grupo docker valer) e rode:"
echo "  cp .env.example .env && nano .env      # DOCKERHUB_USUARIO, DB_PASSWORD e ADMIN_SENHA"
echo "  docker compose pull && docker compose up -d"
