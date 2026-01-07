/**
 * Auto-Update Service for McManager
 * 
 * This service periodically checks for Git updates and automatically
 * pulls changes when detected.
 * 
 * Usage:
 *   node auto-update.js
 * 
 * Or with PM2:
 *   pm2 start auto-update.js --name mcmanager-updater
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');

// Configuration
const CHECK_INTERVAL = 60000; // Check every 60 seconds (1 minute)
const REPO_PATH = path.join(__dirname, '..'); // Parent directory (project root)
const BRANCH = 'main'; // Change if using different branch

let isUpdating = false;
let lastCommitHash = null;

console.log('🚀 McManager Auto-Update Service Started');
console.log(`📁 Repository: ${REPO_PATH}`);
console.log(`🌿 Branch: ${BRANCH}`);
console.log(`⏱️  Check Interval: ${CHECK_INTERVAL / 1000}s\n`);

/**
 * Execute a command and return output
 */
async function runCommand(command, cwd = REPO_PATH) {
    try {
        const { stdout, stderr } = await execPromise(command, { cwd });
        return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (error) {
        return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
    }
}

/**
 * Get the current commit hash
 */
async function getCurrentCommit() {
    const result = await runCommand('git rev-parse HEAD');
    return result.success ? result.stdout : null;
}

/**
 * Fetch latest changes from remote
 */
async function fetchUpdates() {
    console.log('🔍 Fetching updates from remote...');
    const result = await runCommand(`git fetch origin ${BRANCH}`);

    if (!result.success) {
        console.error('❌ Failed to fetch:', result.error);
        return false;
    }

    return true;
}

/**
 * Check if there are new commits
 */
async function hasNewCommits() {
    const localResult = await runCommand('git rev-parse HEAD');
    const remoteResult = await runCommand(`git rev-parse origin/${BRANCH}`);

    if (!localResult.success || !remoteResult.success) {
        console.error('❌ Failed to check commits');
        return false;
    }

    const localHash = localResult.stdout;
    const remoteHash = remoteResult.stdout;

    return localHash !== remoteHash;
}

/**
 * Pull latest changes
 */
async function pullChanges() {
    console.log('⬇️  Pulling latest changes...');
    const result = await runCommand(`git pull origin ${BRANCH}`);

    if (!result.success) {
        console.error('❌ Failed to pull:', result.error);
        return false;
    }

    console.log('✅ Pull successful');
    return true;
}

/**
 * Install/update dependencies
 */
async function updateDependencies() {
    console.log('📦 Updating dependencies...');
    const result = await runCommand('npm install');

    if (!result.success) {
        console.error('❌ Failed to update dependencies:', result.error);
        return false;
    }

    console.log('✅ Dependencies updated');
    return true;
}

/**
 * Restart the main McManager server
 */
async function restartServer() {
    console.log('🔄 Restarting McManager server...');

    // Check if PM2 is available
    const pm2Check = await runCommand('pm2 list');

    if (pm2Check.success && pm2Check.stdout.includes('mcmanager')) {
        // Restart via PM2
        const result = await runCommand('pm2 restart mcmanager');

        if (result.success) {
            console.log('✅ Server restarted via PM2');
            return true;
        } else {
            console.error('❌ Failed to restart via PM2:', result.error);
            return false;
        }
    } else {
        console.log('⚠️  PM2 not detected or mcmanager not running');
        console.log('💡 Please restart the server manually or set up PM2');
        return true; // Don't fail the update process
    }
}

/**
 * Perform the update process
 */
async function performUpdate() {
    if (isUpdating) {
        console.log('⏳ Update already in progress, skipping...');
        return;
    }

    isUpdating = true;
    console.log('\n🔔 New changes detected! Starting update process...\n');

    try {
        // Pull changes
        if (!await pullChanges()) {
            console.error('❌ Update failed at pull stage');
            isUpdating = false;
            return;
        }

        // Update dependencies
        if (!await updateDependencies()) {
            console.error('❌ Update failed at dependency stage');
            isUpdating = false;
            return;
        }

        // Restart server
        await restartServer();

        // Update last commit hash
        lastCommitHash = await getCurrentCommit();

        console.log('\n✅ Update completed successfully!');
        console.log(`📝 Current commit: ${lastCommitHash}\n`);

    } catch (error) {
        console.error('❌ Update process failed:', error);
    } finally {
        isUpdating = false;
    }
}

/**
 * Main check loop
 */
async function checkForUpdates() {
    try {
        // Fetch latest changes
        if (!await fetchUpdates()) {
            return;
        }

        // Check if there are new commits
        if (await hasNewCommits()) {
            await performUpdate();
        } else {
            // Only log occasionally to reduce spam
            if (Math.random() < 0.05) { // ~5% of checks
                console.log('✓ No updates available');
            }
        }

    } catch (error) {
        console.error('❌ Error during update check:', error);
    }
}

/**
 * Initialize and start the service
 */
async function start() {
    // Get initial commit hash
    lastCommitHash = await getCurrentCommit();
    console.log(`📝 Starting commit: ${lastCommitHash}\n`);

    // Initial check
    await checkForUpdates();

    // Set up periodic checks
    setInterval(checkForUpdates, CHECK_INTERVAL);

    console.log('👀 Watching for updates...\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Auto-Update Service Stopped');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Auto-Update Service Stopped');
    process.exit(0);
});

// Start the service
start().catch(error => {
    console.error('❌ Failed to start auto-update service:', error);
    process.exit(1);
});
