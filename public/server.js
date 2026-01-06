// Get server name from URL
const urlParams = new URLSearchParams(window.location.search);
const serverName = urlParams.get('name');

// API base URL
const API_BASE = window.location.origin;

// State
let currentPath = '';
let currentEditingFile = '';

// Initialize page
function init() {
    if (!serverName) {
        alert('No server specified');
        window.location.href = '/';
        return;
    }

    document.getElementById('serverTitle').textContent = serverName;
    loadFiles();
}

// Navigation
function goBack() {
    window.location.href = '/';
}

// Tab Switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load tab-specific content
    if (tabName === 'files') {
        loadFiles(currentPath);
    } else if (tabName === 'players') {
        // Load players when implemented
    } else if (tabName === 'tasks') {
        // Load tasks when implemented
    }
}

// ===== File Management Functions =====

// Load files in current directory
async function loadFiles(path = '') {
    currentPath = path;
    const fileBrowser = document.getElementById('fileBrowser');

    try {
        fileBrowser.innerHTML = '<p class="loading-text">Loading files...</p>';

        const data = await fetchAPI(`/api/server/${serverName}/files?path=${encodeURIComponent(path)}`);

        // Update breadcrumb
        updateBreadcrumb(path);

        // Display files
        if (!data.items || data.items.length === 0) {
            fileBrowser.innerHTML = '<p class="loading-text">Empty directory</p>';
            return;
        }

        fileBrowser.innerHTML = data.items.map(item => {
            const icon = item.type === 'directory' ? '📁' : getFileIcon(item.name);
            const size = item.size ? formatFileSize(item.size) : '';
            const itemPath = path ? `${path}/${item.name}` : item.name;

            return `
                <div class="file-item" onclick="${item.type === 'directory' ? `loadFiles('${itemPath}')` : `openFile('${itemPath}')`}">
                    <span class="file-icon">${icon}</span>
                    <div class="file-info">
                        <div class="file-name">${item.name}</div>
                        <div class="file-meta">${size} ${item.modified ? '• ' + new Date(item.modified).toLocaleString() : ''}</div>
                    </div>
                    <div class="file-actions" onclick="event.stopPropagation()">
                        ${item.type === 'file' ? `<button class="file-action-btn delete" onclick="deleteFile('${itemPath}')">🗑️</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading files:', error);
        fileBrowser.innerHTML = `<p class="loading-text">Error: ${error.message}</p>`;
    }
}

// Update breadcrumb navigation
function updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    const parts = path ? path.split('/') : [];

    let html = `<span class="breadcrumb-item" onclick="loadFiles('')">🏠 ${serverName}</span>`;

    let currentPathBuild = '';
    parts.forEach((part, index) => {
        currentPathBuild += (index > 0 ? '/' : '') + part;
        const pathForClick = currentPathBuild;
        html += `<span class="breadcrumb-separator">/</span>`;
        html += `<span class="breadcrumb-item" onclick="loadFiles('${pathForClick}')">${part}</span>`;
    });

    breadcrumb.innerHTML = html;
}

// Get file icon based on extension
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'jar': '☕',
        'json': '📋',
        'txt': '📄',
        'properties': '⚙️',
        'yml': '📝',
        'yaml': '📝',
        'toml': '📝',
        'log': '📊',
        'png': '🖼️',
        'jpg': '🖼️',
        'jpeg': '🖼️'
    };
    return icons[ext] || '📄';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Open file for editing
async function openFile(path) {
    try {
        const data = await fetchAPI(`/api/server/${serverName}/file?path=${encodeURIComponent(path)}`);

        currentEditingFile = path;

        document.getElementById('editorFileName').textContent = path.split('/').pop();
        document.getElementById('fileContent').value = data.content;
        document.getElementById('fileBrowser').style.display = 'none';
        document.getElementById('fileEditor').style.display = 'block';

    } catch (error) {
        console.error('Error opening file:', error);
        alert(`Error opening file: ${error.message}`);
    }
}

// Save file
async function saveFile() {
    if (!currentEditingFile) return;

    try {
        const content = document.getElementById('fileContent').value;

        await fetchAPI(`/api/server/${serverName}/file`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: currentEditingFile,
                content: content
            })
        });

        alert('File saved successfully!');

    } catch (error) {
        console.error('Error saving file:', error);
        alert(`Error saving file: ${error.message}`);
    }
}

// Close editor
function closeEditor() {
    document.getElementById('fileBrowser').style.display = 'block';
    document.getElementById('fileEditor').style.display = 'none';
    currentEditingFile = '';
}

// Delete file
async function deleteFile(path) {
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;

    try {
        await fetchAPI(`/api/server/${serverName}/file?path=${encodeURIComponent(path)}`, {
            method: 'DELETE'
        });

        loadFiles(currentPath);

    } catch (error) {
        console.error('Error deleting file:', error);
        alert(`Error deleting file: ${error.message}`);
    }
}

// Create folder
async function createFolder() {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;

    try {
        await fetchAPI(`/api/server/${serverName}/directory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: folderPath
            })
        });

        loadFiles(currentPath);

    } catch (error) {
        console.error('Error creating folder:', error);
        alert(`Error creating folder: ${error.message}`);
    }
}

// Upload files
async function uploadFiles(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }
    formData.append('path', currentPath);

    try {
        const response = await fetch(`${API_BASE}/api/server/${serverName}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();
        alert(`${result.files.length} file(s) uploaded successfully!`);

        loadFiles(currentPath);

        // Reset file input
        event.target.value = '';

    } catch (error) {
        console.error('Error uploading files:', error);
        alert(`Error uploading files: ${error.message}`);
    }
}

// Fetch API helper
async function fetchAPI(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// Initialize on page load
init();
