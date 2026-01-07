# PM2 Process Manager Guide for McManager

PM2 is a production-grade process manager for Node.js applications. It keeps your applications running, restarts them if they crash, and provides easy log management.

## Installation

### On Windows (Development & Server):

```powershell
npm install -g pm2
```

Verify installation:
```powershell
pm2 --version
```

---

## Quick Start

### Starting McManager with PM2

**Option 1: Use the ecosystem file (Recommended)**

```powershell
# Start both McManager and auto-updater
Start.bat

# Or manually:
pm2 start scripts/ecosystem.config.js
```

**Option 2: Start services individually**

```powershell
# Start main server
pm2 start server.js --name mcmanager

# Start auto-updater
pm2 start auto-update.js --name mcmanager-updater
```

### Saving Configuration

To make PM2 remember your processes after restart:

```powershell
pm2 save
```

### Auto-Start on Boot

To start PM2 processes automatically when Windows boots:

```powershell
pm2 startup
# Follow the instructions shown
```

---

## Common PM2 Commands

### Viewing Status

```powershell
# List all processes
pm2 list

# Detailed status
pm2 status

# Monitor in real-time
pm2 monit
```

### Managing Processes

```powershell
# Restart a process
pm2 restart mcmanager

# Restart all processes
pm2 restart all

# Stop a process
pm2 stop mcmanager

# Stop all processes
pm2 stop all

# Delete a process from PM2
pm2 delete mcmanager

# Delete all processes
pm2 delete all
```

### Viewing Logs

```powershell
# View all logs (live)
pm2 logs

# View logs for specific app
pm2 logs mcmanager

# View only error logs
pm2 logs --err

# Clear all logs
pm2 flush
```

### Reloading Configuration

After updating `scripts/ecosystem.config.js`:

```powershell
pm2 reload scripts/ecosystem.config.js
```

---

## Ecosystem Configuration

The `ecosystem.config.js` file defines both McManager services:

### Main Server (mcmanager)
- Runs the Express server
- Manages Minecraft servers
- Restarts if it crashes
- Logs to `logs/mcmanager-*.log`

### Auto-Updater (mcmanager-updater)
- Monitors Git for changes
- Automatically deploys updates
- Restarts the main server when needed
- Logs to `logs/updater-*.log`

### Customizing Settings

Edit `ecosystem.config.js` to change:
- Memory limits (`max_memory_restart`)
- Environment variables (`env`)
- Log file locations
- Auto-restart behavior

---

## Production Deployment Workflow

### Initial Setup on Server

1. **Install PM2:**
   ```powershell
   npm install -g pm2
   ```

2. **Clone and setup repository:**
   ```powershell
   git clone <YOUR_REPO_URL> McManager
   cd McManager
   npm install
   ```

3. **Start services with PM2:**
   ```powershell
   pm2 start scripts/ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Verify everything is running:**
   ```powershell
   pm2 status
   pm2 logs
   ```

### Updating from Development

1. **On your dev computer:**
   ```powershell
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **On your server:**
   - **Automatic:** The auto-updater will detect and deploy within ~1 minute
   - **Manual:** Run `scripts\update.bat` or `pm2 restart all`

---

## Troubleshooting

### PM2 not found after installation

Close and reopen your terminal/PowerShell window.

### Process keeps restarting

Check logs for errors:
```powershell
pm2 logs mcmanager --err
```

### High memory usage

Adjust `max_memory_restart` in `ecosystem.config.js`:
```javascript
max_memory_restart: '512M'  // Lower if needed
```

### Can't access McManager web interface

1. Check if process is running: `pm2 status`
2. Check logs: `pm2 logs mcmanager`
3. Verify port isn't blocked by firewall
4. Ensure PORT is set correctly in `.env` or `ecosystem.config.js`

### Auto-updater not working

1. Check updater logs: `pm2 logs mcmanager-updater`
2. Verify Git credentials are configured
3. Ensure main server is running under PM2 (updater restarts via PM2)

---

## PM2 on Windows Service

For true Windows service integration (runs even when not logged in):

### Using pm2-windows-service

```powershell
npm install -g pm2-windows-service

# Install as Windows service
pm2-service-install -n PM2
```

Then configure PM2 as usual. The service will start automatically.

---

## Best Practices

1. **Always use `pm2 save`** after making changes to running processes
2. **Monitor logs regularly** with `pm2 logs`
3. **Set up startup script** on production servers
4. **Use ecosystem.config.js** for consistent configuration
5. **Test updates locally** before pushing to production
6. **Keep PM2 updated:** `npm install -g pm2@latest`

---

## Useful PM2 Features

### Environment-Specific Configuration

```javascript
// In ecosystem.config.js
env_production: {
  NODE_ENV: 'production',
  PORT: 3000
},
env_development: {
  NODE_ENV: 'development',
  PORT: 3001
}
```

Start with specific environment:
```powershell
pm2 start ecosystem.config.js --env production
```

### Cluster Mode (for scaling)

```javascript
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

### Watch Mode (for development)

```javascript
watch: true,
ignore_watch: ['node_modules', 'logs', 'servers']
```

---

## Summary

PM2 provides:
- ✅ **Automatic restarts** if your app crashes
- ✅ **Log management** with rotation
- ✅ **Zero-downtime reloads**
- ✅ **Startup scripts** for auto-start on boot
- ✅ **Process monitoring** with CPU/memory stats
- ✅ **Easy deployment** workflow

For more information: https://pm2.keymetrics.io/
