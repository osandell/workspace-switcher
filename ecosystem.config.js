module.exports = {
  apps: [
    {
      name: 'start_workspace_switcher',
      script: './start_workspace_switcher.sh',
      cwd: '/Users/olof/dev/osandell/workspace-switcher',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      interpreter: 'bash',
      error_file: '~/.pm2/logs/start-workspace-switcher-error.log',
      out_file: '~/.pm2/logs/start-workspace-switcher-out.log',
      time: true
    }
  ]
};