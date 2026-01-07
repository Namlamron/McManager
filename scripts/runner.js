const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const SCRIPT_TO_RUN = path.join(__dirname, '../server.js');
const AUTO_RESTART_DELAY = 3000; // 3 seconds
const MAX_RESTARTS_IN_WINDOW = 5;
const RESTART_WINDOW = 60000; // 1 minute

// State
let restartCount = 0;
let lastRestartTime = Date.now();
let child = null;
let isShuttingDown = false;

function startProcess() {
    if (isShuttingDown) return;

    console.log(`\n[Runner] Starting ${path.basename(SCRIPT_TO_RUN)}...`);
    console.log(`[Runner] Press Ctrl+C to stop the server.\n`);

    child = spawn('node', [SCRIPT_TO_RUN], {
        stdio: 'inherit', // Pipe output directly to parent
        cwd: path.dirname(SCRIPT_TO_RUN),
        env: process.env
    });

    child.on('error', (err) => {
        console.error(`[Runner] Failed to start process: ${err.message}`);
    });

    child.on('close', (code) => {
        if (isShuttingDown) {
            console.log('[Runner] Process stopped.');
            process.exit(0);
            return;
        }

        console.log(`\n[Runner] Process exited with code ${code}`);

        // Check restart limits
        const now = Date.now();
        if (now - lastRestartTime > RESTART_WINDOW) {
            // Reset counter if window passed
            restartCount = 0;
            lastRestartTime = now;
        }

        restartCount++;

        if (restartCount > MAX_RESTARTS_IN_WINDOW) {
            console.error(`[Runner] Too many restarts in short period (${restartCount}). Stopping.`);
            process.exit(1);
        }

        console.log(`[Runner] Restarting in ${AUTO_RESTART_DELAY}ms...`);
        setTimeout(startProcess, AUTO_RESTART_DELAY);
    });
}

// Handle termination signals
function handleShutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\n[Runner] Stopping server...');

    if (child) {
        child.kill(); // Send SIGTERM
        // Force kill if it doesn't exit
        setTimeout(() => {
            if (child && !child.killed) {
                console.log('[Runner] Force killing...');
                child.kill('SIGKILL');
            }
            process.exit(0);
        }, 5000);
    } else {
        process.exit(0);
    }
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Start
console.log('========================================');
console.log('   McManager Custom Runner');
console.log('========================================');
startProcess();
