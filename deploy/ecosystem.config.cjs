// PM2 process file for the droplet. Started from /srv/mangaai by deploy/update.sh:
//   pm2 startOrReload /srv/mangaai/current/deploy/ecosystem.config.cjs
// `next start` reads .env.production from the release folder (a symlink to /srv/mangaai/shared).
const appDir = process.env.MANGAAI_DIR || "/srv/mangaai";

module.exports = {
  apps: [
    {
      name: "mangaai",
      cwd: `${appDir}/current`,
      script: "node_modules/next/dist/bin/next",
      // Listen on localhost only; Nginx is the only thing that talks to the app.
      args: "start --hostname 127.0.0.1 --port 3000",
      exec_mode: "fork",
      instances: 1,
      env: { NODE_ENV: "production" },
      // Restart if memory runs away rather than letting the droplet swap itself to a halt.
      max_memory_restart: "700M",
      kill_timeout: 10000,
      restart_delay: 2000,
      time: true,
      out_file: `${appDir}/logs/app.out.log`,
      error_file: `${appDir}/logs/app.err.log`,
      merge_logs: true,
    },
  ],
};
