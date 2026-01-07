# McManager Deployment Guide

This guide explains how to deploy and update McManager on your server computer using Git.

## Prerequisites

- **Server Computer Requirements:**
  - Node.js (v14 or higher)
  - Git installed
  - Network access to your Git repository (GitHub/GitLab/etc.)

## Initial Server Setup

### 1. Clone the Repository

On your **server computer**, open a terminal/PowerShell and navigate to where you want to install McManager:

```powershell
# Navigate to your desired installation directory
cd C:\Path\To\Your\Installation

# Clone the repository
git clone <YOUR_GIT_REPO_URL> McManager
cd McManager
```

### 2. Run the Installation Script

```powershell
Install.bat
```

The installer will:
- Check for Node.js and Git
- Install all dependencies
- Optionally install PM2
- Create .env configuration file
- Guide you through the setup

**Or install manually:**

```powershell
npm install
```

### 3. Configure Environment (Optional)

If you want different settings for production vs development:

```powershell
# Copy the example environment file
copy .env.example .env

# Edit .env with your production settings
notepad .env
```

### 4. Start McManager

```powershell
Start.bat
```

The startup script automatically:
- Detects if PM2 is installed
- Starts both the server and auto-updater (if PM2 available)
- Provides helpful status information

The server will run on `http://localhost:3000` by default.

### 5. Set Up PM2 Process Manager (Recommended)

PM2 keeps your server running, auto-restarts on crashes, and manages logs.

#### Install PM2:

```powershell
npm install -g pm2
```

#### Start all services:

```powershell
# Easy way - use the batch file
.\start-pm2.bat

# Or manually
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

This starts both:
- **mcmanager** - The main server
- **mcmanager-updater** - Auto-deployment service

#### Useful PM2 Commands:

```powershell
pm2 status          # View running processes
pm2 logs            # View live logs
pm2 restart all     # Restart all services
pm2 stop all        # Stop all services
```

For detailed PM2 usage, see [PM2-GUIDE.md](PM2-GUIDE.md).

---

## Updating Your Server

### Method 1: Using the Update Script (Recommended)

On your **server computer**, run:

```powershell
.\update.bat
```

This script will:
1. Pull the latest changes from Git
2. Install any new dependencies
3. Restart the server (if using PM2)

### Method 2: Manual Update

On your **server computer**:

```powershell
# Stop the server (Ctrl+C if running in terminal, or stop PM2)
pm2 stop mcmanager

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Restart the server
pm2 start mcmanager
# OR
npm start
```

### Method 3: Automatic Updates (Recommended for Production)

The auto-update service automatically checks for Git updates and deploys them without manual intervention.

#### Setup Auto-Update Service:

On your **server computer**:

```powershell
# Option A: Run in a terminal (for testing)
.\start-auto-update.bat

# Option B: Run with PM2 (recommended for production)
pm2 start auto-update.js --name mcmanager-updater
pm2 save
```

The auto-update service will:
- Check for updates every 60 seconds (configurable)
- Automatically pull new changes when detected
- Install/update dependencies
- Restart the McManager server (if using PM2)

#### How It Works:

1. **On your development computer**, push changes to Git:
   ```powershell
   git push origin main
   ```

2. **On your server**, the auto-update service automatically:
   - Detects the new commits
   - Pulls the changes
   - Updates dependencies
   - Restarts the server

No manual intervention needed! 🎉

#### Monitoring Auto-Updates:

```powershell
# View auto-update logs (if using PM2)
pm2 logs mcmanager-updater

# Check status
pm2 status

# Stop auto-updates
pm2 stop mcmanager-updater
```

#### Configuration:

Edit `.env` to customize auto-update behavior:

```bash
# Git branch to track (default: main)
GIT_BRANCH=main

# Check interval in milliseconds (default: 60000 = 1 minute)
UPDATE_CHECK_INTERVAL=60000
```

---

## Development Workflow

### On Your Development Computer:

1. **Make your changes** to the code
2. **Test locally** to ensure everything works
3. **Commit your changes:**
   ```powershell
   git add .
   git commit -m "Description of your changes"
   ```
4. **Push to the repository:**
   ```powershell
   git push origin main
   ```

### On Your Server Computer:

**If using auto-update service (Method 3):**
- ✅ Nothing! The server will automatically update within ~1 minute

**If using manual updates (Method 1 or 2):**
- Run `.\update.bat` or manually pull and restart

---

## Important Notes

### Files That Won't Be Synced

The following files/folders are ignored by Git (see `.gitignore`):
- `node_modules/` - Dependencies (reinstalled via `npm install`)
- `servers/` - Your Minecraft server data (stays on server)
- `*.log` - Log files
- `.env` - Environment configuration (server-specific)

### Backing Up Server Data

Your Minecraft server files in the `servers/` directory are **NOT** synced via Git. Make sure to back them up separately if needed.

### Port Configuration

If you need to change the port, set the `PORT` environment variable:

```powershell
# In .env file
PORT=8080

# Or set it before starting
$env:PORT=8080; npm start
```

---

## Troubleshooting

### "Git pull" shows conflicts

If you've made changes directly on the server that conflict with your development changes:

```powershell
# Stash local changes
git stash

# Pull updates
git pull origin main

# Optionally reapply your local changes
git stash pop
```

### Dependencies not updating

```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### Server won't start after update

1. Check the console for error messages
2. Ensure all dependencies installed correctly: `npm install`
3. Check if the port is already in use
4. Review recent commits for breaking changes

---

## Security Recommendations

1. **Use a private Git repository** for your code
2. **Never commit sensitive data** (passwords, API keys) - use `.env` files
3. **Keep your server updated** with the latest security patches
4. **Use a firewall** to restrict access to the McManager port
5. **Consider using HTTPS** with a reverse proxy (nginx/Apache) for production
