import { PermissionsBitField, VoiceChannel, StageChannel } from 'discord.js';

export const canBotJoinVC = (channel: VoiceChannel | StageChannel, botId: string): string | null => {
    const permissions = channel.permissionsFor(botId);
    if (!permissions) return `Không thể kiểm tra quyền của bot trong kênh thoại **${channel.name}** :lock:.`;

    if (!permissions.has(PermissionsBitField.Flags.Connect)) {
        return `Bot không có quyền để vào kênh thoại **${channel.name}** :lock:.`;
    }

    if (!permissions.has(PermissionsBitField.Flags.Speak)) {
        return `Bot không có quyền để phát nhạc trong kênh thoại **${channel.name}** :lock:.`;
    }

    return null; // means okay
}
