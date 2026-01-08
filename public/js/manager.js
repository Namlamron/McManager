const socket = io();

// Get server name from URL
const urlParamsManager = new URLSearchParams(window.location.search);
const serverNameManager = urlParamsManager.get('name');

if (!serverNameManager) {
    alert("Error: No server name provided in URL");
    console.error("Missing server name query parameter");
} else {
    console.log("Manager initialized for server:", serverNameManager);
}

// Terminal Setup
const term = new Terminal({
    cursorBlink: true,
    fontFamily: 'Consolas, monospace',
    fontSize: 14,
    lineHeight: 1.2, // Fix vertical clipping "half lines"
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

const scheduleRestartBtn = document.getElementById('scheduleRestartBtn');
const restartStatusBadge = document.getElementById('restartStatus');

let isRestartScheduled = false;

// Helper to fit and sync size
function fitTerminal() {
    try {
        fitAddon.fit();
        if (term.cols > 0 && term.rows > 0) {
            socket.emit('server-resize', {
                serverName: serverNameManager,
                cols: term.cols,
                rows: term.rows
            });
        }
    } catch (e) {
        console.error("Fit error:", e);
    }
}

// Initialize Terminal
try {
    term.open(termContainer);
    fitTerminal(); // Fit immediately
    console.log("Terminal initialized", term.cols, term.rows);
    term.write('\r\n\x1b[32mWelcome to McManager Console\x1b[0m\r\n');
    term.write('\x1b[90mWaiting for server logs...\x1b[0m\r\n');
    term.focus(); // Ensure focus so user can type immediately
} catch (e) {
    console.error("Failed to init terminal:", e);
}



// Handle Window Resize
window.addEventListener('resize', fitTerminal);

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

socket.on('console-history', (history) => {
    term.write(history);
});

socket.on('server-status', (status) => {
    updateStatus(status);
});

socket.on('schedule-status', (scheduled) => {
    isRestartScheduled = scheduled;
    updateScheduleUI();
});





// Terminal Input
term.onData((data) => {
    // Ignore Ctrl+C (ETX - End of Text) to prevent stopping the server
    if (data === '\u0003') {
        return;
    }

    socket.emit('server-command', {
        serverName: serverNameManager,
        command: data
    });
});

// Controls (Attached to window for onclick in HTML)
window.startServer = function () {
    console.log("Start button clicked for:", serverNameManager);
    if (!serverNameManager) return alert("No server selected");
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

window.toggleScheduleRestart = async function () {
    const action = isRestartScheduled ? 'cancel-restart' : 'schedule-restart';
    try {
        await fetchAPI(`/api/server/${serverNameManager}/${action}`, { method: 'POST' });
        // UI update handled by socket event
    } catch (err) {
        alert(`Failed to ${isRestartScheduled ? 'cancel' : 'schedule'} restart: ${err.message}`);
    }
};

function updateScheduleUI() {
    if (isRestartScheduled) {
        scheduleRestartBtn.textContent = '🚫 Cancel Auto-Restart';
        scheduleRestartBtn.classList.replace('btn-secondary', 'btn-danger');
        restartStatusBadge.style.display = 'inline-block';
    } else {
        scheduleRestartBtn.textContent = '⏳ Restart When Empty';
        scheduleRestartBtn.classList.replace('btn-danger', 'btn-secondary');
        // If the button was secondary originally, the above line handles it. 
        // If I need to be safe: 
        if (!scheduleRestartBtn.classList.contains('btn-secondary')) {
            scheduleRestartBtn.classList.add('btn-secondary');
        }

        restartStatusBadge.style.display = 'none';
    }
}

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
        scheduleRestartBtn.disabled = false;
    } else if (status === 'offline') {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        restartBtn.disabled = true;

        // Cannot schedule if offline
        scheduleRestartBtn.disabled = true;
        isRestartScheduled = false; // Reset local state
        updateScheduleUI();

    } else if (status === 'starting') {
        startBtn.disabled = true;
        stopBtn.disabled = false; // Allow stop while starting (abort)
        restartBtn.disabled = true;
        scheduleRestartBtn.disabled = true;
    }
}

// Initial status
updateStatus('offline');

// Refit when tab is switched 
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === 'console') {
            setTimeout(() => fitTerminal(), 100);
        } else if (tab === 'settings') {
            loadSettings();
        } else if (tab === 'players') {
            loadAllPlayers();
        } else if (tab === 'mods') {
            loadModConfigs();
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

// ===== Mod Configs Logic =====

// Cache for config data: { 'path/to/file': { lines: [], isJson: boolean } }
const configCache = {};

async function loadModConfigs() {
    const container = document.getElementById('modConfigBrowser');
    const placeholder = document.getElementById('mods-placeholder');

    // Reset view
    container.innerHTML = '<p class="loading-text">Loading configs...</p>';
    container.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';

    const oldEditor = document.getElementById('modConfigEditor');
    if (oldEditor) oldEditor.style.display = 'none';

    try {
        let path = 'config';
        let files = [];
        try {
            const data = await fetchAPI(`/api/server/${serverNameManager}/files?path=${path}&recursive=true`);
            if (data.items) files = data.items.filter(f => f.type === 'file');
        } catch (e) {
            container.innerHTML = '<p class="placeholder-text">No config folder found.</p>';
            return;
        }

        if (files.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No config files found.</p>';
            return;
        }

        const validExts = ['.toml', '.json', '.properties', '.cfg', '.conf', '.ini'];
        const visibleFiles = files
            .filter(f => validExts.some(ext => f.name.endsWith(ext)))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (visibleFiles.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No matching config files found.</p>';
            return;
        }

        // Group files
        const rootFiles = [];
        const folders = {};

        visibleFiles.forEach(file => {
            const parts = file.name.split('/');
            if (parts.length > 1) {
                const folderName = parts[0];
                if (!folders[folderName]) folders[folderName] = [];
                folders[folderName].push(file);
            } else {
                rootFiles.push(file);
            }
        });

        container.innerHTML = '';

        // 1. Root Files
        rootFiles.forEach(file => {
            container.appendChild(createConfigSection(file.name, file.name));
        });

        // 2. Folders
        Object.keys(folders).sort().forEach(folderName => {
            const folderFiles = folders[folderName];

            const folderSection = document.createElement('section');
            folderSection.className = 'settings-section';
            folderSection.dataset.path = folderName;
            folderSection.style.marginBottom = '0.5rem';

            folderSection.innerHTML = `
                <h3 onclick="toggleConfigSection('${folderName.replace(/'/g, "\\'")}', true)" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-folder transition-icon"></i>
                    ${folderName}
                </h3>
                <div id="editor-${CSS.escape(folderName)}" style="display: none; margin-left: 1rem; border-left: 2px solid var(--border);">
                </div>
            `;

            const childrenContainer = folderSection.querySelector(`#editor-${CSS.escape(folderName)}`);
            folderFiles.forEach(file => {
                const displayName = file.name.substring(folderName.length + 1);
                childrenContainer.appendChild(createConfigSection(file.name, displayName));
            });

            container.appendChild(folderSection);
        });

    } catch (err) {
        console.error("Error loading configs", err);
        container.innerHTML = '<p class="error-text">Failed to load configurations.</p>';
    }
}

function createConfigSection(fullPath, displayName) {
    const safeId = CSS.escape(fullPath);
    const section = document.createElement('section');
    section.className = 'settings-section';
    section.dataset.path = fullPath;

    section.innerHTML = `
        <h3 onclick="toggleConfigSection('${fullPath.replace(/'/g, "\\'")}')" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-chevron-right transition-icon"></i>
            ${displayName}
        </h3>
        <div id="editor-${safeId}" style="display: none;">
        </div>
    `;
    return section;
}

window.toggleConfigSection = async function (relativePath, isFolder = false) {
    const safeId = CSS.escape(relativePath);
    const container = document.getElementById(`editor-${safeId}`);
    if (!container) return;

    const section = container.parentElement;
    const icon = section.querySelector('h3 i');

    const isHidden = container.style.display === 'none';

    if (isHidden) {
        container.style.display = 'block';
        if (icon) {
            if (icon.classList.contains('fa-chevron-right')) {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            } else if (icon.classList.contains('fa-folder')) {
                icon.classList.remove('fa-folder');
                icon.classList.add('fa-folder-open');
            }
        }

        // Load content if empty AND NOT A FOLDER
        if (!isFolder && (!container.hasChildNodes() || container.innerHTML.trim() === '')) {
            await loadConfigContent(relativePath, container);
        }
    } else {
        container.style.display = 'none';
        if (icon) {
            if (icon.classList.contains('fa-chevron-down')) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            } else if (icon.classList.contains('fa-folder-open')) {
                icon.classList.remove('fa-folder-open');
                icon.classList.add('fa-folder');
            }
        }
    }
};

async function loadConfigContent(relativePath, containerElement) {
    containerElement.innerHTML = '<p class="loading-text">Loading content...</p>';
    const fullPath = `config/${relativePath}`;

    try {
        const data = await fetchAPI(`/api/server/${serverNameManager}/file?path=${fullPath}`);
        const content = data.content;
        const isJson = relativePath.endsWith('.json');

        // Grid Container matching Server Properties
        const grid = document.createElement('div');
        grid.className = 'properties-grid';
        grid.id = `grid-${CSS.escape(relativePath)}`;

        // Raw Container (fallback)
        const raw = document.createElement('textarea');
        raw.className = 'config-raw-editor';
        raw.style.display = 'none';
        raw.id = `raw-${CSS.escape(relativePath)}`;

        // Save Button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = `Save ${relativePath}`;
        saveBtn.onclick = () => saveConfigSection(relativePath);

        containerElement.innerHTML = '';
        containerElement.appendChild(grid);
        containerElement.appendChild(raw);
        containerElement.appendChild(document.createElement('br'));
        containerElement.appendChild(saveBtn);

        // Parse
        if (isJson) {
            renderJsonToContainer(content, grid, raw, relativePath);
        } else {
            renderLinesToContainer(content, grid, raw, relativePath);
        }

    } catch (err) {
        containerElement.innerHTML = `<p class="error-text">Failed to load file: ${err.message}</p>`;
    }
}

function renderJsonToContainer(content, grid, raw, path) {
    try {
        const json = JSON.parse(content);
        configCache[path] = { lines: json, isJson: true };

        let found = false;
        for (const [key, value] of Object.entries(json)) {
            if (typeof value === 'object' && value !== null) continue;

            found = true;
            const div = document.createElement('div');
            div.className = 'property-item';

            const type = typeof value;
            let input = '';
            if (type === 'boolean') {
                input = `<select data-key="${key}" data-type="boolean">
                    <option value="true" ${value ? 'selected' : ''}>true</option>
                    <option value="false" ${!value ? 'selected' : ''}>false</option>
                 </select>`;
            } else {
                input = `<input type="text" data-key="${key}" data-type="${type}" value="${value}">`;
            }

            div.innerHTML = `<label>${key}</label>${input}`;
            grid.appendChild(div);
        }

        if (!found) fallbackRawInContainer(content, grid, raw);

    } catch (e) {
        fallbackRawInContainer(content, grid, raw);
    }
}

function renderLinesToContainer(content, grid, raw, path) {
    const lines = content.split(/\r?\n/);
    configCache[path] = { lines: lines, isJson: false };

    let foundEditable = false;
    let pendingComments = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        // Capture comments
        if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('!')) {
            // Remove the comment marker and trim
            const commentText = trimmed.replace(/^([#!\/]+)\s*/, '');
            pendingComments.push(commentText);
            return;
        }

        if (!trimmed) {
            // Optional: Decide if blank lines clear comments. 
            // Usually config comments are directly above. 
            // Let's keep them unless it's a huge gap? 
            // Standardization: Reset if we hit a blank line? 
            // Many configs have blank lines between blocks headers and values.
            // Safer to reset if the gap is large, but for now let's only reset on successful key match.
            // Actually, standard properties files often have comments immediately preceding.
            if (pendingComments.length > 0) {
                // If we have comments but hit a blank line, maybe we should keep them?
                // But risking associating a header comment with a far-away value.
                // Let's clear for safety if there's a blank line, user can adjust if needed.
                // pendingComments = []; // toggled off, let's see behavior
            }
            return;
        }

        // Match: key=value, key: value, key = value
        const match = line.match(/^([a-zA-Z0-9_.\-]+)\s*[=:]\s*(.*)$/);
        if (match) {
            foundEditable = true;
            const key = match[1];
            let value = match[2].trim();

            const div = document.createElement('div');
            div.className = 'property-item';

            // Add tooltip content
            if (pendingComments.length > 0) {
                div.title = pendingComments.join('\n');
                pendingComments = []; // Clear used comments
            }

            let inputHtml = '';
            if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
                const isTrue = value.toLowerCase() === 'true';
                inputHtml = `<select data-line="${index}" data-type="boolean">
                    <option value="true" ${isTrue ? 'selected' : ''}>true</option>
                    <option value="false" ${!isTrue ? 'selected' : ''}>false</option>
                 </select>`;
            } else {
                inputHtml = `<input type="text" data-line="${index}" value="${value.replace(/"/g, '&quot;')}">`;
            }

            div.innerHTML = `<label>${key}</label>${inputHtml}`;
            grid.appendChild(div);
        } else {
            // Found a non-empty line that isn't a key-value or comment?
            // e.g. section header [Section]
            // Clear comments to avoid attaching section comments to the first item of the section
            pendingComments = [];
        }
    });

    if (!foundEditable) {
        fallbackRawInContainer(content, grid, raw);
    }
}

function fallbackRawInContainer(content, grid, raw) {
    grid.style.display = 'none';
    raw.style.display = 'block';
    raw.value = content;
}

window.saveConfigSection = async function (relativePath) {
    const cache = configCache[relativePath];
    if (!cache) return alert("Save error: No cache found");

    // IDs
    const safeId = CSS.escape(relativePath);
    const gridId = `grid-${safeId}`;
    const rawId = `raw-${safeId}`;

    const rawEditor = document.getElementById(rawId);
    let contentToSave = '';

    if (rawEditor && rawEditor.style.display !== 'none') {
        contentToSave = rawEditor.value;
    } else {
        const container = document.getElementById(gridId);

        if (cache.isJson) {
            const inputs = container.querySelectorAll('[data-key]');
            const newJson = { ...cache.lines };

            inputs.forEach(input => {
                const key = input.dataset.key;
                const type = input.dataset.type;
                let val = input.value;
                if (type === 'number') val = Number(val);
                if (type === 'boolean') val = (val === 'true');
                newJson[key] = val;
            });
            contentToSave = JSON.stringify(newJson, null, 2);
        } else {
            const inputs = container.querySelectorAll('[data-line]');
            const newLines = [...cache.lines];

            inputs.forEach(input => {
                const index = parseInt(input.dataset.line);
                let val = input.value;
                const originalLine = newLines[index];

                const match = originalLine.match(/^([a-zA-Z0-9_.\-]+)(\s*[=:]\s*)(.*)$/);
                if (match) {
                    newLines[index] = `${match[1]}${match[2]}${val}`;
                }
            });
            contentToSave = newLines.join('\n');
        }
    }

    try {
        await fetchAPI(`/api/server/${serverNameManager}/file`, {
            method: 'PUT',
            body: JSON.stringify({
                path: `config/${relativePath}`,
                content: contentToSave
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        alert('Config saved!');

        // Update cache
        if (cache.isJson) {
            cache.lines = JSON.parse(contentToSave);
        } else {
            cache.lines = contentToSave.split(/\r?\n/);
        }

    } catch (e) {
        alert('Error saving: ' + e.message);
    }
};

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ===== Discord Webhook Management =====

// Load webhook settings when settings tab is opened
async function loadWebhookSettings() {
    try {
        const data = await fetchAPI(`/api/server/${serverNameManager}/webhook`);
        const input = document.getElementById('webhookUrl');
        if (input) {
            input.value = data.webhookUrl || '';
        }
    } catch (err) {
        console.error('Failed to load webhook settings:', err);
    }
}

// Save webhook URL
window.saveWebhook = async function () {
    const input = document.getElementById('webhookUrl');
    const statusDiv = document.getElementById('webhookStatus');
    const webhookUrl = input.value.trim();

    try {
        await fetchAPI(`/api/server/${serverNameManager}/webhook`, {
            method: 'POST',
            body: JSON.stringify({ webhookUrl }),
            headers: { 'Content-Type': 'application/json' }
        });

        statusDiv.innerHTML = '<span style="color: #4caf50;">✅ Webhook saved successfully!</span>';
        setTimeout(() => statusDiv.innerHTML = '', 3000);
    } catch (err) {
        statusDiv.innerHTML = `<span style="color: #f44336;">❌ Error: ${err.message}</span>`;
    }
};

// Test webhook
window.testWebhook = async function () {
    const input = document.getElementById('webhookUrl');
    const statusDiv = document.getElementById('webhookStatus');
    const webhookUrl = input.value.trim();

    if (!webhookUrl) {
        statusDiv.innerHTML = '<span style="color: #ff9800;">⚠️ Please enter a webhook URL first</span>';
        return;
    }

    statusDiv.innerHTML = '<span style="color: #2196f3;">🔄 Sending test notification...</span>';

    try {
        await fetchAPI(`/api/server/${serverNameManager}/webhook/test`, {
            method: 'POST',
            body: JSON.stringify({ webhookUrl }),
            headers: { 'Content-Type': 'application/json' }
        });

        statusDiv.innerHTML = '<span style="color: #4caf50;">✅ Test notification sent! Check your Discord channel.</span>';
        setTimeout(() => statusDiv.innerHTML = '', 5000);
    } catch (err) {
        statusDiv.innerHTML = `<span style="color: #f44336;">❌ Failed to send: ${err.message}</span>`;
    }
};

// Update loadSettings to also load webhook settings
const originalLoadSettings = loadSettings;
loadSettings = async function () {
    await originalLoadSettings();
    await loadWebhookSettings();
};

