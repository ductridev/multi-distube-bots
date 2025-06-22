// src/bot/createBot.ts
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { BotConfig } from '../config';
import { Command } from '../@types/command';
import { registerDisTubeEvents } from './distubeEvents';
import { registerDiscordEvents } from './discordEvents';
import { loadCommands } from '../utils/loadCommands';
import ExtendedClient from '../@types/extendedClient';
import BotInstance from '../@types/botInstance';
import { onReady } from '../events/discord/onReady';
import { activeBots } from '../botManager';
import { createDisTube } from './createDistube';
import { YouTubePlugin } from '@distube/youtube';

export const createBot = async ({ name, token, prefix, mainPrefix }: BotConfig & { mainPrefix: string }, youtubePlugin: YouTubePlugin) => {
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

    const distube = await createDisTube(client, youtubePlugin, name);
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

    client.rest.on('rateLimited', (rateLimitData) => console.warn(`[${name}] Bot đang bị ratelimit:`, rateLimitData));

    client.once('ready', () => onReady(client, name));

    client.login(token);

    const botInstance: BotInstance = {
        name: name,
        client,
        distube,
        currentVoiceChannelId: undefined,
    };

    activeBots.push(botInstance);
}

