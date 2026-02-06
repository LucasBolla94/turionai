/**
 * PM2 Ecosystem Configuration - Turion V1.1.1
 *
 * Configuração de produção com auto-restart, logs e monitoramento
 */

module.exports = {
  apps: [{
    name: 'turion',
    script: 'dist/index.js',

    // Modo de execução
    instances: 1,
    exec_mode: 'fork',

    // Auto-restart configurações
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    // Restart delays
    restart_delay: 4000,
    min_uptime: '10s',
    max_restarts: 10,

    // Logs
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    log_file: 'logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',

    // Ambiente
    env: {
      NODE_ENV: 'production',
      TZ: 'America/Sao_Paulo'
    },

    // Merge logs
    merge_logs: true,

    // Configurações de restart
    kill_timeout: 5000,
    listen_timeout: 3000,

    // Cron restart (opcional - reiniciar todo dia às 4h)
    // cron_restart: '0 4 * * *',

    // Source map support
    source_map_support: true,

    // Ignore watch (se watch estiver ativo)
    ignore_watch: [
      'node_modules',
      'logs',
      'state',
      '.git',
      'auth_info'
    ]
  }]
};
