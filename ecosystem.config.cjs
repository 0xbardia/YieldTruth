module.exports = {
  apps: [
    {
      name: "yieldtruth",
      cwd: "/root/YieldTruth",
      script: "/root/YieldTruth/scripts/serve-prod.sh",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "768M",
      kill_timeout: 8000,
      time: true,
      merge_logs: true,
      out_file: "/root/.pm2/logs/yieldtruth-out.log",
      error_file: "/root/.pm2/logs/yieldtruth-error.log",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
