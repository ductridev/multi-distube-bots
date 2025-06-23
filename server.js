const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_DIR = 'bgutil-ytdlp-pot-provider';
const SERVER_DIR = path.join(REPO_DIR, 'server');

// Step 1: Clone if not already cloned
if (!fs.existsSync(REPO_DIR)) {
    console.log('Cloning repository...');
    execSync('git clone --single-branch --branch 1.1.0 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git', { stdio: 'inherit' });
}

// Step 2: Install dependencies and build the setup-po-server
if (!fs.existsSync(path.join(SERVER_DIR, 'node_modules'))) {
    console.log('Installing dependencies...');
    execSync('npm i --force', { cwd: SERVER_DIR, stdio: 'inherit' });
    console.log('Building TypeScript...');
    execSync('npx tsc', { cwd: SERVER_DIR, stdio: 'inherit' });
}

// Step 3: Start setup-po-server
console.log('Starting setup-po-server...');
const poServer = spawn('node', ['build/main.js'], { cwd: SERVER_DIR, stdio: 'inherit' });

// Step 4: Start main index.ts using ts-node
console.log('Starting main application (index.ts)...');
const mainApp = spawn('node', ['index.js'], { stdio: 'inherit' });

// Optional: Clean exit handling
const shutdown = () => {
    poServer.kill();
    mainApp.kill();
    process.exit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

poServer.on('exit', shutdown);
mainApp.on('exit', shutdown);