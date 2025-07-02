// src/bot/discordEvents.ts
import { Interaction, Message, VoiceState } from 'discord.js';
import { DisTube } from 'distube';
import ExtendedClient from '../@types/extendedClient';
import BotInstance from '../@types/botInstance';
import { onVoiceStateUpdate } from '../events/discord/onVoiceStateUpdate';
import { onMessageCreate } from '../events/discord/onMessageCreate';
import { onInteractionCreate } from '../events/discord/onInteractionCreate';

export function registerDiscordEvents(
    client: ExtendedClient,
    distube: DisTube,
    prefix: string,
    mainPrefix: string,
    name: string,
    noSongTimeouts: Map<string, NodeJS.Timeout>,
    noListenerTimeouts: Map<string, NodeJS.Timeout>,
    noPlayWarningTimeouts: Map<string, NodeJS.Timeout>,
    activeBots: BotInstance[],
) {
    client.on('voiceStateUpdate', (oldState: VoiceState, newState: VoiceState) => onVoiceStateUpdate(oldState, newState, client, activeBots, noSongTimeouts, noListenerTimeouts, noPlayWarningTimeouts, distube));
    client.on('interactionCreate', (interaction: Interaction) => onInteractionCreate(interaction, activeBots, mainPrefix, client, distube, name));
    client.on('messageCreate', async (message: Message) => onMessageCreate(message, activeBots, mainPrefix, client, distube, name));
}