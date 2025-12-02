// ============================================
// SafeGuard - Configuration PM2 pour Synology
// ============================================
// Ce fichier permet de lancer l'application Next.js sur le NAS
// via PM2 avec gestion automatique des redémarrages
// ============================================

module.exports = {
  apps: [
    {
      name: "safeguard",
      script: "node_modules/.bin/next",
      args: "start -p 3003",
      cwd: "/volume1/web/safeguard", // Ajustez selon votre chemin d'installation
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3003,
        // Les variables d'environnement seront chargées depuis .env
        // Assurez-vous d'avoir un fichier .env dans le répertoire de l'app
      },
      // Options de redémarrage
      autorestart: true,
      watch: false, // Désactivé en production
      max_memory_restart: "500M", // Redémarre si > 500MB RAM
      
      // Logs
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      
      // Options de gestion
      min_uptime: "10s", // Temps minimum avant considérer comme stable
      max_restarts: 10, // Nombre max de redémarrages
      restart_delay: 4000, // Délai entre redémarrages (ms)
      
      // Variables spécifiques Synology
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};

