// src/commands/admin/updatebot.ts
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { handleBotUpdate } from '../../handlers/botUpdateHandler';
import ExtendedClient from '../../@types/extendedClient';

export default {
    data: new SlashCommandBuilder()
        .setName('updatebot')
        .setDescription('Cập nhật thông tin bot từ MongoDB')
        .addUserOption(opt => opt.setName('bot').setDescription('Chọn bot'))
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

    run: async (interaction: ChatInputCommandInteraction, client: ExtendedClient) => {
        try {
            await interaction.deferReply({ ephemeral: true });
            const result = await handleBotUpdate(interaction, client);
            await interaction.editReply(result);
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
};
