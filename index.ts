// Load .env
import 'dotenv/config'

import { spawn } from 'child_process';

// Start the external process
const straightforward = spawn('npx', ['straightforward', '--port', '20082', '--auth "bungo:bungomusic"'], {
    stdio: 'inherit', // inherit stdio so you see output in terminal
    shell: true // optional, useful on Windows
});

// Optional: handle errors
straightforward.on('error', (err) => {
    console.error('Failed to start straightforward:', err);
});

straightforward.on('exit', (code) => {
    console.log(`straightforward exited with code ${code}`);
});

require('./src/utils/logCollector');
const startAllBots = require('./src/botManager');
startAllBots();
import './src/scripts/ffmpegDownloader';