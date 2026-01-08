const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { pipeline } = require('stream/promises');
const multer = require('multer');
const { exec, spawn } = require('child_process');
const util = require('minecraft-server-util'); // For pinging servers

const http = require('http');
const { Server } = require("socket.io");
const pty = require('node-pty');
const os = require('os');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure servers directory exists
const SERVERS_DIR = path.join(__dirname, 'servers');
fs.ensureDirSync(SERVERS_DIR);

// Recovery Check on Startup
const RECOVERY_FILE = path.join(__dirname, 'restart-recovery.json');
setTimeout(async () => {
  if (await fs.pathExists(RECOVERY_FILE)) {
    try {
      console.log('🔄 Recovery file found. Restoring running servers...');
      const recoveryData = await fs.readJson(RECOVERY_FILE);
      await fs.remove(RECOVERY_FILE); // delete immediately to prevent loops

      for (const serverName of recoveryData.servers) {
        console.log(`🚀 Auto-starting recovered server: ${serverName}`);
        await startServerProcess(serverName);
      }
    } catch (err) {
      console.error('❌ Failed to recover servers:', err);
    }
  }
}, 5000); // 5s delay to ensure socket/pty are ready


// Fabric Meta API base URL
const FABRIC_API = 'https://meta.fabricmc.net/v2';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const serverName = req.params.serverName;
    const uploadPath = req.body.path || '';
    const serverDir = path.join(SERVERS_DIR, serverName, uploadPath);
    fs.ensureDirSync(serverDir);
    cb(null, serverDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Security: Validate path to prevent directory traversal
function validatePath(serverName, relativePath = '') {
  const serverDir = path.join(SERVERS_DIR, serverName);
  const fullPath = path.join(serverDir, relativePath);
  const normalizedPath = path.normalize(fullPath);

  // Ensure the path is within the server directory
  if (!normalizedPath.startsWith(serverDir)) {
    throw new Error('Invalid path: Access denied');
  }

  return normalizedPath;
}

// API Routes

// Get available Minecraft versions
app.get('/api/versions/minecraft', async (req, res) => {
  try {
    const response = await axios.get(`${FABRIC_API}/versions/game`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Minecraft versions:', error.message);
    res.status(500).json({ error: 'Failed to fetch Minecraft versions' });
  }
});

// Get available Fabric loader versions
app.get('/api/versions/loader', async (req, res) => {
  try {
    const response = await axios.get(`${FABRIC_API}/versions/loader`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching loader versions:', error.message);
    res.status(500).json({ error: 'Failed to fetch loader versions' });
  }
});

// Get available installer versions
app.get('/api/versions/installer', async (req, res) => {
  try {
    const response = await axios.get(`${FABRIC_API}/versions/installer`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching installer versions:', error.message);
    res.status(500).json({ error: 'Failed to fetch installer versions' });
  }
});

// Get available Forge versions
app.get('/api/versions/forge_promos', async (req, res) => {
  try {
    const response = await axios.get('https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Forge promos:', error.message);
    res.status(500).json({ error: 'Failed to fetch Forge versions' });
  }
});

// Create a new Server (Fabric or Forge)
app.post('/api/server/create', async (req, res) => {
  const { serverName, serverType, minecraftVersion, loaderVersion, installerVersion, forgeVersion } = req.body;

  if (!serverName || !serverType) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Sanitize server name
  const sanitizedName = serverName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const serverDir = path.join(SERVERS_DIR, sanitizedName);

  if (await fs.pathExists(serverDir)) {
    return res.status(409).json({ error: 'Server with this name already exists' });
  }

  try {
    await fs.ensureDir(serverDir);

    if (serverType === 'fabric') {
      if (!minecraftVersion || !loaderVersion || !installerVersion) {
        throw new Error('Missing Fabric versions');
      }
      // ... Fabric Logic ...
      const downloadUrl = `${FABRIC_API}/versions/loader/${minecraftVersion}/${loaderVersion}/${installerVersion}/server/jar`;
      const filename = `fabric-server-mc.${minecraftVersion}-loader.${loaderVersion}-launcher.${installerVersion}.jar`;
      const filePath = path.join(serverDir, filename);

      console.log(`Downloading Fabric JAR...`);
      const response = await axios({ method: 'GET', url: downloadUrl, responseType: 'stream' });
      const writer = fs.createWriteStream(filePath);
      await pipeline(response.data, writer);

      // Write config
      await fs.writeJson(path.join(serverDir, 'mcmanager.json'), {
        type: 'fabric',
        javaArgs: '-Xmx2G -Xms1G',
        jarFile: filename
      });

      res.json({ success: true, serverName: sanitizedName, path: serverDir, jarFile: filename });

    } else if (serverType === 'forge') {
      if (!minecraftVersion || !forgeVersion) {
        throw new Error('Missing Forge versions');
      }

      // Construct Installer URL
      // Format: https://maven.minecraftforge.net/net/minecraftforge/forge/{mc}-{forge}/forge-{mc}-{forge}-installer.jar
      const longVersion = `${minecraftVersion}-${forgeVersion}`;
      const downloadUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${longVersion}/forge-${longVersion}-installer.jar`;
      const installerName = `forge-installer.jar`;
      const installerPath = path.join(serverDir, installerName);

      console.log(`Downloading Forge Installer: ${downloadUrl}`);
      const response = await axios({ method: 'GET', url: downloadUrl, responseType: 'stream' });
      const writer = fs.createWriteStream(installerPath);
      await pipeline(response.data, writer);

      // User requested to run installer manually
      console.log('Forge Installer downloaded. Skipping auto-install as per request.');

      /* 
      // Previously: Run installer
      console.log('Running Forge Installer (Headless)...');
      await new Promise((resolve, reject) => {
          exec(`java -jar ${installerName} --installServer`, { cwd: serverDir }, (error, stdout, stderr) => {
             // ...
          });
      });
      // Cleanup installer
      await fs.remove(installerPath);
      */

      // Identify Server JAR (Legacy) or create run script logic (Modern)
      // Modern forge creates run.bat/run.sh and user_jvm_args.txt

      await fs.writeJson(path.join(serverDir, 'mcmanager.json'), {
        type: 'forge',
        javaArgs: '-Xmx2G -Xms1G',
        version: longVersion
      });

      res.json({ success: true, serverName: sanitizedName, path: serverDir, message: "Server created. Please run the Forge Installer manually." });
    }

  } catch (error) {
    console.error('Error creating server:', error.message);
    await fs.remove(serverDir).catch(console.error); // Cleanup
    res.status(500).json({ error: 'Failed to create server', details: error.message });
  }
});

// List all servers
app.get('/api/servers', async (req, res) => {
  try {
    const servers = await fs.readdir(SERVERS_DIR);
    const serverList = [];

    for (const serverName of servers) {
      const serverPath = path.join(SERVERS_DIR, serverName);
      const stat = await fs.stat(serverPath);

      if (stat.isDirectory()) {
        const files = await fs.readdir(serverPath);
        const jarFile = files.find(f => f.endsWith('.jar'));

        serverList.push({
          name: serverName,
          path: serverPath,
          jarFile: jarFile || null,
          created: stat.birthtime
        });
      }
    }

    res.json(serverList);
  } catch (error) {
    console.error('Error listing servers:', error.message);
    res.status(500).json({ error: 'Failed to list servers' });
  }
});

// ===== File Management Endpoints =====

// List files in a server directory
app.get('/api/server/:serverName/files', async (req, res) => {
  const { serverName } = req.params;
  const relativePath = req.query.path || '';
  const recursive = req.query.recursive === 'true';

  try {
    const fullPath = validatePath(serverName, relativePath);

    // Check if path exists
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stat = await fs.stat(fullPath);

    // If it's a file, return file info
    if (stat.isFile()) {
      return res.json({
        type: 'file',
        name: path.basename(fullPath),
        size: stat.size,
        modified: stat.mtime
      });
    }

    // Helper for recursive listing
    async function getFilesRecursively(dir, base) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let results = [];

      for (const entry of entries) {
        const fullEntryPath = path.join(dir, entry.name);
        const relativeEntryPath = path.join(base, entry.name);

        if (entry.isDirectory()) {
          // Add the directory itself? Maybe not if we just want files for config view
          // But for general file browser we might. 
          // Current frontend "Config" view filters for files anyway.
          results.push({
            name: relativeEntryPath.replace(/\\/g, '/'), // Normalize for frontend
            type: 'directory',
            modified: new Date() // approximate
          });

          const subResults = await getFilesRecursively(fullEntryPath, relativeEntryPath);
          results = results.concat(subResults);
        } else {
          const s = await fs.stat(fullEntryPath);
          results.push({
            name: relativeEntryPath.replace(/\\/g, '/'), // Return full relative path as "name" for simplicity, or split?
            // Let's use name as the RELATIVE path from the query root.
            type: 'file',
            size: s.size,
            modified: s.mtime
          });
        }
      }
      return results;
    }

    let fileList = [];

    if (recursive) {
      fileList = await getFilesRecursively(fullPath, '');
    } else {
      // Flat listing
      const items = await fs.readdir(fullPath);
      for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const itemStat = await fs.stat(itemPath);

        fileList.push({
          name: item,
          type: itemStat.isDirectory() ? 'directory' : 'file',
          size: itemStat.isFile() ? itemStat.size : null,
          modified: itemStat.mtime
        });
      }
    }

    // Sort: directories first, then files, alphabetically
    fileList.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    res.json({
      path: relativePath,
      items: fileList
    });

  } catch (error) {
    console.error('Error listing files:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Read file contents
app.get('/api/server/:serverName/file', async (req, res) => {
  const { serverName } = req.params;
  const relativePath = req.query.path || '';

  try {
    const fullPath = validatePath(serverName, relativePath);

    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }

    // Read file content
    const content = await fs.readFile(fullPath, 'utf8');

    res.json({
      path: relativePath,
      content: content,
      size: stat.size,
      modified: stat.mtime
    });

  } catch (error) {
    console.error('Error reading file:', error.message);

    // Check if it's a binary file
    if (error.message.includes('invalid') || error.code === 'ERR_INVALID_ARG_TYPE') {
      return res.status(400).json({ error: 'Cannot read binary file as text' });
    }

    res.status(500).json({ error: error.message });
  }
});

// Write/update file contents
app.put('/api/server/:serverName/file', async (req, res) => {
  const { serverName } = req.params;
  const { path: relativePath, content } = req.body;

  if (!relativePath || content === undefined) {
    return res.status(400).json({ error: 'Missing path or content' });
  }

  try {
    const fullPath = validatePath(serverName, relativePath);

    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(fullPath));

    // Write file
    await fs.writeFile(fullPath, content, 'utf8');

    const stat = await fs.stat(fullPath);

    res.json({
      success: true,
      path: relativePath,
      size: stat.size,
      modified: stat.mtime
    });

  } catch (error) {
    console.error('Error writing file:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete file
app.delete('/api/server/:serverName/file', async (req, res) => {
  const { serverName } = req.params;
  const relativePath = req.query.path || '';

  try {
    const fullPath = validatePath(serverName, relativePath);

    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    await fs.remove(fullPath);

    res.json({
      success: true,
      path: relativePath
    });

  } catch (error) {
    console.error('Error deleting file:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Upload files
app.post('/api/server/:serverName/upload', upload.array('files'), async (req, res) => {
  const { serverName } = req.params;

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      name: file.filename,
      size: file.size,
      path: req.body.path || ''
    }));

    res.json({
      success: true,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading files:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete Server
app.delete('/api/server/:serverName', async (req, res) => {
  try {
    const { serverName } = req.params;
    const safeName = serverName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const serverDir = path.join(SERVERS_DIR, safeName);

    // Check if running
    if (activeServers.has(safeName)) {
      return res.status(400).json({ error: 'Server is running. Please stop it before deleting.' });
    }

    if (!await fs.pathExists(serverDir)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    await fs.remove(serverDir);
    res.json({ success: true, message: 'Server deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// Move file or directory
app.post('/api/server/:serverName/move', async (req, res) => {
  const { serverName } = req.params;
  const { oldPath, newPath } = req.body;

  try {
    const fullOldPath = validatePath(serverName, oldPath);
    const fullNewPath = validatePath(serverName, newPath);

    if (!await fs.pathExists(fullOldPath)) {
      return res.status(404).json({ error: 'Source file not found' });
    }

    if (await fs.pathExists(fullNewPath)) {
      return res.status(400).json({ error: 'Destination already exists' });
    }

    await fs.move(fullOldPath, fullNewPath);

    res.json({ success: true, oldPath, newPath });
  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create directory
app.post('/api/server/:serverName/directory', async (req, res) => {
  const { serverName } = req.params;
  const { path: relativePath } = req.body;

  if (!relativePath) {
    return res.status(400).json({ error: 'Missing path' });
  }

  try {
    const fullPath = validatePath(serverName, relativePath);

    await fs.ensureDir(fullPath);

    res.json({
      success: true,
      path: relativePath
    });

  } catch (error) {
    console.error('Error creating directory:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== System Management APIs =====

app.get('/api/system/status', (req, res) => {
  const activeList = [];
  for (const [name, pid] of activeServers.entries()) {
    activeList.push({
      name,
      players: serverPlayerCounts.get(name) || 0
    });
  }
  res.json({
    running: activeServers.size > 0,
    servers: activeList
  });
});

app.post('/api/system/restart', async (req, res) => {
  console.log('🔄 System restart requested via API');

  // 1. Save state
  const runningServers = Array.from(activeServers.keys());
  if (runningServers.length > 0) {
    try {
      await fs.writeJson(RECOVERY_FILE, { servers: runningServers });
      console.log(`💾 Saved ${runningServers.length} servers to recovery file.`);
    } catch (err) {
      console.error('❌ Failed to save recovery file:', err);
      return res.status(500).json({ error: 'Failed to save state' });
    }
  }

  // 2. Stop all servers
  console.log('🛑 Stopping all servers for restart...');
  for (const [name, ptyProc] of activeServers.entries()) {
    try {
      ptyProc.write('stop\r');
    } catch (e) {
      console.error(`Error stopping ${name}:`, e);
    }
  }

  // 3. Send success response
  res.json({ success: true, message: 'Restarting...' });

  // 4. Exit process (give time for stop commands to send)
  setTimeout(() => {
    console.log('👋 Exiting process for PM2 restart.');
    process.exit(0);
  }, 2000);
});

// ===== Server Process Management =====

const activeServers = new Map(); // serverName -> ptyProcess
const serverLogs = new Map(); // serverName -> string[] (Circular buffer)

const scheduledRestarts = new Set(); // Servers waiting for 0 players to restart
const restartPending = new Set(); // Servers currently stopping that should restart immediately
const serverPlayerCounts = new Map(); // serverName -> playerCount

// Monitoring Loop - DISABLED (Causing WMIC errors on Windows)
/*
setInterval(async () => {
  for (const [serverName, ptyProcess] of activeServers.entries()) {
    try {
      if (ptyProcess && ptyProcess.pid) {
        const stats = await pidusage(ptyProcess.pid);

        // Query Player Count
        let players = 0;
        try {
          // Default port 25565, need to read from properties ideally, but assume default or query logic
          // Reading port from properties every 2s is expensive. 
          // For now, let's assume standard port or try to read it once.
          // TO-DO: Implement accurate port reading. For now, try 25565.
          // NOTE: Getting port efficiently is complex without caching. 
          // Let's rely on basic query to localhost if possible, or skip if complex.
          // Actually, let's look at updating the stats emission to include what we know.

          // Simple ping?
          // const status = await util.status('localhost', 25565); 
          // This assumes one server on 25565. 
          // If multiple servers, we need to know their ports.
          // We'll skip complex player query for this iteration and rely on
          // the user telling us if this is sufficient, or just defaulting to 0 for now
          // if we can't easily get the port.

          // WAIT: User requirement is "if empty". We need the count.
          // We must read server.properties to get the port once on start.
        } catch (e) { }

        // UPDATE: Let's read the port when the server starts and cache it?
        // For now, let's just stick to the requested structure changes.
        // We will assume 0 players if we can't query, OR valid implementation below.

        io.to(serverName).emit('server-stats', {
          cpu: stats.cpu,
          memory: stats.memory, // in bytes
          timestamp: Date.now()
        });
      }
    } catch (err) {
      // Process likely dead or restarting
    }
  }
}, 2000);
*/

// Separate Player Polling Loop (Every 10s is enough)
setInterval(async () => {
  for (const [serverName, ptyProcess] of activeServers.entries()) {
    try {
      // Read port from active server directory (cached ideally, but file read is fast enough for 10s)
      const propsPath = path.join(SERVERS_DIR, serverName, 'server.properties');
      if (await fs.pathExists(propsPath)) {
        const content = await fs.readFile(propsPath, 'utf8');
        const portLine = content.split('\n').find(l => l.startsWith('server-port='));
        const port = portLine ? parseInt(portLine.split('=')[1]) : 25565;

        const status = await util.status('localhost', port, { timeout: 2000 });
        serverPlayerCounts.set(serverName, status.players.online);
      }
    } catch (e) {
      serverPlayerCounts.set(serverName, 0); // Assume 0 if query failed (server starting/stopping)
    }
  }
}, 10000);

async function startServerProcess(serverName) {
  if (activeServers.has(serverName)) {
    io.to(serverName).emit('console-output', 'Server is already running.\r\n');
    return;
  }

  const serverDir = path.join(SERVERS_DIR, serverName);
  if (!fs.existsSync(serverDir)) {
    io.to(serverName).emit('console-output', 'Server directory not found.\r\n');
    return;
  }

  // Find the JAR file
  let files = await fs.readdir(serverDir);
  const jarFile = files.find(f => f.endsWith('.jar'));

  if (!jarFile) {
    io.to(serverName).emit('console-output', 'No server JAR file found.\r\n');
    return;
  }

  let shell = os.platform() === 'win32' ? 'java.exe' : 'java';

  // Load config for memory settings & type
  let javaArgs = ['-Xmx2G', '-Xms1G']; // Defaults
  let serverType = 'fabric';
  const configPath = path.join(serverDir, 'mcmanager.json');
  try {
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      if (config.javaArgs) {
        javaArgs = config.javaArgs.split(' ');
      }
      if (config.type) {
        serverType = config.type;
      }
    }
  } catch (err) {
    console.error("Error reading config", err);
  }

  let args = [];

  if (serverType === 'forge') {
    // Check if we need to install first
    const installerJar = files.find(f => f.endsWith('installer.jar'));
    const shimJar = files.find(f => f.includes('-shim.jar'));
    const hasRunBat = files.includes('run.bat') || files.includes('run.sh');
    // Legacy detection (universal jar presence)
    const hasLegacyJar = files.some(f => f.startsWith('forge-') && (f.endsWith('universal.jar') || f.endsWith('server.jar')) && !f.endsWith('installer.jar') && !f.includes('-shim.jar'));

    // If installer exists but no shim jar, run installer first
    if (installerJar && !shimJar && !hasRunBat && !hasLegacyJar) {
      io.to(serverName).emit('console-output', 'Forge Installer detected. Running installation first (this may take a while)...\r\n');
      io.to(serverName).emit('server-status', 'installing');

      try {
        await new Promise((resolve, reject) => {
          const installerProcess = spawn('java', ['-jar', installerJar, '--installServer'], { cwd: serverDir });

          installerProcess.stdout.on('data', (data) => {
            io.to(serverName).emit('console-output', `[Installer] ${data.toString()}`);
          });

          installerProcess.stderr.on('data', (data) => {
            io.to(serverName).emit('console-output', `[Installer Error] ${data.toString()}`);
          });

          installerProcess.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Installer exited with code ${code}`));
          });
        });

        io.to(serverName).emit('console-output', 'Installation complete! Starting server...\r\n');
        // Refresh file list to find the new shim jar
        files = await fs.readdir(serverDir);

      } catch (err) {
        io.to(serverName).emit('console-output', `Installation failed: ${err.message}\r\n`);
        io.to(serverName).emit('server-status', 'offline');
        return;
      }
    }

    // Re-check for shim jar after potential install
    const shimJarAfterInstall = files.find(f => f.includes('-shim.jar'));
    const forgeJar = files.find(f => f.startsWith('forge-') && (f.endsWith('universal.jar') || f.endsWith('server.jar')) && !f.endsWith('installer.jar') && !f.includes('-shim.jar'));

    // Priority: shim.jar > legacy jar > run scripts
    if (shimJarAfterInstall) {
      // Modern Forge with shim jar
      args = [...javaArgs, '-jar', shimJarAfterInstall, 'nogui'];
      io.to(serverName).emit('console-output', `Using Forge shim: ${shimJarAfterInstall}\r\n`);
    } else if (forgeJar) {
      // Legacy Forge
      args = [...javaArgs, '-jar', forgeJar, 'nogui'];
      io.to(serverName).emit('console-output', `Using legacy Forge jar: ${forgeJar}\r\n`);
    } else {
      // Modern way: check for run.bat / run.sh
      if (os.platform() === 'win32' && files.includes('run.bat')) {
        // Inject memory args into user_jvm_args.txt
        const jvmArgsFile = path.join(serverDir, 'user_jvm_args.txt');
        try {
          // always overwrite/create to ensure our settings apply
          await fs.writeFile(jvmArgsFile, javaArgs.join('\n'));
        } catch (e) {
          console.error("Failed to write user_jvm_args.txt", e);
        }

        shell = 'cmd.exe';
        args = ['/c', 'run.bat'];
        io.to(serverName).emit('console-output', 'Using run.bat script\r\n');
      } else if (files.includes('run.sh')) {
        // Linux/Mac
        const jvmArgsFile = path.join(serverDir, 'user_jvm_args.txt');
        try {
          await fs.writeFile(jvmArgsFile, javaArgs.join('\n'));
        } catch (e) { }

        shell = 'bash';
        args = ['run.sh'];
        io.to(serverName).emit('console-output', 'Using run.sh script\r\n');
      } else {
        io.to(serverName).emit('console-output', 'Could not detect Forge startup method (No jar/script found). Did install fail?\r\n');
        io.to(serverName).emit('server-status', 'offline');
        return;
      }
    }
  } else {
    // Fabric / Vanilla JAR
    args = [...javaArgs, '-jar', jarFile, 'nogui'];
  }

  io.to(serverName).emit('server-status', 'starting');
  io.to(serverName).emit('console-output', `\r\nStarting server: ${serverName}...\r\n`);
  io.to(serverName).emit('console-output', `Executing: java ${args.join(' ')}\r\n\r\n`);

  const ptyProcess = pty.spawn(shell, args, {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: serverDir,
    env: process.env
  });

  activeServers.set(serverName, ptyProcess);
  io.to(serverName).emit('server-status', 'online');

  ptyProcess.onData((data) => {
    // Store log history
    if (!serverLogs.has(serverName)) {
      serverLogs.set(serverName, []);
    }
    const logs = serverLogs.get(serverName);
    logs.push(data);
    if (logs.length > 2000) logs.shift(); // Keep last 2000 chunks

    io.to(serverName).emit('console-output', data);
  });

  ptyProcess.onExit((res) => {
    activeServers.delete(serverName);
    io.to(serverName).emit('console-output', `\r\nServer stopped with exit code: ${res.exitCode}\r\n`);
    io.to(serverName).emit('server-status', 'offline');

    // Auto-restart if pending
    if (restartPending.has(serverName)) {
      restartPending.delete(serverName);
      io.to(serverName).emit('console-output', `\r\n[Auto-Restart] Server restarting...\r\n`);
      setTimeout(() => {
        startServerProcess(serverName);
      }, 3000); // Wait 3s before restart
    }
  });
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-server', (serverName) => {
    socket.join(serverName);
    console.log(`User ${socket.id} joined room: ${serverName}`);

    // Send current status if server is running
    const serverProc = activeServers.get(serverName);
    if (serverProc) {
      socket.emit('server-status', 'online');
    } else {
      socket.emit('server-status', 'offline');
    }

    // Send schedule status
    socket.emit('schedule-status', scheduledRestarts.has(serverName));

    // Send console history
    const history = serverLogs.get(serverName) || [];
    // Join chunks to reduce socket messages, or send as array?
    // Sending as one big string is efficient for xterm write.
    if (history.length > 0) {
      socket.emit('console-history', history.join(''));
    }
  });

  socket.on('server-start', async (serverName) => {
    await startServerProcess(serverName);
  });

  socket.on('server-stop', (serverName) => {
    // If user manually stops, cancel any auto-restart logic
    scheduledRestarts.delete(serverName);
    restartPending.delete(serverName);
    io.to(serverName).emit('schedule-status', false);

    const ptyProcess = activeServers.get(serverName);
    if (ptyProcess) {
      io.to(serverName).emit('console-output', '\r\nSending stop command...\r\n');
      ptyProcess.write('stop\r');
    } else {
      socket.emit('console-output', 'Server is not running.\r\n');
    }
  });

  socket.on('server-command', (data) => {
    const { serverName, command } = data;
    const ptyProcess = activeServers.get(serverName);
    if (ptyProcess) {
      ptyProcess.write(command);
    }
  });
});

// ===== Server Configuration & Player Management =====

// Read Server Properties
app.get('/api/server/:serverName/properties', async (req, res) => {
  const { serverName } = req.params;
  const propsPath = path.join(SERVERS_DIR, serverName, 'server.properties');

  try {
    if (!await fs.pathExists(propsPath)) {
      // Return empty object or default if not found
      return res.json({});
    }
    const content = await fs.readFile(propsPath, 'utf8');
    const properties = {};

    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key) {
          properties[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save Server Properties
app.post('/api/server/:serverName/properties', async (req, res) => {
  const { serverName } = req.params;
  const properties = req.body;
  const propsPath = path.join(SERVERS_DIR, serverName, 'server.properties');

  try {
    // Read existing to preserve comments? 
    // For simplicity, we just rewrite file with standard header + keys
    // Ideally we'd parse AST but this is simple enough.

    let content = '#Minecraft Server Properties\n#' + new Date().toISOString() + '\n';
    for (const [key, value] of Object.entries(properties)) {
      content += `${key}=${value}\n`;
    }

    await fs.writeFile(propsPath, content, 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read McManager Config (RAM etc)
app.get('/api/server/:serverName/config', async (req, res) => {
  const { serverName } = req.params;
  const configPath = path.join(SERVERS_DIR, serverName, 'mcmanager.json');

  try {
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      res.json(config);
    } else {
      // Default config
      res.json({ javaArgs: '-Xmx2G -Xms1G' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save McManager Config
app.post('/api/server/:serverName/config', async (req, res) => {
  const { serverName } = req.params;
  const config = req.body;
  const configPath = path.join(SERVERS_DIR, serverName, 'mcmanager.json');

  try {
    await fs.writeJson(configPath, config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read Player JSON files (ops, whitelist, banned)
app.get('/api/server/:serverName/json/:type', async (req, res) => {
  const { serverName, type } = req.params;
  // Basic validation
  if (!['ops', 'whitelist', 'banned-players', 'banned-ips'].includes(type)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  const filePath = path.join(SERVERS_DIR, serverName, `${type}.json`);
  try {
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJson(filePath);
      res.json(data);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Write Player JSON files
app.post('/api/server/:serverName/json/:type', async (req, res) => {
  const { serverName, type } = req.params;
  const data = req.body;

  if (!['ops', 'whitelist', 'banned-players', 'banned-ips'].includes(type)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  const filePath = path.join(SERVERS_DIR, serverName, `${type}.json`);
  try {
    await fs.writeJson(filePath, data, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Auto-Restart Logic =====

// Schedule a restart for when the server is empty
app.post('/api/server/:serverName/schedule-restart', (req, res) => {
  const { serverName } = req.params;
  if (!activeServers.has(serverName)) {
    return res.status(400).json({ error: 'Server is not running' });
  }

  scheduledRestarts.add(serverName);
  io.to(serverName).emit('console-output', '\r\n[System] Server restart scheduled. Waiting for players to disconnect...\r\n');
  res.json({ success: true, message: 'Restart scheduled' });
});

// Cancel a scheduled restart
app.post('/api/server/:serverName/cancel-restart', (req, res) => {
  const { serverName } = req.params;
  scheduledRestarts.delete(serverName);
  io.to(serverName).emit('console-output', '\r\n[System] Scheduled restart cancelled.\r\n');
  res.json({ success: true, message: 'Restart cancelled' });
});

// ===== Dashboard Monitor =====
// Polls active servers for player counts and status

const dashboardStats = new Map(); // serverName -> { status, players, maxPlayers }

setInterval(async () => {
  // Only poll active servers (processes we manage)

  const update = {};

  for (const [name, pty] of activeServers.entries()) {
    try {
      // Read properties to find port
      const propsPath = path.join(SERVERS_DIR, name, 'server.properties');
      let port = 25565;
      if (await fs.pathExists(propsPath)) {
        const content = await fs.readFile(propsPath, 'utf8');
        const portLine = content.split('\n').find(l => l.trim().startsWith('server-port='));
        if (portLine) port = parseInt(portLine.split('=')[1].trim());
      }

      // Ping
      const status = await util.status('localhost', port, { timeout: 1000 });
      const playerCount = status.players.online;

      update[name] = {
        status: 'online',
        players: playerCount,
        maxPlayers: status.players.max,
        version: status.version.name.replace(/[^0-9.]/g, ''), // simplify
        restartScheduled: scheduledRestarts.has(name)
      };

      // Check for scheduled restart
      if (scheduledRestarts.has(name) && playerCount === 0) {
        console.log(`[Auto-Restart] Triggering restart for ${name} (0 active players)`);
        io.to(name).emit('console-output', '\r\n[Auto-Restart] Server is empty. Restarting now...\r\n');

        // Remove from scheduled list so we don't trigger again
        scheduledRestarts.delete(name);

        // Mark as pending restart so exit handler knows to start it back up
        restartPending.add(name);

        // Stop the server
        pty.write('stop\r');
      }

    } catch (e) {
      // Server might be starting or stopping
      update[name] = {
        status: 'starting',
        players: 0,
        maxPlayers: 0,
        restartScheduled: scheduledRestarts.has(name)
      };
    }
  }

  io.to('dashboard').emit('dashboard-update', update);

}, 5000); // Every 5 seconds

// Update Endpoint
app.post('/api/update', (req, res) => {
  res.json({ success: true, message: 'Updating and restarting...' });
  console.log('🔄 Update requested. Restarting process...');
  setTimeout(() => {
    process.exit(42); // Exit with code 42 to trigger Start.bat loop
  }, 1000);
});

// Start server
server.listen(PORT, async () => {
  // Get Local IP
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
    if (localIp !== 'localhost') break;
  }

  // Get Public IP
  let publicIp = 'Unknown';
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    publicIp = response.data.ip;
  } catch (err) {
    console.warn('Could not fetch public IP:', err.message);
  }

  console.log(`\n🚀 Minecraft Server Manager running on port ${PORT}`);
  console.log(`📡 Access the UI at: http://localhost:${PORT}`);
  console.log(`📡 Same network UI at: http://${localIp}:${PORT}`);
  console.log(`🌐 Remote access: http://${publicIp}:${PORT}\n`);
});
