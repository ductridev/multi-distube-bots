// src/events/discord/onReady.ts

import { ActivityType, Interaction, PresenceStatusData } from "discord.js";
import ExtendedClient from "../../@types/extendedClient";
import { BotConfigModel } from "../../models/BotConfig";
import { loadSlashCommands } from "../../utils/loadCommands";
import { onInteractionCreate } from "./onInteractionCreate";
import { SlashCommand } from "../../@types/command";

export const onReady = async (client: ExtendedClient, name: string) => {
    try {
        console.log(`[${name}] Đã đăng nhập với ${client.user?.tag}`);

        // Load slash commands
        const slashCommandsMap = new Map<string, SlashCommand>();
        const slashCommands = await loadSlashCommands();
        const commandsData = slashCommands.map(cmd => cmd.data.toJSON());
        for (const cmd of slashCommands) {
            slashCommandsMap.set(cmd.data.name, cmd);
        }

        await client.application.commands.set(commandsData);
        console.log(`✅ Đã thêm thành công ${slashCommands.length} lệnh slash.`);

        client.on('interactionCreate', (interaction: Interaction) => onInteractionCreate(interaction, slashCommandsMap, client));
        // End load slash commands

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

        if (botConfig.avatarURL && !botConfig.avatarUpdated) {
            try {
                await client.user.setAvatar(botConfig.avatarURL);
                await BotConfigModel.updateOne({ name }, { avatarUpdated: true });
                console.log(`✅ Updated bot avatar`, client.user.id);
            } catch (err) {
                console.warn(`⚠️ Could not update avatar:`, err);
            }
        }

        if (botConfig.bannerURL && !botConfig.bannerUpdated) {
            try {
                await client.user.setBanner(botConfig.bannerURL);
                await BotConfigModel.updateOne({ name }, { bannerUpdated: true });
                console.log(`✅ Updated bot banner`, client.user.id);
            } catch (err) {
                console.warn(`⚠️ Could not update banner:`, err);
            }
        }

        if (botConfig.presence) {
            try {
                client.user.setActivity(botConfig.presence, { type: ActivityType.Watching, url: botConfig.streamURL });
            } catch (err) {
                console.warn(`⚠️ Could not update activity:`, err);
            }
        }

        const validStatuses: PresenceStatusData[] = ['online', 'idle', 'dnd', 'invisible'];

        const rawStatus = botConfig.status;
        const status: PresenceStatusData = validStatuses.includes(rawStatus as PresenceStatusData)
            ? rawStatus as PresenceStatusData
            : 'dnd';

        try {
            // if (client.user.) {
            client.user.setStatus(status);
            console.log(`✅ Updated presence: ${botConfig.status}, ${botConfig.presence || 'No activity'}`);
            // }
        } catch (err) {
            console.warn(`⚠️ Could not update presence:`, err);
        }

        if (botConfig.bio) {
            try {
                await client.application?.edit({
                    description: botConfig.bio,
                });
                console.log(`✅ Updated bot bio (About Me)`);
            } catch (err) {
                console.warn('⚠️ Could not update bot bio:', err);
            }
        }
    } catch (err) {
        console.error(err);
        // Do nothing
    }
}