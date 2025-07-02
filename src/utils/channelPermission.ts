import { GuildTextBasedChannel, PermissionsBitField } from 'discord.js';

export const canBotReadReply = (channel: GuildTextBasedChannel, botId: string): { msg: string | null, ableReply: boolean, ableSend: boolean } => {
    const permissions = channel.permissionsFor(botId);
    if (!permissions) return {
        msg: `Không thể kiểm tra quyền của bot trong kênh **${channel.name}** :lock:.`, ableReply: false, ableSend: false
    };

    if (!permissions.has(PermissionsBitField.Flags.ReadMessageHistory))
        return {
            msg: `Bot không có quyền đọc lịch sử dụng trong kênh **${channel.name}** :lock:.`, ableReply: false, ableSend: true
        };

    if (!permissions.has(PermissionsBitField.Flags.SendMessages))
        return { msg: `Bot không có quyền để gửi tin nhắn trong kênh **${channel.name}** :lock:.`, ableReply: false, ableSend: false };

    return { msg: null, ableReply: true, ableSend: true }; // means okay
}