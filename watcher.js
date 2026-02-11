import { spawn, execSync } from 'child_process';
import simpleGit from 'simple-git';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const git = simpleGit();

let processes = [];
let isRestarting = false;

// Configuration
const SERVICES = [
    { name: 'Notification Server', cwd: 'notification-server', command: 'node', args: ['index.js'] },
    { name: 'Backend', cwd: 'web-client/backend', command: 'npm', args: ['start'] },
    { name: 'Frontend', cwd: 'web-client', command: 'npm', args: ['run', 'dev'] }
];

function startServices() {
    console.log('🚀 Starting all services...');
    SERVICES.forEach(service => {
        const child = spawn(service.command, service.args, {
            cwd: path.join(__dirname, service.cwd),
            stdio: 'inherit',
            shell: true
        });
        processes.push(child);
        console.log(`✅ Started ${service.name}`);
    });
}

function stopServices() {
    console.log('🛑 Stopping all services...');
    processes.forEach(p => p.kill());
    // Force kill node processes on Windows to be sure
    try {
        execSync('taskkill /F /IM node.exe', { stdio: 'ignore' });
    } catch (e) {
        // Ignore if no process found
    }
    processes = [];
}

async function checkAndSync() {
    if (isRestarting) return;

    try {
        // Fetch without applying
        await git.fetch();
        const status = await git.status();

        if (status.behind > 0) {
            console.log(`⬇️ Found ${status.behind} new commits. Pulling updates...`);
            isRestarting = true;
            
            stopServices();
            
            await git.pull();
            console.log('✨ Code updated successfully.');

            // Re-install dependencies if needed (simple check)
            // For now, we'll just restart, assuming no new deps for speed.
            // If you add deps often, uncomment the next lines:
            // execSync('npm install', { cwd: path.join(__dirname, 'web-client'), stdio: 'inherit' });
            // execSync('npm install', { cwd: path.join(__dirname, 'web-client/backend'), stdio: 'inherit' });

            startServices();
            isRestarting = false;
        }
    } catch (err) {
        console.error('Git check failed:', err.message);
        isRestarting = false;
    }
}

// Initial Start
startServices();

// Poll every 10 seconds
setInterval(checkAndSync, 10000);
console.log('👀 Watching for Git updates every 10 seconds...');
