// scripts/ffmpegDownloader.ts
import cron from 'node-cron';
import axios from 'axios';
import fs from 'fs-extra';
import unzipper from 'unzipper';
import path from 'path';

const FFMPEG_DIR = path.resolve('/ffmpeg');
const YTDLP_PATH = path.resolve('./node_modules/@distube/yt-dlp/bin/yt-dlp');
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

async function downloadFFmpeg() {
    try {
        console.log(`[FFmpeg] Checking latest release...`);

        const apiURL = 'https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest';
        const response = await axios.get(apiURL, { headers: { 'User-Agent': 'cron-job' } });

        const asset = response.data.assets.find((a: any) =>
            a.name.includes('ffmpeg-n') &&
            a.name.includes('win64-gpl') &&
            a.name.endsWith('.zip')
        );

        if (!asset) {
            console.error('[FFmpeg] No suitable FFmpeg build found!');
            return;
        }

        console.log(`[FFmpeg] Downloading ${asset.name}...`);

        const zipRes = await axios.get(asset.browser_download_url, { responseType: 'stream' });

        await fs.ensureDir(FFMPEG_DIR);
        const tempZipPath = path.join(FFMPEG_DIR, 'ffmpeg.zip');
        const writer = fs.createWriteStream(tempZipPath);
        zipRes.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', (err) => reject(err));
        });

        // Extract
        await fs.createReadStream(tempZipPath)
            .pipe(unzipper.Extract({ path: FFMPEG_DIR }))
            .promise();

        await fs.remove(tempZipPath);

        console.log('[FFmpeg] ✅ Downloaded and extracted latest FFmpeg.');
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
    console.log(`[CRON] ⏰ Running daily update for FFmpeg and yt-dlp...`);
    await downloadFFmpeg();
    await downloadYtDlp();
});
