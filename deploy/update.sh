#!/usr/bin/env bash
# Deploy the latest main to the droplet, with no downtime and an instant rollback.
#
#   /srv/mangaai/repo                git clone of the project (fetched, never served)
#   /srv/mangaai/releases/<stamp>    one folder per deploy, built in place
#   /srv/mangaai/current  ->         symlink to the live release (PM2 runs from here)
#   /srv/mangaai/shared/.env.production   secrets, linked into every release
#
# Usage (as the app user):   /srv/mangaai/repo/deploy/update.sh [git-ref]
#        roll back:          /srv/mangaai/repo/deploy/update.sh --rollback
set -euo pipefail

APP_DIR="${MANGAAI_DIR:-/srv/mangaai}"
REPO="$APP_DIR/repo"
RELEASES="$APP_DIR/releases"
SHARED="$APP_DIR/shared"
KEEP=3
HEALTH_URL="http://127.0.0.1:3000/api/health"

log() { printf '\n==> %s\n' "$*"; }

switch_to() {
  ln -sfn "$1" "$APP_DIR/current.new" && mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"
  pm2 startOrReload "$APP_DIR/current/deploy/ecosystem.config.cjs" --update-env
  pm2 save >/dev/null
}

health_check() {
  for _ in $(seq 1 30); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

if [[ "${1:-}" == "--rollback" ]]; then
  current="$(readlink -f "$APP_DIR/current")"
  previous="$(ls -1dt "$RELEASES"/*/ | sed 's#/$##' | grep -vx "$current" | head -n1 || true)"
  [[ -n "$previous" ]] || { echo "No earlier release to roll back to."; exit 1; }
  log "Rolling back to $(basename "$previous")"
  switch_to "$previous"
  health_check && echo "Rolled back and healthy." || { echo "Rolled back, but the health check is failing. Check: pm2 logs mangaai"; exit 1; }
  exit 0
fi

[[ -f "$SHARED/.env.production" ]] || { echo "Missing $SHARED/.env.production (see deploy/README.md)."; exit 1; }

REF="${1:-origin/main}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
NEW="$RELEASES/$STAMP"

log "Fetching $REF"
git -C "$REPO" fetch --quiet --prune origin
COMMIT="$(git -C "$REPO" rev-parse --short "$REF")"

log "Preparing release $STAMP ($COMMIT)"
mkdir -p "$RELEASES" "$APP_DIR/logs"
git -C "$REPO" worktree prune
git -C "$REPO" archive "$COMMIT" | (mkdir -p "$NEW" && tar -x -C "$NEW")
ln -s "$SHARED/.env.production" "$NEW/.env.production"
echo "$COMMIT" > "$NEW/REVISION"

log "Installing dependencies"
(cd "$NEW" && npm ci --no-audit --no-fund)

log "Building (the live site keeps running meanwhile)"
if ! (cd "$NEW" && NODE_OPTIONS="--max-old-space-size=1536" npm run build); then
  echo "Build failed. The live site was not touched. Removing $NEW."
  rm -rf "$NEW"
  exit 1
fi

previous="$(readlink -f "$APP_DIR/current" 2>/dev/null || true)"
log "Switching to $STAMP"
switch_to "$NEW"

if ! health_check; then
  echo "New release failed its health check."
  if [[ -n "$previous" && -d "$previous" ]]; then
    echo "Rolling back to $(basename "$previous")."
    switch_to "$previous"
  fi
  exit 1
fi

log "Cleaning up old releases (keeping $KEEP)"
ls -1dt "$RELEASES"/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf

log "Deployed $COMMIT. Live: $(readlink -f "$APP_DIR/current")"
