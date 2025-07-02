// src/scripts/ffmpegDownloader.ts
import cron from 'node-cron';
import axios from 'axios';
import fs from 'fs-extra';
import unzipper from 'unzipper';
import path from 'path';
import process from 'process';
import tar from 'tar';
import psList from 'ps-list';

const FFMPEG_DIR = path.resolve(__dirname, '../../ffmpeg');
const YTDLP_PATH = path.resolve(__dirname, '../../node_modules/@distube/yt-dlp/bin/yt-dlp');
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

async function isFFmpegOrYtDlpRunning(): Promise<boolean> {
    const processes = await psList();
    const names = processes.map(p => p.name.toLowerCase());

    return names.some(name =>
        name.includes('ffmpeg') || name.includes('yt-dlp')
    );
    return true;
}

async function waitUntilIdle(intervalMs = 5 * 60 * 1000): Promise<void> {
    while (await isFFmpegOrYtDlpRunning()) {
        console.log(`[FFmpegUpdater] Detected ffmpeg or yt-dlp is running. Waiting 5 minutes before retrying...`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
}

async function downloadFFmpeg() {
    try {
        console.log(`[FFmpeg] Checking latest release...`);

        const apiURL = 'https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest';
        const response = await axios.get(apiURL, { headers: { 'User-Agent': 'cron-job' } });

        const platform = process.platform; // win32, linux, darwin
        let platformKeyword = '';
        let extension = '';

        if (platform === 'win32') {
            platformKeyword = 'win64-gpl';
            extension = '.zip';
        } else if (platform === 'linux') {
            platformKeyword = 'linux64-gpl';
            extension = '.tar.xz';
        } else if (platform === 'darwin') {
            platformKeyword = 'macos64-gpl';
            extension = '.tar.xz';
        } else {
            console.error(`[FFmpeg] ❌ Unsupported platform: ${platform}`);
            return;
        }

        const asset = response.data.assets.find((a: any) =>
            a.name.includes('ffmpeg-n') &&
            a.name.includes(platformKeyword) &&
            a.name.endsWith(extension)
        );

        if (!asset) {
            console.error(`[FFmpeg] ❌ No ${extension} FFmpeg build found for ${platformKeyword}`);
            return;
        }

        console.log(`[FFmpeg] Downloading ${asset.name}...`);

        await fs.ensureDir(FFMPEG_DIR);
        const tempPath = path.join(FFMPEG_DIR, `ffmpeg${extension}`);
        const writer = fs.createWriteStream(tempPath);

        const res = await axios.get(asset.browser_download_url, { responseType: 'stream' });
        res.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Extract
        if (extension === '.zip') {
            await fs.createReadStream(tempPath)
                .pipe(unzipper.Extract({ path: FFMPEG_DIR }))
                .promise();
        } else if (extension === '.tar.xz') {
            await tar.x({
                file: tempPath,
                cwd: FFMPEG_DIR,
                strip: 1, // remove top-level folder
            });
        }

        await fs.remove(tempPath);

        console.log(`[FFmpeg] ✅ Downloaded and extracted latest FFmpeg for ${platform}.`);
    } catch (err) {
        console.error('[FFmpeg] ❌ Error downloading FFmpeg:', err);
    }
}

async function downloadYtDlp() {
    try {
        console.log('[yt-dlp] Downloading latest yt-dlp...');
        const res = await axios.get(YTDLP_URL, { responseType: 'arraybuffer' });

        await fs.ensureDir(path.dirname(YTDLP_PATH));
        await fs.writeFile(YTDLP_PATH, res.data, { mode: 0o755 });

        console.log('[yt-dlp] ✅ Downloaded latest yt-dlp.');
    } catch (err) {
        console.error('[yt-dlp] ❌ Error downloading yt-dlp:', err);
    }
}

// Schedule at 00:00 every day
cron.schedule('0 0 * * *', async () => {
    console.log(`[CRON] ⏰ Scheduled update started...`);

    await waitUntilIdle();

    console.log(`[CRON] ✅ System is idle. Proceeding with update...`);
    await downloadFFmpeg();
    await downloadYtDlp();
});