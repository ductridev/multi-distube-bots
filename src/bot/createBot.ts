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
        plugins: [new SpotifyPlugin({
            api: {
                clientId: "217d1a118e1946d5b52fc16448158850",
                clientSecret: "db43cbfb2aa04029a922ca3098126e3f",
                topTracksCountry: "VN",
            },
        }), new BandlabPlugin(), new DeezerPlugin(), new SoundCloudPlugin(), new YtDlpPlugin()],
        emitNewSongOnly: true,
        joinNewVoiceChannel: false,
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

    client.once('ready', () => {
        console.log(`[${name}] Đã đăng nhập với ${client.user?.tag}`);
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
