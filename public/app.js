// API base URL - change this if running on a different machine
const API_BASE = window.location.origin;

// DOM Elements
const form = document.getElementById('createServerForm');
const createBtn = document.getElementById('createBtn');
const btnText = createBtn.querySelector('.btn-text');
const btnLoader = createBtn.querySelector('.btn-loader');
const statusMessage = document.getElementById('statusMessage');
const serverList = document.getElementById('serverList');

const minecraftVersionSelect = document.getElementById('minecraftVersion');
const loaderVersionSelect = document.getElementById('loaderVersion');
const installerVersionSelect = document.getElementById('installerVersion');

const serverTypeSelect = document.getElementById('serverType');
const fabricInputs = document.getElementById('fabricInputs');
const forgeInputs = document.getElementById('forgeInputs');
const forgeMcVersionSelect = document.getElementById('forgeMcVersion');
const forgeVersionSelect = document.getElementById('forgeVersion');
let forgePromos = {}; // Store fetched promos

// Initialize app
async function init() {
    await loadVersions();
    setupEventListeners();
    await loadVersions();
    await loadServers();
}

function setupEventListeners() {
    serverTypeSelect.addEventListener('change', () => {
        const type = serverTypeSelect.value;
        if (type === 'fabric') {
            fabricInputs.style.display = 'grid';
            forgeInputs.style.display = 'none';
        } else {
            fabricInputs.style.display = 'none';
            forgeInputs.style.display = 'grid';
            if (Object.keys(forgePromos).length === 0) {
                loadForgeVersions();
            }
        }
    });

    forgeMcVersionSelect.addEventListener('change', updateForgeVersions);
}

async function loadForgeVersions() {
    try {
        const data = await fetchAPI('/api/versions/forge_promos');
        forgePromos = data.promos;

        // Extract MC versions from keys like "1.16.5-recommended" or "1.16.5-latest"
        const mcVersions = new Set();
        Object.keys(forgePromos).forEach(key => {
            const version = key.split('-')[0];
            mcVersions.add(version);
        });

        // Sort versions (roughly)
        const sortedMc = Array.from(mcVersions).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

        // Populate MC Select
        forgeMcVersionSelect.innerHTML = '';
        sortedMc.forEach(ver => {
            const opt = document.createElement('option');
            opt.value = ver;
            opt.textContent = ver;
            forgeMcVersionSelect.appendChild(opt);
        });

        // Trigger update for first item
        updateForgeVersions();

    } catch (error) {
        console.error('Error loading forge versions', error);
        showStatus('Failed to load Forge versions', 'error');
    }
}

function updateForgeVersions() {
    const mcVer = forgeMcVersionSelect.value;
    forgeVersionSelect.innerHTML = '';

    // Look for latest and recommended
    const latest = forgePromos[`${mcVer}-latest`];
    const recommended = forgePromos[`${mcVer}-recommended`];

    if (recommended) {
        const opt = document.createElement('option');
        opt.value = recommended;
        opt.textContent = `${recommended} (Recommended)`;
        forgeVersionSelect.appendChild(opt);
    }

    if (latest && latest !== recommended) {
        const opt = document.createElement('option');
        opt.value = latest;
        opt.textContent = `${latest} (Latest)`;
        // If no recommended, select latest
        if (!recommended) opt.selected = true;
        forgeVersionSelect.appendChild(opt);
    }

    if (!latest && !recommended) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No versions found';
        forgeVersionSelect.appendChild(opt);
    }
}

// Load all version dropdowns
async function loadVersions() {
    try {
        // Load Minecraft versions
        const mcVersions = await fetchAPI('/api/versions/minecraft');
        populateSelect(minecraftVersionSelect, mcVersions, 'version', 'version', true);

        // Load Fabric loader versions
        const loaderVersions = await fetchAPI('/api/versions/loader');
        populateSelect(loaderVersionSelect, loaderVersions, 'version', 'version', false);

        // Load installer versions
        const installerVersions = await fetchAPI('/api/versions/installer');
        populateSelect(installerVersionSelect, installerVersions, 'version', 'version', false);

    } catch (error) {
        console.error('Error loading versions:', error);
        showStatus('Failed to load version information. Please refresh the page.', 'error');
    }
}

// Populate a select element with options
function populateSelect(selectElement, data, valueKey, textKey, filterStable = false) {
    selectElement.innerHTML = '';

    // Filter to stable versions only if requested
    let items = data;
    if (filterStable) {
        items = data.filter(item => item.stable);
    }

    // Add options
    items.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];

        // Select first item by default
        if (index === 0) {
            option.selected = true;
        }

        selectElement.appendChild(option);
    });
}

// Load and display servers
async function loadServers() {
    try {
        const servers = await fetchAPI('/api/servers');

        if (servers.length === 0) {
            serverList.innerHTML = `
                <div class="empty-state">
                    <p>No servers created yet.<br>Create your first server above!</p>
                </div>
            `;
            return;
        }

        serverList.innerHTML = servers.map(server => `
            <div class="server-item" onclick="window.location.href='server.html?name=${encodeURIComponent(server.name)}'">
                <h3>${server.name}</h3>
                <p>Created: ${new Date(server.created).toLocaleString()}</p>
                ${server.jarFile ? `<span class="jar-file">${server.jarFile}</span>` : '<p>No JAR file found</p>'}
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading servers:', error);
        serverList.innerHTML = '<p class="loading-text">Failed to load servers</p>';
    }
}

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const serverType = serverTypeSelect.value;

    const formData = {
        serverName: document.getElementById('serverName').value.trim(),
        serverType: serverType
    };

    if (serverType === 'fabric') {
        formData.minecraftVersion = minecraftVersionSelect.value;
        formData.loaderVersion = loaderVersionSelect.value;
        formData.installerVersion = installerVersionSelect.value;
    } else {
        formData.minecraftVersion = forgeMcVersionSelect.value;
        formData.forgeVersion = forgeVersionSelect.value;
    }

    // Validation
    if (!formData.serverName) {
        showStatus('Please enter a server name', 'error');
        return;
    }

    // Show loading state
    setLoading(true);
    hideStatus();

    try {
        const result = await fetchAPI('/api/server/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        let msg = `Server "${result.serverName}" created successfully!`;
        if (result.message) {
            msg += ` ${result.message}`;
        } else if (result.jarFile) {
            msg += ` JAR file: ${result.jarFile}`;
        }
        showStatus(msg, 'success');

        // Reset form
        form.reset();

        // Reload server list
        await loadServers();

    } catch (error) {
        console.error('Error creating server:', error);
        showStatus(error.message || 'Failed to create server. Please try again.', 'error');
    } finally {
        setLoading(false);
    }
});

// Fetch API helper
async function fetchAPI(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// Show status message
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
}

// Hide status message
function hideStatus() {
    statusMessage.className = 'status-message';
}

// Set loading state
function setLoading(isLoading) {
    createBtn.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline';
    btnLoader.style.display = isLoading ? 'inline-flex' : 'none';
}

// Initialize on page load
init();
