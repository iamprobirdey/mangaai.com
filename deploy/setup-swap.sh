#!/usr/bin/env bash
# Adds a 2 GB swap file so `next build` doesn't run out of memory on a 1 GB droplet.
# Run once as root:  sudo bash deploy/setup-swap.sh
set -euo pipefail
SIZE="${1:-2G}"

if swapon --show | grep -q '/swapfile'; then
  echo "Swap already on:"; swapon --show; exit 0
fi
fallocate -l "$SIZE" /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
# Prefer RAM; only swap under real pressure.
sysctl -w vm.swappiness=10
echo 'vm.swappiness=10' > /etc/sysctl.d/99-mangaai-swap.conf
swapon --show
