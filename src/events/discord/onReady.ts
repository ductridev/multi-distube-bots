// src/events/discord/onReady.ts

import { ActivityType, PresenceStatusData } from "discord.js";
import ExtendedClient from "../../@types/extendedClient";
import { BotConfigModel } from "../../models/BotConfig";
import { loadSlashCommands } from "../../utils/loadCommands";
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
        console.log(`[${name}]✅ Đã thêm thành công ${slashCommands.length} lệnh slash.`);

        const botConfig = await BotConfigModel.findOne({ name });

        if (!botConfig) return;

        if (botConfig.displayName && client.user?.username !== botConfig.displayName) {
            try {
                await client.user.setUsername(botConfig.displayName);
                console.log(`[${name}]✅ Đã cập nhật username: ${botConfig.displayName}`);
            } catch (err) {
                console.warn(`[${name}]⚠️ Không thể cập nhật username:`, err);
            }
        }

        if (botConfig.avatarURL && !botConfig.avatarUpdated) {
            try {
                await client.user.setAvatar(botConfig.avatarURL);
                await BotConfigModel.updateOne({ name }, { avatarUpdated: true });
                console.log(`[${name}]✅ Đã cập nhật avatar`, client.user.id);
            } catch (err) {
                console.warn(`[${name}]⚠️ Không thể cập nhật avatar:`, err);
            }
        }

        if (botConfig.bannerURL && !botConfig.bannerUpdated) {
            try {
                await client.user.setBanner(botConfig.bannerURL);
                await BotConfigModel.updateOne({ name }, { bannerUpdated: true });
                console.log(`[${name}]✅ Đã cập nhật banner`, client.user.id);
            } catch (err) {
                console.warn(`[${name}]⚠️ Không thể cập nhật banner:`, err);
            }
        }

        if (botConfig.presence) {
            try {
                client.user.setActivity(botConfig.presence, { type: ActivityType.Watching, url: botConfig.streamURL });
                console.log(`[${name}]✅ Đã cập nhật hoạt động: ${botConfig.presence}, ${botConfig.streamURL || 'No stream'}`);
            } catch (err) {
                console.warn(`[${name}]⚠️ Không thể cập nhật hoạt động:`, err);
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
            console.log(`[${name}]✅ Đã cập nhật trạng thái: ${botConfig.status}, ${botConfig.presence || 'Không có hoạt động nào'}`);
            // }
        } catch (err) {
            console.warn(`[${name}]⚠️ Không thể cập nhật trạng thái:`, err);
        }

        if (botConfig.bio) {
            try {
                await client.application?.edit({
                    description: botConfig.bio,
                });
                console.log(`[${name}]✅ Đã cập nhật bio (About Me)`);
            } catch (err) {
                console.warn('[${name}]⚠️ Không thể cập nhật bio:', err);
            }
        }
    } catch (err) {
        console.error(err);
        // Do nothing
    }
}