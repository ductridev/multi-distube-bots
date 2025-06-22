// src/handlers/botUpdateHandler.ts
import {
    ChatInputCommandInteraction,
    ActivityType,
    PresenceStatusData,
} from 'discord.js';
import { BotConfigModel } from '../models/BotConfig';
import { isBotAdminOrOwner } from '../utils/permissions';
import ExtendedClient from '../@types/extendedClient';

export async function handleBotUpdate(interaction: ChatInputCommandInteraction, client: ExtendedClient): Promise<string> {
    const targetUser = interaction.options.getUser('bot') || client.user;
    const botName = targetUser?.username;

    const config = await BotConfigModel.findOne({ name: botName });
    if (!config) return `⚠️ Không tìm thấy cấu hình bot **${botName}**.`;

    const hasPermission = await isBotAdminOrOwner(interaction.user.id, config.ownerId);
    if (!hasPermission) return '⛔ Bạn không có quyền cập nhật bot này.';

    const updates: string[] = [];

    // Optional Fields
    const name = interaction.options.getString('name');
    const avatar = interaction.options.getString('avatar');
    const banner = interaction.options.getString('banner');
    const bio = interaction.options.getString('bio');
    const presence = interaction.options.getString('presence');
    const rawStatus = interaction.options.getString('status') || 'online';
    const streamURL = interaction.options.getString('stream_url');

    // Update Display Name
    if (name && client.user.username !== name) {
        try {
            await client.user.setUsername(name);
            await BotConfigModel.updateOne({ name: botName }, { displayName: name });
            updates.push(`✅ Đã cập nhật tên bot thành **${name}**`);
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật tên: ${err.message}`);
        }
    }

    // Update Avatar
    if (avatar) {
        try {
            await client.user.setAvatar(avatar);
            await BotConfigModel.updateOne({ name: botName }, { avatarURL: avatar, avatarUpdated: true });
            updates.push('✅ Đã cập nhật avatar bot.');
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật avatar: ${err.message}`);
        }
    }

    // Update Banner
    if (banner) {
        try {
            await client.user.setBanner(banner);
            await BotConfigModel.updateOne({ name: botName }, { bannerURL: banner, bannerUpdated: true });
            updates.push('✅ Đã cập nhật banner bot.');
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật banner: ${err.message}`);
        }
    }

    // Update Bio
    if (bio) {
        try {
            await client.application?.edit({ description: bio });
            await BotConfigModel.updateOne({ name: botName }, { bio });
            updates.push('✅ Đã cập nhật bio bot.');
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật bio: ${err.message}`);
        }
    }

    // Update Status
    if (rawStatus) {
        const validStatuses: PresenceStatusData[] = ['online', 'idle', 'dnd', 'invisible'];

        const status: PresenceStatusData = validStatuses.includes(rawStatus as PresenceStatusData)
            ? rawStatus as PresenceStatusData
            : 'dnd';

        try {
            await client.user.setStatus(status);
            await BotConfigModel.updateOne({ name: botName }, { status });
            updates.push(`✅ Đã cập nhật status: ${status}`);
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật status: ${err.message}`);
        }
    }

    // Update Presence
    if (presence || streamURL) {
        try {
            const currentActivity = client.user?.presence?.activities?.[0];
            const effectivePresence = presence ?? currentActivity?.name ?? '';
            const effectiveType = streamURL
                ? ActivityType.Streaming
                : currentActivity?.type ?? ActivityType.Watching;
            const effectiveURL = streamURL ?? currentActivity?.url ?? undefined;

            client.user.setActivity(effectivePresence, {
                type: effectiveType,
                url: effectiveURL,
            });
            await BotConfigModel.updateOne({ name: botName }, { presence, streamURL });
            updates.push(`✅ Đã cập nhật presence: ${presence || 'Không có activity'} | URL: ${streamURL}`);
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật presence: ${err.message}`);
        }
    }

    if (!updates.length) {
        updates.push('ℹ️ Không có thay đổi nào được thực hiện.');
    }

    return updates.join('\n');
}
