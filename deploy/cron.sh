#!/usr/bin/env bash
# Calls one of the app's scheduled-job endpoints with the CRON_SECRET from .env.production.
# Used by deploy/crontab. Usage: deploy/cron.sh weekly-digest | trial-reminders | daily-maintenance
set -euo pipefail

APP_DIR="${MANGAAI_DIR:-/srv/mangaai}"
JOB="${1:?job name required}"
case "$JOB" in weekly-digest|trial-reminders|daily-maintenance) ;; *) echo "unknown job: $JOB" >&2; exit 2 ;; esac

SECRET="$(grep -E '^CRON_SECRET=' "$APP_DIR/shared/.env.production" | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
[[ -n "$SECRET" ]] || { echo "CRON_SECRET missing in .env.production" >&2; exit 1; }

# Talk to the app directly on localhost (no TLS, no Nginx); the secret never leaves the droplet.
# The header comes from a here-string so the secret doesn't appear in the process list.
curl -fsS --max-time 290 -K - "http://127.0.0.1:3000/api/cron/$JOB" <<<"header = \"Authorization: Bearer $SECRET\""
echo
