const path = require('path');

module.exports = {
    apps: [
        {
            name: 'mcmanager',
            script: path.join(__dirname, '../server.js'),
            cwd: path.join(__dirname, '..'),
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            error_file: '../logs/mcmanager-error.log',
            out_file: '../logs/mcmanager-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        },
        {
            name: 'mcmanager-updater',
            script: path.join(__dirname, 'auto-update.js'),
            cwd: __dirname,
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '256M',
            env: {
                NODE_ENV: 'production'
            },
            error_file: '../logs/updater-error.log',
            out_file: '../logs/updater-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        }
    ]
};
