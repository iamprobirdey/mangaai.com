# Deploying MangaAI to a DigitalOcean droplet

One droplet runs everything: Nginx in front, the Next.js app under PM2 on `127.0.0.1:3000`, and
cron for the two scheduled emails. Supabase, Razorpay and Resend stay hosted where they are.

```
browser ──HTTPS──> Nginx :443 ──> Next.js (PM2) 127.0.0.1:3000 ──> Supabase / Razorpay / Resend
cron ───────────────────────────> 127.0.0.1:3000/api/cron/*   (never exposed publicly)
```

Folder layout on the droplet:

| Path | What it is |
|---|---|
| `/srv/mangaai/repo` | git clone of the project (used to fetch code and scripts) |
| `/srv/mangaai/releases/<time>` | one folder per deploy, built in place; last 3 kept |
| `/srv/mangaai/current` | symlink to the live release; PM2 runs from here |
| `/srv/mangaai/shared/.env.production` | the secrets, linked into every release |
| `/srv/mangaai/logs` | app and cron logs |

`deploy/update.sh` builds a new release next to the live one while the site keeps serving, then
switches over (a ~2-second app restart) once the build succeeds, and checks `/api/health`. A
broken build never touches the live site, and it rolls back by itself if the new release fails
its health check.

---

## 1. Create the droplet

- **Image:** Ubuntu 24.04 LTS. **Size:** 1 GB RAM is enough to run the site; the swap file in
  step 3 covers the build. 2 GB makes builds faster.
- **Region:** Bangalore (BLR1), closest to your users and to Supabase Mumbai.
- **Auth:** SSH key.
- In **Networking → Domains**, or at your registrar, point `mangaai.com` and `www.mangaai.com`
  (A records) at the droplet's IP. If you use Cloudflare, see step 8 first.

## 2. Base setup (as root)

```bash
ssh root@<droplet-ip>

apt update && apt -y upgrade
apt -y install nginx git curl ufw certbot python3-certbot-nginx

# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt -y install nodejs
npm install -g pm2

# Firewall: SSH + web only
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# App user (no password login; you use sudo from your own account or root)
adduser --disabled-password --gecos "" mangaai
mkdir -p /srv/mangaai/{releases,shared,logs}
chown -R mangaai:mangaai /srv/mangaai
```

## 3. Swap (as root)

```bash
curl -fsSL https://raw.githubusercontent.com/iamprobirdey/mangaai.com/main/deploy/setup-swap.sh -o /tmp/setup-swap.sh
bash /tmp/setup-swap.sh
```

(Or run it after step 4 from `/srv/mangaai/repo/deploy/setup-swap.sh`.)

## 4. Get the code (as the app user)

The repo is private, so give the droplet a **read-only deploy key**:

```bash
sudo -iu mangaai
ssh-keygen -t ed25519 -C "mangaai-droplet" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

On GitHub: **repo → Settings → Deploy keys → Add deploy key**, paste it, leave "Allow write
access" **off**. Then:

```bash
git clone git@github.com:iamprobirdey/mangaai.com.git /srv/mangaai/repo
chmod +x /srv/mangaai/repo/deploy/*.sh
```

## 5. Secrets (as the app user)

Create `/srv/mangaai/shared/.env.production` with every variable from `.env.example`. Copy the
values from your local `.env.local`, then change these for production:

| Variable | Production value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://mangaai.com` |
| `SITE_INDEXABLE` | `true` (lets Google index the live site) |
| `PRICING_REGION` | **leave empty** (it forces a region; only for local testing) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | live keys, once Razorpay activates the account |
| `RAZORPAY_PLAN_*` | the live plan IDs (live and test plans are different) |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you set on the live webhook (step 9) |
| `EMAIL_FROM` | an address on your verified Resend domain, e.g. `MangaAI <hello@mangaai.com>` |
| `NEXT_PUBLIC_GA_ID` | your GA4 measurement ID, when you have it |

```bash
nano /srv/mangaai/shared/.env.production
chmod 600 /srv/mangaai/shared/.env.production
```

`NEXT_PUBLIC_*` values are baked in at build time, so after changing one, run the deploy again.

## 6. First deploy (as the app user)

```bash
/srv/mangaai/repo/deploy/update.sh
```

It fetches `main`, installs, builds (a few minutes on a small droplet), starts PM2 and checks
`http://127.0.0.1:3000/api/health`. Then make PM2 start on boot:

```bash
pm2 startup systemd -u mangaai --hp /home/mangaai   # prints one sudo command: run it as root
pm2 save
pm2 install pm2-logrotate                             # keeps logs from filling the disk
```

## 7. Nginx and HTTPS (as root)

```bash
cp /srv/mangaai/repo/deploy/nginx/mangaai.conf /etc/nginx/sites-available/mangaai
ln -s /etc/nginx/sites-available/mangaai /etc/nginx/sites-enabled/mangaai
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

certbot --nginx -d mangaai.com -d www.mangaai.com --redirect -m <your-email> --agree-tos
```

Certbot renews the certificate automatically.

## 8. Optional: Cloudflare in front (recommended, free)

Gives you a CDN, DDoS protection and the visitor's country for **country-wise pricing**. Without
it, everyone sees the default (India) pricing, which is what you want until USD plans exist.

1. Add `mangaai.com` to Cloudflare, switch the nameservers at your registrar, and set the two A
   records to the droplet IP with the orange cloud **on**.
2. SSL/TLS mode: **Full (strict)** (keep the certbot certificate on the droplet).
3. In `/etc/nginx/sites-available/mangaai`, change
   `proxy_set_header cf-ipcountry $geo_country;` to
   `proxy_set_header cf-ipcountry $http_cf_ipcountry;` and reload Nginx.
4. Only allow web traffic from Cloudflare, so nobody can bypass it and fake a country:
   ```bash
   ufw delete allow 'Nginx Full'
   for ip in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do ufw allow from "$ip" to any port 80,443 proto tcp; done
   ```
   Certbot renewals then need DNS validation (`certbot-dns-cloudflare`) or a Cloudflare Origin
   Certificate instead; the Origin Certificate is simplest (valid 15 years).

## 9. Hook up the services

- **Supabase → Authentication → URL configuration:** Site URL `https://mangaai.com`, and add
  `https://mangaai.com/**` to Redirect URLs. Turn **Confirm email** back on.
- **Supabase → Authentication → SMTP:** keep the Resend SMTP settings; the sender must be on
  your verified domain.
- **Resend:** verify `mangaai.com` (Domains → add the DNS records), then add a webhook to
  `https://mangaai.com/api/email/webhook` (events `email.delivered` and `email.opened`) and put
  its signing secret in `RESEND_WEBHOOK_SECRET`.
- **Razorpay (live mode) → Webhooks:** URL `https://mangaai.com/api/billing/webhook`, secret =
  `RAZORPAY_WEBHOOK_SECRET`, events: all `subscription.*` events.

After changing secrets: `/srv/mangaai/repo/deploy/update.sh`.

## 10. Scheduled emails (as the app user)

```bash
crontab /srv/mangaai/repo/deploy/crontab
crontab -l
```

- Weekly report: Sundays 19:00 IST. Trial reminders: daily 10:00 IST.
- Run one by hand to check: `/srv/mangaai/repo/deploy/cron.sh trial-reminders`
- The cron URLs are blocked in Nginx; `cron.sh` calls the app on `127.0.0.1` with `CRON_SECRET`.

---

## Everyday use

| Task | Command (as `mangaai`) |
|---|---|
| Deploy the latest `main` | `/srv/mangaai/repo/deploy/update.sh` |
| Deploy a specific commit | `/srv/mangaai/repo/deploy/update.sh <commit>` |
| Roll back to the previous release | `/srv/mangaai/repo/deploy/update.sh --rollback` |
| What's live | `cat /srv/mangaai/current/REVISION` |
| App status / logs | `pm2 status` · `pm2 logs mangaai` |
| Restart the app | `pm2 reload mangaai` |
| Cron log | `tail -f /srv/mangaai/logs/cron.log` |
| Nginx logs (root) | `tail -f /var/log/nginx/error.log` |

Uptime monitoring: point any free monitor (UptimeRobot, Better Stack) at
`https://mangaai.com/api/health`.

## Troubleshooting

- **Build killed / "JavaScript heap out of memory":** check swap is on (`swapon --show`); on a
  512 MB droplet resize to 1 GB.
- **502 Bad Gateway:** the app isn't running: `pm2 logs mangaai`. A missing variable in
  `.env.production` shows up there as `Missing environment variable …`.
- **Login links go to localhost:** `NEXT_PUBLIC_SITE_URL` or the Supabase Site URL is wrong;
  fix and redeploy.
- **Payments work but the plan never activates after renewals:** the Razorpay webhook URL or
  secret is wrong; Razorpay → Webhooks shows the failed deliveries.
