# McManager 🎮

A web-based Minecraft server management tool for creating and managing modded Minecraft servers (Fabric & Forge).

## Features

- 🚀 **Easy Server Creation** - Create Fabric or Forge servers with a few clicks
- 📁 **File Management** - Browse, edit, and manage server files through the web interface
- 🖥️ **Live Console** - Real-time server console with command input
- 📊 **Server Monitoring** - CPU and memory usage tracking
- ⚙️ **Configuration Editor** - Edit server.properties and mod configs
- 🔄 **Auto-Restart** - Schedule server restarts when empty
- 👥 **Player Management** - View online players and server status

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- Git (for auto-updates)
- Java (for running Minecraft servers)

### Installation

1. Clone the repository:
```bash
git clone <YOUR_REPO_URL>
cd McManager
```

2. Run the installer:
```bash
Install.bat
```

The installer will:
- ✅ Check prerequisites (Node.js, Git)
- ✅ Install dependencies
- ✅ Optionally install PM2
- ✅ Create .env configuration
- ✅ Guide you through setup

3. Start McManager:
```bash
McManager.bat
```

**That's it!** Just double-click and it starts with PM2:
- ✅ Auto-updates when you push to Git
- ✅ Auto-restart on crashes
- ✅ Shows live console output
- ✅ Press Ctrl+C to stop viewing logs (server keeps running)

If PM2 isn't installed, it will install it automatically or fall back to simple mode.

4. Open your browser to `http://localhost:3000`

---

## Standalone Installer (Easy Distribution)

Want to install on another computer without cloning first?

1. **Configure the installer:**
   - Open `Install-Standalone.bat`
   - Set your Git repository URL
   
2. **Copy to target computer:**
   - Copy `Install-Standalone.bat` to any folder
   
3. **Run it:**
   ```bash
   Install-Standalone.bat
   ```

The installer will clone the repo and set up everything automatically!

See [docs/STANDALONE-INSTALLER.md](docs/STANDALONE-INSTALLER.md) for details.

---

For production deployment with auto-restart and auto-updates:

```bash
# Install PM2
npm install -g pm2

# Start all services (main server + auto-updater)
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Now your server will:
- ✅ Auto-restart if it crashes
- ✅ Auto-deploy when you push to Git
- ✅ Start automatically on boot
- ✅ Manage logs efficiently

See [docs/PM2-GUIDE.md](docs/PM2-GUIDE.md) for detailed PM2 usage.

---

## Auto-Deployment

The auto-update service (included in PM2 setup) automatically pulls and deploys changes when you push to Git.

**Workflow:**
1. Make changes on your dev computer
2. `git push origin main`
3. Server automatically updates within ~1 minute! 🎉

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

---

### Quick Update (on server)

```bash
scripts\update.bat
```

## Configuration

Create a `.env` file based on `.env.example` to customize:
- Server port
- Environment mode
- Custom servers directory

## Project Structure

```
McManager/
├── McManager.bat          # Main launcher (app-style menu)
├── Install.bat            # Automated installation script
├── Start.bat              # Advanced startup (with PM2)
├── Stop.bat               # Stop all services
├── Logs.bat               # View logs
├── server.js              # Main Express server
├── public/                # Frontend files
├── servers/               # Minecraft servers (not in Git)
├── scripts/               # Deployment & automation scripts
│   ├── auto-update.js     # Auto-deployment service
│   ├── ecosystem.config.js # PM2 configuration
│   └── update.bat         # Manual update script
├── docs/                  # Documentation
│   ├── DEPLOYMENT.md      # Deployment guide
│   ├── PM2-GUIDE.md       # PM2 detailed guide
│   └── QUICK-REFERENCE.md # Command cheat sheet
└── logs/                  # PM2 logs
```

## Technologies Used

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Server Management:** node-pty, pidusage
- **File Handling:** fs-extra, multer

## License

MIT

## Contributing

1. Make your changes on your development computer
2. Test thoroughly
3. Commit and push to your Git repository
4. Pull updates on your server using `update.bat`

---

For detailed deployment and update instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).
