// src/commands/admin/updatebot.ts
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    PresenceStatusData,
    ActivityType,
} from 'discord.js';
import ExtendedClient from '../../@types/extendedClient';
import { Command } from '../../@types/command';
import { BotConfigModel } from '../../models/BotConfig';
import { isBotAdminOrOwner } from '../../utils/permissions';
import { replyWithEmbed } from '../../utils/embedHelper';
import { activeBots } from '../../botManager';

const updatebot: Command = {
    name: 'updatebot',
    description: 'Cập nhật thông tin bot',
    usage: 'b!updatebot <botName> [name=] [avatar=] [banner=] [bio=] [presence=] [status=] [streamURL=]',
    category: 'admin',
    adminOnly: true,
    aliases: [],
    execute: async (message: Message, args: string[], distube, client) => {
        const botName = args.shift();
        if (!botName) {
            await replyWithEmbed(message, 'error', 'Bạn cần cung cấp tên bot.');
            return;
        }

        const updates: any = {};
        for (const arg of args) {
            const [key, ...val] = arg.split('=');
            if (key && val.length) updates[key.toLowerCase()] = val.join('=');
        }

        const result = await handleUpdate(message.author.id, botName, updates, client);
        await replyWithEmbed(message, 'info', result);
    },
    data: new SlashCommandBuilder()
        .setName('updatebot')
        .setDescription('Cập nhật thông tin bot từ MongoDB')
        .addUserOption(opt => opt.setName('bot').setDescription('Chọn bot').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('Tên hiển thị mới'))
        .addStringOption(opt => opt.setName('avatar').setDescription('URL ảnh avatar mới'))
        .addStringOption(opt => opt.setName('banner').setDescription('URL banner mới'))
        .addStringOption(opt => opt.setName('bio').setDescription('Bio - About Me'))
        .addStringOption(opt => opt.setName('presence').setDescription('Activity'))
        .addStringOption(opt =>
            opt.setName('status')
                .setDescription('Trạng thái bot')
                .addChoices(
                    { name: 'online', value: 'online' },
                    { name: 'idle', value: 'idle' },
                    { name: 'dnd', value: 'dnd' },
                    { name: 'invisible', value: 'invisible' }
                )
        )
        .addStringOption(opt => opt.setName('stream_url').setDescription('URL stream (nếu có)')),

    run: async (interaction: ChatInputCommandInteraction, distube, client) => {
        await interaction.deferReply({ ephemeral: true });

        const botName = interaction.options.getString('botname', true);
        const instance = activeBots.find(b => b.name === botName);

        if (!instance) {
            await interaction.editReply(`❌ Bot với tên **${botName}** không đang hoạt động.`);
            return;
        }

        const result = await handleUpdate(interaction.user.id, botName, {
            name: interaction.options.getString('name') ?? undefined,
            avatar: interaction.options.getString('avatar') ?? undefined,
            banner: interaction.options.getString('banner') ?? undefined,
            bio: interaction.options.getString('bio') ?? undefined,
            presence: interaction.options.getString('presence') ?? undefined,
            status: interaction.options.getString('status') ?? undefined,
            streamURL: interaction.options.getString('stream_url') ?? undefined,
        }, instance.client);

        await interaction.editReply(result);
    },
};

export = updatebot;

async function handleUpdate(
    userId: string,
    botName: string,
    updatesObj: {
        name?: string;
        avatar?: string;
        banner?: string;
        bio?: string;
        presence?: string;
        status?: string;
        streamURL?: string;
    },
    client: ExtendedClient
): Promise<string> {
    const config = await BotConfigModel.findOne({ name: botName });
    if (!config) return `⚠️ Không tìm thấy cấu hình bot **${botName}**.`;

    const updates: string[] = [];

    const {
        name,
        avatar,
        banner,
        bio,
        presence,
        status: rawStatus,
        streamURL,
    } = updatesObj;

    if (name && client.user.username !== name) {
        try {
            await client.user.setUsername(name);
            await BotConfigModel.updateOne({ name: botName }, { displayName: name });
            updates.push(`✅ Đã cập nhật tên bot thành **${name}**`);
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật tên: ${err.message}`);
        }
    }

    if (avatar) {
        try {
            await client.user.setAvatar(avatar);
            await BotConfigModel.updateOne({ name: botName }, { avatarURL: avatar, avatarUpdated: true });
            updates.push('✅ Đã cập nhật avatar bot.');
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật avatar: ${err.message}`);
        }
    }

    if (banner) {
        try {
            await client.user.setBanner(banner);
            await BotConfigModel.updateOne({ name: botName }, { bannerURL: banner, bannerUpdated: true });
            updates.push('✅ Đã cập nhật banner bot.');
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật banner: ${err.message}`);
        }
    }

    if (bio) {
        try {
            await client.application?.edit({ description: bio });
            await BotConfigModel.updateOne({ name: botName }, { bio });
            updates.push('✅ Đã cập nhật bio bot.');
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật bio: ${err.message}`);
        }
    }

    if (rawStatus) {
        const validStatuses: PresenceStatusData[] = ['online', 'idle', 'dnd', 'invisible'];
        const status: PresenceStatusData = validStatuses.includes(rawStatus as PresenceStatusData)
            ? (rawStatus as PresenceStatusData)
            : 'dnd';

        try {
            await client.user.setStatus(status);
            await BotConfigModel.updateOne({ name: botName }, { status });
            updates.push(`✅ Đã cập nhật status: ${status}`);
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật status: ${err.message}`);
        }
    }

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
            updates.push(`✅ Đã cập nhật presence: ${effectivePresence} | URL: ${effectiveURL ?? 'Không có'}`);
        } catch (err: any) {
            updates.push(`⚠️ Lỗi khi cập nhật presence: ${err.message}`);
        }
    }

    return updates.length ? updates.join('\n') : 'ℹ️ Không có thay đổi nào được thực hiện.';
}
