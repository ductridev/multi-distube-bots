// src/bot/createBot.ts
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { BotConfig } from '../config';
import { Command } from '../@types/command';
import { registerDisTubeEvents } from './distubeEvents';
import { registerDiscordEvents } from './discordEvents';
import { loadCommands } from './loadCommands';
import ExtendedClient from '../@types/extendedClient';
import BotInstance from '../@types/botInstance';
import SpotifyPlugin from '@distube/spotify';
import { BandlabPlugin } from '@distube/bandlab';
import DeezerPlugin from '@distube/deezer';
import SoundCloudPlugin from '@distube/soundcloud';
import { YouTubePlugin } from "@distube/youtube";
import path from 'path';
import { BotConfigModel } from '../models/BotConfig';

export function createBot({ name, token, prefix, mainPrefix }: BotConfig & { mainPrefix: string }, activeBots: BotInstance[]) {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    }) as ExtendedClient;

    const commands = new Collection<string, Command>();
    const recentTracks = new Map<string, string[]>();

    const distube = new DisTube(client, {
        ffmpeg: {
            path: path.resolve(__dirname, '../../ffmpeg/bin/ffmpeg'),
        },
        plugins: [new SpotifyPlugin({
            api: {
                clientId: process.env.SPOTIFY_CLIENT_ID,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
                topTracksCountry: "VN",
            },
        }), new YouTubePlugin(), new YtDlpPlugin({ update: true }), new BandlabPlugin(), new DeezerPlugin(), new SoundCloudPlugin({
            clientId: process.env.SOUNDCLOUD_CLIENT_ID,
            oauthToken: process.env.SOUNDCLOUD_CLIENT_ACCESS_TOKEN,
        })],
        emitNewSongOnly: true,
        joinNewVoiceChannel: false,
        savePreviousSongs: false,
    });
    console.log(`[${name}-${prefix}] Đang khởi động bot...`);

    // Extend client
    client.commands = commands;
    client.prefix = prefix;
    client.recentTracks = recentTracks;
    client.distube = distube;

    // Timeouts
    const noSongTimeouts = new Map<string, NodeJS.Timeout>();
    const noListenerTimeouts = new Map<string, NodeJS.Timeout>();

    loadCommands(commands);
    registerDisTubeEvents(distube, client, name, noSongTimeouts, noListenerTimeouts);
    registerDiscordEvents(client, distube, prefix, mainPrefix, name, noListenerTimeouts, activeBots);

    client.once('ready', async () => {
        console.log(`[${name}] Đã đăng nhập với ${client.user?.tag}`);

        const botConfig = await BotConfigModel.findOne({ name });

        if (!botConfig) return;

        if (botConfig.displayName && client.user?.username !== botConfig.displayName) {
            try {
                await client.user.setUsername(botConfig.displayName);
                console.log(`✅ Updated bot name to ${botConfig.displayName}`);
            } catch (err) {
                console.warn(`⚠️ Could not update username:`, err);
            }
        }

        if (botConfig.avatarURL) {
            try {
                const currentAvatarURL = client.user.displayAvatarURL({ extension: 'png', forceStatic: true });
                if (currentAvatarURL.includes(botConfig.avatarURL) || currentAvatarURL === botConfig.avatarURL) return;

                await client.user.setAvatar(botConfig.avatarURL);
                console.log(`✅ Updated bot avatar`, client.user.id);
            } catch (err) {
                console.warn(`⚠️ Could not update avatar:`, err);
            }
        }
    });

    client.login(token);

    const botInstance: BotInstance = {
        name: name,
        client,
        distube,
        currentVoiceChannelId: undefined,
    };

    activeBots.push(botInstance);
}
