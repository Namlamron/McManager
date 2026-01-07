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

### 2. Install Dependencies

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

### 4. Start the Server

```powershell
# Start the server
npm start

# Or use the provided batch file
Start.bat
```

The server will run on `http://localhost:3000` by default.

### 5. (Optional) Set Up as a Windows Service

To run McManager automatically on server startup, you can use tools like:
- **NSSM** (Non-Sucking Service Manager)
- **PM2** (Process Manager for Node.js)

#### Using PM2:

```powershell
# Install PM2 globally
npm install -g pm2

# Start McManager with PM2
pm2 start server.js --name mcmanager

# Save the PM2 process list
pm2 save

# Set PM2 to start on boot
pm2 startup
```

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

5. **Pull the updates** using one of the methods above

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
