# McManager 🎮

A web-based Minecraft server management tool for creating and managing modded Minecraft servers (Fabric & Forge).

## Features

- 🚀 **Easy Server Creation** - Create Fabric or Forge servers with a few clicks
- 📁 **File Management** - Browse, edit, and manage server files through the web interface
- 🖥️ **Live Console** - Real-time server console with command input
- ⚙️ **Configuration Editor** - Edit server.properties and mod configs in a user-friendly grid interface
- 🔄 **Auto-Restart** - Schedule server restarts when empty
- 👥 **Player Management** - View online players and server status
- 📣 **Discord Webhooks** - Get notifications for server events and player activity


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

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
copy .env.example .env
```

4. Start McManager:
```bash
Start.bat
```

The `Start.bat` script will start the McManager server and show live console output.

5. Open your browser to `http://localhost:3000`

---

## Standalone Installer (Easy Distribution)

Want to install on another computer without cloning first?

1. **Configure the installer:**
   - Open `Install-Standalone.bat`
   - Set your Git repository URL at the top of the file
   
2. **Copy to target computer:**
   - Copy `Install-Standalone.bat` to any folder
   
3. **Run it:**
   ```bash
   Install-Standalone.bat
   ```

The installer will:
- ✅ Check for Node.js and Git
- ✅ Clone the repository
- ✅ Install dependencies

- ✅ Create `.env` configuration
- ✅ Set up everything automatically

See [docs/STANDALONE-INSTALLER.md](docs/STANDALONE-INSTALLER.md) for details.



## Configuration

Create a `.env` file based on `.env.example` to customize:
- `PORT` - Web interface port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `SERVERS_DIR` - Custom servers directory path

## Discord Webhook Setup

Get real-time notifications in Discord when your servers start, stop, or when players join/leave!

### Setup Instructions:

1. **Create a Discord Webhook:**
   - Open your Discord server settings
   - Go to **Integrations** → **Webhooks**
   - Click **New Webhook**
   - Choose a channel (e.g., `#minecraft-alerts`)
   - Copy the **Webhook URL**

2. **Configure in McManager:**
   - Open your server in McManager
   - Go to the **Settings** tab
   - Scroll to **Discord Notifications**
   - Paste your webhook URL
   - Click **Test Webhook** to verify it works
   - Click **Save Webhook**

3. **You'll receive notifications for:**
   - 🟢 Server started
   - 🟡 Server stopped
   - 🔴 Server crashed
   - 👋 Player joined
   - 👋 Player left

Each server can have its own webhook URL, so you can send notifications to different channels!


## Project Structure

```
McManager/
├── Start.bat              # Main startup script (auto-detects PM2)
├── Install-Standalone.bat # Standalone installer for easy distribution
├── server.js              # Main Express server
├── discord-webhook.js     # Discord webhook notifications
├── package.json           # Node.js dependencies
├── .env.example           # Environment configuration template
├── public/                # Frontend files
│   ├── index.html         # Dashboard
│   ├── server.html        # Server detail page
│   ├── css/               # Stylesheets
│   └── js/                # Client-side JavaScript
├── servers/               # Minecraft servers directory (not in Git)
├── docs/                  # Documentation
│   ├── QUICK-REFERENCE.md # Command cheat sheet
│   └── STANDALONE-INSTALLER.md # Standalone installer guide
└── logs/                  # Application logs
```

## Technologies Used

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Server Management:** node-pty (for terminal emulation), minecraft-server-util (for server queries)
- **File Handling:** fs-extra, multer, adm-zip, archiver
- **Notifications:** Discord Webhooks (axios)


## License

MIT

## Contributing

1. Make your changes on your development computer
2. Test thoroughly
3. Commit and push to your Git repository
4. Pull updates on your server manually with `git pull`

---


