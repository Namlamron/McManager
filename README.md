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
- Java (for running Minecraft servers)
- Git

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

3. Start the server:
```bash
npm start
# or
Start.bat
```

4. Open your browser to `http://localhost:3000`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying to a server computer and keeping it updated.

### Quick Update (on server)

```bash
.\update.bat
```

## Configuration

Create a `.env` file based on `.env.example` to customize:
- Server port
- Environment mode
- Custom servers directory

## Project Structure

```
McManager/
├── server.js           # Main Express server
├── public/             # Frontend files
│   ├── index.html      # Dashboard
│   ├── server.html     # Server management page
│   ├── app.js          # Main frontend logic
│   └── js/
│       └── manager.js  # Server management UI
├── servers/            # Minecraft server instances (not in Git)
├── DEPLOYMENT.md       # Deployment guide
└── update.bat          # Server update script
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
