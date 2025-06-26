// src/bot/createDistube.ts

import fs from 'fs';
import path from 'path';
import { DisTube, DisTubePlugin } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import SpotifyPlugin from '@distube/spotify';
import { YouTubePlugin } from '@distube/youtube';
import { BandlabPlugin } from '@distube/bandlab';
import DeezerPlugin from '@distube/deezer';
import SoundCloudPlugin from '@distube/soundcloud';
import { Client } from 'discord.js';
import { DirectLinkPlugin } from '@distube/direct-link';
import { FilePlugin } from '@distube/file';
import Cron from 'node-cron';
import { getYoutubeCookie } from '../utils/getCookiesAutomation';

const ytCookiesPath = path.resolve(__dirname, '../cookies.json');
const ytCookiesTxtPath = path.resolve(__dirname, '../cookies.txt');

export const createDisTube = async (client: Client, youtubePlugin: YouTubePlugin, name: string): Promise<DisTube> => {
    const ffmpegPath = path.resolve(__dirname, '../../ffmpeg/bin/ffmpeg');

    const plugins: DisTubePlugin[] = [];
    plugins.push(youtubePlugin);

    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        console.warn(`[${name}][Spotify Plugin] Một số tính năng của Spotify hiện không khả dụng hoặc hoạt động không chính xác vì SPOTIFY_CLIENT_ID hoặc SPOTIFY_CLIENT_SECRET không chính xác hoặc không được cung cấp`);
    }

    plugins.push(new SpotifyPlugin({
        api: {
            clientId: process.env.SPOTIFY_CLIENT_ID!,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
            topTracksCountry: 'VN',
        },
    }));

    plugins.push(new SpotifyPlugin({
        api: {
            topTracksCountry: 'VN',
        },
    }));

    if (!process.env.SOUNDCLOUD_CLIENT_ID || !process.env.SOUNDCLOUD_TOKEN) {
        console.warn(
            `[${name}][SoundCloud Plugin] Một số tính năng của Soundcloud hiện không khả dụng vì SOUNDCLOUD_CLIENT_ID hoặc SOUNDCLOUD_TOKEN không chính xác hoặc không được cung cấp`
        );
    }

    plugins.push(new SoundCloudPlugin({
        clientId: process.env.SOUNDCLOUD_CLIENT_ID!,
        oauthToken: process.env.SOUNDCLOUD_TOKEN!,
    }));

    plugins.push(new BandlabPlugin());
    plugins.push(new DeezerPlugin());
    plugins.push(new DirectLinkPlugin());
    plugins.push(new FilePlugin());
    if (fs.existsSync(ytCookiesTxtPath)) {
        plugins.push(new YtDlpPlugin({ update: false, cookies: ytCookiesTxtPath, extractorArgs: process.env.EXTRACTOR_URLS ?? "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416", proxy: process.env.PROXY_URL ?? "bungo:bungomusic@127.0.0.1:20082" }));
    } else {
        plugins.push(new YtDlpPlugin({ update: false, extractorArgs: process.env.EXTRACTOR_URLS ?? "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416", proxy: process.env.PROXY_URL ?? "bungo:bungomusic@127.0.0.1:20082" }));
    }

    console.log(`[${name}][DisTube] Đã load các plugins: ${plugins.map((plugin: DisTubePlugin) => plugin.constructor.name).join(', ')}`);

    return new DisTube(client, {
        ffmpeg: {
            path: ffmpegPath,
        },
        plugins,
        joinNewVoiceChannel: false,
        savePreviousSongs: false,
    });
}

const setupYtCookieSchedule = async (YtPlugin: YouTubePlugin) => {
    if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_PASSWORD) {
        console.log('[YouTube Plugin] Đã có đủ thông tin để đăng nhập vào Google, đang cài đặt lịch để lấy cookie');
        Cron.schedule('0 0 * * *', async () => {
            const cookies = await getYoutubeCookie();
            if (!cookies) return;
            YtPlugin.cookies = cookies;
            console.log(`[YouTube Plugin] Cookie đã được lấy thông qua trình lập lịch với Google Auth`);
        });
    }

    return YtPlugin;
}

export const loadPluginsPartYoutube = async (YtPlugin: YouTubePlugin) => {
    YtPlugin = await setupYtCookieSchedule(YtPlugin);

    if (fs.existsSync(ytCookiesPath) && fs.existsSync(ytCookiesTxtPath)) {
        try {
            YtPlugin.cookies = JSON.parse(fs.readFileSync(ytCookiesPath, { encoding: 'utf8', flag: 'r' })); 
            console.log(`[YouTube Plugin] 'cookies.json' và 'cookies.txt' đã được tải`);
        } catch {
            console.error(`[YouTube Plugin] 'cookies.json' đã gặp lỗi khi cố gắng xử lý`);
            if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_PASSWORD) {
                YtPlugin.cookies = await getYoutubeCookie();
            }
        }
    } else {
        if(!fs.existsSync(ytCookiesPath)) console.warn(`[YouTube Plugin] không tìm thấy 'cookies.json'`);
        if (!fs.existsSync(ytCookiesTxtPath)) console.warn(`[YouTube Plugin] không tìm thấy 'cookies.txt'`);

        if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_PASSWORD) {
            console.log(`[YouTube Plugin] Đang cố gắng lấy cookie từ Google Auth, điều này có thể sẽ mất một chút thời gian.`);
            YtPlugin.cookies = await getYoutubeCookie();
        }
    }

    if (YtPlugin.cookies === undefined) {
        console.warn(
            `[YouTube Plugin] Không thể tìm thấy bất kỳ cookie nào.`,
        );
    }

    return YtPlugin;
}