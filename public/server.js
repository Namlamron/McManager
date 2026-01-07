// Get server name from URL
const urlParams = new URLSearchParams(window.location.search);
const serverName = urlParams.get('name');

// API base URL
const API_BASE = window.location.origin;

// State
let currentPath = '';
let currentEditingFile = '';
let draggedItem = null; // Store dragged item path

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
    } else if (tabName === 'mods') {
        loadModConfigs();
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
            const isDir = item.type === 'directory';

            return `
                <div class="file-item" 
                     draggable="true"
                     ondragstart="drag(event, '${itemPath}')"
                     ${isDir ? `ondragover="allowDrop(event)" ondrop="drop(event, '${itemPath}')"` : ''}
                     onclick="${isDir ? `loadFiles('${itemPath}')` : `openFile('${itemPath}')`}">
                    <span class="file-icon">${icon}</span>
                    <div class="file-info">
                        <div class="file-name">${item.name}</div>
                        <div class="file-meta">${size} ${item.modified ? '• ' + new Date(item.modified).toLocaleString() : ''}</div>
                    </div>
                    <div class="file-actions" onclick="event.stopPropagation()">
                         <button class="file-action-btn delete" onclick="deleteFile('${itemPath}')">🗑️</button>
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

// Drag and Drop Logic
function allowDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function drag(event, path) {
    draggedItem = path;
    // Optional: Visual effect
    event.dataTransfer.effectAllowed = "move";
}

async function drop(event, targetPath) {
    event.preventDefault();
    event.stopPropagation(); // Prevent bubbling aka opening folder
    event.currentTarget.classList.remove('drag-over');

    if (!draggedItem || draggedItem === targetPath) return;

    const fileName = draggedItem.split('/').pop();
    const newPath = `${targetPath}/${fileName}`;

    if (confirm(`Move "${fileName}" to "${targetPath}"?`)) {
        await moveFile(draggedItem, newPath);
    }
    draggedItem = null;
}

// Ensure removing drag-over class on leave/end
document.addEventListener('dragend', () => {
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('drag-over'));
});
document.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('file-item')) {
        e.target.classList.remove('drag-over');
    }
});


// Move File API
async function moveFile(oldPath, newPath) {
    try {
        await fetchAPI(`/api/server/${serverName}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPath, newPath })
        });

        loadFiles(currentPath); // Refresh
        showNotification('Item moved successfully', 'success'); // Assuming you implement this or alert
    } catch (error) {
        console.error('Move error:', error);
        alert(`Failed to move item: ${error.message}`);
    }
}

// Load Mod Configs
async function loadModConfigs() {
    const listContainer = document.getElementById('modConfigBrowser');
    try {
        listContainer.innerHTML = '<p class="loading-text">Loading config files...</p>';
        const data = await fetchAPI(`/api/server/${serverName}/files?path=config`);

        if (!data.items || data.items.length === 0) {
            listContainer.innerHTML = '<p class="placeholder-text">No config files found.</p>';
            return;
        }

        const folders = data.items.filter(i => i.type === 'directory');
        const files = data.items.filter(i => i.type === 'file');

        let html = '';

        // Process Folders
        await Promise.all(folders.map(async (folder) => {
            const modName = folder.name;
            try {
                const subData = await fetchAPI(`/api/server/${serverName}/files?path=config/${encodeURIComponent(modName)}`);
                if (subData.items && subData.items.length > 0) {
                    html += generateConfigSection(modName, subData.items, `config/${modName}`);
                }
            } catch (ignore) { }
        }));

        // Process Root Files
        files.forEach(file => {
            const nameWithoutExt = file.name.split('.').slice(0, -1).join('.') || file.name;
            html += generateInlineConfigSection(nameWithoutExt, file, 'config');
        });

        listContainer.innerHTML = html || '<p class="placeholder-text">No config files found.</p>';

    } catch (error) {
        console.error('Error loading mod configs:', error);
        listContainer.innerHTML = `<p class="loading-text error">Error: ${error.message}</p>`;
    }
}

function generateConfigSection(sectionName, items, basePath) {
    items.sort((a, b) => a.name.localeCompare(b.name));

    const fileListHtml = items.map(item => {
        if (item.type === 'directory') return ''; // Skip sub-folders for now
        const itemPath = `${basePath}/${item.name}`;
        const uniqueId = 'cfg-' + Math.random().toString(36).substr(2, 9);

        return `
            <div class="section-file-item" onclick="toggleConfigEditor('${itemPath}', '${uniqueId}')">
                <span class="file-icon">📄</span>
                <span class="file-name">${item.name}</span>
            </div>
            <div id="${uniqueId}" class="config-editor-container">
                <p class="loading-text">Loading content...</p>
            </div>
        `;
    }).join('');

    return `
        <div class="config-section">
            <div class="config-section-header">📁 ${sectionName}</div>
            <div class="section-file-list">${fileListHtml}</div>
        </div>
    `;
}

function generateInlineConfigSection(name, file, basePath) {
    const itemPath = `${basePath}/${file.name}`;
    const uniqueId = 'cfg-' + Math.random().toString(36).substr(2, 9);

    return `
        <div class="config-section">
            <div class="config-section-header" onclick="toggleConfigEditor('${itemPath}', '${uniqueId}')" style="cursor: pointer;">
                ⚙️ ${name}
            </div>
            <div id="${uniqueId}" class="config-editor-container">
                <p class="loading-text">Loading content...</p>
            </div>
        </div>
    `;
}

async function toggleConfigEditor(path, containerId) {
    const container = document.getElementById(containerId);
    if (container.classList.contains('open')) {
        container.classList.remove('open');
        return;
    }


    container.classList.add('open');
    if (container.innerHTML.includes('config-editor-wrapper')) return;

    try {
        const data = await fetchAPI(`/api/server/${serverName}/file?path=${encodeURIComponent(path)}`);

        // Try to parse the content
        const parsed = parseConfigContent(data.content);

        if (Object.keys(parsed).length > 0) {
            // Render Grid
            const gridHtml = generateConfigGrid(parsed);
            container.innerHTML = `
                <div class="config-editor-wrapper">
                    <div id="grid-${containerId}" class="properties-grid">
                        ${gridHtml}
                    </div>
                    <div style="display:flex; gap: 10px;">
                        <button class="btn-primary" onclick="saveGridConfig('${path}', '${containerId}', this)">💾 Save Grid</button>
                        <button class="btn-warning" onclick="toggleRawEditor('${containerId}')">📝 Edit Raw Text</button>
                    </div>
                    <!-- Hidden Raw Editor for Fallback/Switching -->
                    <div id="raw-${containerId}" style="display:none; margin-top: 1rem;">
                        <textarea class="config-textarea" spellcheck="false">${escapeHtml(data.content)}</textarea>
                        <button class="btn-primary" onclick="saveInlineConfig('${path}', this)">💾 Save Text</button>
                    </div>
                </div>
            `;
            // Store original content for regex replacement later
            container.dataset.originalContent = data.content;
        } else {
            // Fallback to Textarea
            container.innerHTML = `
                <textarea class="config-textarea" spellcheck="false">${escapeHtml(data.content)}</textarea>
                <button class="btn-primary" onclick="saveInlineConfig('${path}', this)">💾 Save Changes</button>
            `;
        }
    } catch (error) {
        container.innerHTML = `<p class="error-text">Failed to load: ${error.message}</p>`;
    }
}

function toggleRawEditor(containerId) {
    const grid = document.getElementById(`grid-${containerId}`);
    const raw = document.getElementById(`raw-${containerId}`);
    if (raw.style.display === 'none') {
        grid.style.display = 'none';
        raw.style.display = 'block';
    } else {
        grid.style.display = 'grid';
        raw.style.display = 'none';
    }
}

// === Parser Logic ===
function parseConfigContent(content) {
    const lines = content.split('\n');
    const result = {};
    let currentSection = '';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return; // Comments

        // TOML/INI Section: [Section]
        const sectionMatch = trimmed.match(/^\[(.*)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1];
            return;
        }

        // Key = Value (TOML/Properties)
        const kvMatch = trimmed.match(/^([^#=:]+?)\s*[=:]\s*(.*)$/);
        if (kvMatch) {
            let key = kvMatch[1].trim();
            let value = kvMatch[2].trim();

            // Clean value quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            const cleanKey = currentSection ? `${currentSection}.${key}` : key;
            result[cleanKey] = value;
        }
    });
    return result;
}

function generateConfigGrid(parsedData) {
    let html = '';
    // Sort keys alphabetically
    const keys = Object.keys(parsedData).sort();

    keys.forEach(key => {
        html += `
            <div class="property-item">
                <label>${escapeHtml(key)}</label>
                <input type="text" data-key="${escapeHtml(key)}" value="${escapeHtml(parsedData[key])}">
            </div>
        `;
    });
    return html;
}

async function saveGridConfig(path, containerId, btn) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const originalContent = container.dataset.originalContent || '';
    const inputs = container.querySelectorAll('.properties-grid input');

    const updates = {};
    inputs.forEach(input => {
        updates[input.dataset.key] = input.value;
    });

    // Reconstruct content
    const newContent = serializeConfigContent(originalContent, updates);

    // Save
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Saving...';

    try {
        await fetchAPI(`/api/server/${serverName}/file`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content: newContent })
        });
        showNotification('Config saved successfully', 'success');

        // Update original content in case user edits again without reload
        container.dataset.originalContent = newContent;

    } catch (error) {
        alert('Error saving: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function serializeConfigContent(originalContent, updates) {
    const lines = originalContent.split('\n');
    let currentSection = '';

    const newLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return line;

        // Track Section
        const sectionMatch = trimmed.match(/^\[(.*)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1];
            return line;
        }

        // Match Key-Value
        const kvMatch = trimmed.match(/^([^#=:]+?)\s*([=:])\s*(.*)$/);
        if (kvMatch) {
            const rawKey = kvMatch[1].trim();
            const separator = kvMatch[2];
            // const rawValue = kvMatch[3]; // Not used but matched

            const fullKey = currentSection ? `${currentSection}.${rawKey}` : rawKey;

            if (updates.hasOwnProperty(fullKey)) {
                const indentMatch = line.match(/^\s*/);
                const indent = indentMatch ? indentMatch[0] : '';
                let newValue = updates[fullKey];
                // Simple preservation of quotes if needed could go here, but omitted for simplicity
                return `${indent}${rawKey} ${separator} ${newValue}`;
            }
        }
        return line;
    });

    return newLines.join('\n');
}

async function saveInlineConfig(path, btn) {
    const container = btn.closest('.config-editor-wrapper')
        ? btn.parentElement // Inside raw editor div
        : btn.parentElement;

    // If we are in the fallback view (no wrapper), it's just parent
    // If we are in wrapper -> raw editor div -> textarea is sibling
    const textarea = container.querySelector('textarea') || btn.previousElementSibling;

    if (!textarea) {
        console.error("Could not find textarea");
        return;
    }

    const content = textarea.value;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Saving...';
    try {
        await fetchAPI(`/api/server/${serverName}/file`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content })
        });
        showNotification('Config saved successfully', 'success');
    } catch (error) {
        alert('Error saving: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
// Notification Helper
function showNotification(message, type = 'info') {
    // Simple toast or alert
    // For now, let's use a temporary div if not exists
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            z-index: 2000;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }

    toast.style.backgroundColor = type === 'success' ? 'var(--success)' :
        type === 'error' ? 'var(--error)' : 'var(--accent-primary)';
    toast.textContent = message;
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

init();
