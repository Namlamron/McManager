const socket = io();

// Get server name from URL
const urlParamsManager = new URLSearchParams(window.location.search);
const serverNameManager = urlParamsManager.get('name');

// Terminal Setup
const term = new Terminal({
    cursorBlink: true,
    fontFamily: 'Consolas, monospace',
    fontSize: 14,
    theme: {
        background: '#000000',
        foreground: '#f0f0f0'
    }
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

// DOM Elements
const termContainer = document.getElementById('terminal-container');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const restartBtn = document.getElementById('restartBtn');
const statusBadge = document.getElementById('serverStatus');

// Initialize Terminal
// We need to wait for the tab to be visible for fit to work properly, 
// usually. But since it is the default tab, it might be ok.
term.open(termContainer);
fitAddon.fit();

// Handle Window Resize
window.addEventListener('resize', () => {
    fitAddon.fit();
});

// Socket Events
socket.on('connect', () => {
    console.log('Connected to socket server');
    socket.emit('join-server', serverNameManager);
});

socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
    updateStatus('offline'); // Or 'disconnected'
});

socket.on('console-output', (data) => {
    term.write(data);
});

socket.on('server-status', (status) => {
    updateStatus(status);
});

// Terminal Input
term.onData((data) => {
    socket.emit('server-command', {
        serverName: serverNameManager,
        command: data
    });
});

// Controls (Attached to window for onclick in HTML)
window.startServer = function () {
    socket.emit('server-start', serverNameManager);
};

window.stopServer = function () {
    socket.emit('server-stop', serverNameManager);
};

window.restartServer = function () {
    socket.emit('server-stop', serverNameManager);
    term.write('\r\n\x1b[33mScheduling restart in 5 seconds...\x1b[0m\r\n');
    setTimeout(() => {
        socket.emit('server-start', serverNameManager);
    }, 5000);
};

// Update UI Status
function updateStatus(status) {
    statusBadge.className = 'status-badge';
    statusBadge.classList.add(status);
    statusBadge.textContent = status.toUpperCase();

    // Button states
    if (status === 'online') {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        restartBtn.disabled = false;
    } else if (status === 'offline') {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        restartBtn.disabled = true;
    } else if (status === 'starting') {
        startBtn.disabled = true;
        stopBtn.disabled = false; // Allow stop while starting (abort)
        restartBtn.disabled = true;
    }
}

// Initial status
updateStatus('offline');

// Refit when tab is switched 
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === 'console') {
            setTimeout(() => fitAddon.fit(), 100);
        } else if (tab === 'settings') {
            loadSettings();
        } else if (tab === 'players') {
            loadAllPlayers();
        }
    });
});

// ===== Settings Logic =====

async function loadSettings() {
    // Load RAM Config
    try {
        const config = await fetchAPI(`/api/server/${serverNameManager}/config`);
        if (config.javaArgs) {
            const args = config.javaArgs.split(' ');
            const xmx = args.find(a => a.startsWith('-Xmx'))?.substring(4) || '';
            const xms = args.find(a => a.startsWith('-Xms'))?.substring(4) || '';
            document.getElementById('ramMax').value = xmx;
            document.getElementById('ramMin').value = xms;
        }
    } catch (err) {
        console.error("Failed to load config", err);
    }

    // Load Properties
    try {
        const props = await fetchAPI(`/api/server/${serverNameManager}/properties`);
        const grid = document.getElementById('propertiesEditor');
        grid.innerHTML = '';

        for (const [key, value] of Object.entries(props)) {
            const div = document.createElement('div');
            div.className = 'property-item';
            div.innerHTML = `
                <label>${key}</label>
                <input type="text" name="${key}" value="${value}">
            `;
            grid.appendChild(div);
        }
    } catch (err) {
        console.error("Failed to load properties", err);
    }
}

window.saveConfig = async function () {
    const max = document.getElementById('ramMax').value;
    const min = document.getElementById('ramMin').value;

    // Validate format roughly
    if (!max || !min) return alert("Please enter both values");

    const javaArgs = `-Xmx${max} -Xms${min}`;

    try {
        await fetchAPI(`/api/server/${serverNameManager}/config`, {
            method: 'POST',
            body: JSON.stringify({ javaArgs }),
            headers: { 'Content-Type': 'application/json' }
        });
        alert('RAM settings saved! Restart server to apply.');
    } catch (err) {
        alert('Error saving config: ' + err.message);
    }
};

window.saveProperties = async function () {
    const inputs = document.querySelectorAll('#propertiesEditor input');
    const props = {};
    inputs.forEach(input => {
        props[input.name] = input.value;
    });

    try {
        await fetchAPI(`/api/server/${serverNameManager}/properties`, {
            method: 'POST',
            body: JSON.stringify(props),
            headers: { 'Content-Type': 'application/json' }
        });
        alert('Properties saved! Restart server to apply.');
    } catch (err) {
        alert('Error saving properties: ' + err.message);
    }
};

// ===== Player Management Logic =====

const playerTypes = ['ops', 'whitelist', 'banned-players'];

function loadAllPlayers() {
    playerTypes.forEach(loadPlayerList);
}

async function loadPlayerList(type) {
    try {
        const list = await fetchAPI(`/api/server/${serverNameManager}/json/${type}`);
        const ul = document.getElementById(type === 'banned-players' ? 'bannedList' : type + 'List');
        ul.innerHTML = '';

        list.forEach(entry => {
            const name = entry.name || entry; // whitelist/ops usually objects, but sometimes simple strings depending on version
            const li = document.createElement('li');
            li.className = 'player-list-item';
            li.innerHTML = `
                <span>${name}</span>
                <button onclick="removePlayer('${type}', '${name}')">❌</button>
            `;
            ul.appendChild(li);
        });
    } catch (err) {
        console.error(`Failed to load ${type}`, err);
    }
}

window.addPlayer = async function (type) {
    const inputId = type === 'banned-players' ? 'bannedInput' : type + 'Input';
    const input = document.getElementById(inputId);
    const name = input.value.trim();
    if (!name) return;

    try {
        // Fetch current list first
        const list = await fetchAPI(`/api/server/${serverNameManager}/json/${type}`);

        // Check duplicates
        if (list.some(e => (e.name || e) === name)) {
            return alert('Player already in list');
        }

        // Construct new entry (Mocking structure typically used by MC)
        // Ops: { uuid, name, level, bypassesPlayerLimit }
        // Whitelist: { uuid, name }
        // Ban: { uuid, name, created, source, expires, reason }

        // Since we don't have UUID fetching logic readily available without external API (mojang),
        // we will try to just push Name and hope server resolves it or we accept partial data.
        // Modern MC servers might require UUID.
        // For now, we'll try minimal object.

        // NOTE: Real implementation should query Mojang API for UUID to be correct.
        // But local servers often handle name-only or we can placeholder UUID.

        const entry = {
            uuid: generateOfflineUUID(name), // Helper
            name: name,
            level: 4, // for ops
            created: new Date().toISOString(),
            source: 'Console',
            expires: 'forever',
            reason: 'Banned by Operator'
        };

        if (type === 'ops') {
            list.push({ uuid: entry.uuid, name: entry.name, level: 4, bypassesPlayerLimit: false });
        } else if (type === 'whitelist') {
            list.push({ uuid: entry.uuid, name: entry.name });
        } else {
            list.push(entry);
        }

        await fetchAPI(`/api/server/${serverNameManager}/json/${type}`, {
            method: 'POST',
            body: JSON.stringify(list),
            headers: { 'Content-Type': 'application/json' }
        });

        input.value = '';
        loadPlayerList(type);

    } catch (err) {
        alert('Error adding player: ' + err.message);
    }
};

window.removePlayer = async function (type, name) {
    if (!confirm(`Remove ${name}?`)) return;

    try {
        const list = await fetchAPI(`/api/server/${serverNameManager}/json/${type}`);
        const newList = list.filter(e => (e.name || e) !== name);

        await fetchAPI(`/api/server/${serverNameManager}/json/${type}`, {
            method: 'POST',
            body: JSON.stringify(newList),
            headers: { 'Content-Type': 'application/json' }
        });

        loadPlayerList(type);
    } catch (err) {
        alert('Error removing player: ' + err.message);
    }
};

// Simple Offline UUID generator (since we can't easily fetch Mojang online UUID from browser strict CORS)
// This matches standard Offline UUID generation (MD5)
function generateOfflineUUID(name) {
    // This is a placeholder. Real offline UUID generation requires MD5 "OfflinePlayer:" + name
    // For now we assume server will fix it or we generate a random one.
    // Ideally we would integrate a UUID library or backend endpoint to fetch this.
    return '00000000-0000-0000-0000-000000000000';
}
