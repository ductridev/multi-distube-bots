import { Interaction } from 'discord.js';
import { SlashCommand } from '../../@types/command';
import ExtendedClient from '../../@types/extendedClient';

export const onInteractionCreate = async (interaction: Interaction, slashCommandsMap: Map<string, SlashCommand>, client: ExtendedClient) => {
    if (!interaction.isChatInputCommand()) return;

    const command = slashCommandsMap.get(interaction.commandName);
    if (!command) return;

    try {
        await command.run(interaction, client);
    } catch (err) {
        console.error(`❌ Error running slash command ${interaction.commandName}`, err);
        if (!interaction.replied) {
            await interaction.reply({ content: '❌ Đã xảy ra lỗi khi thực thi lệnh.', ephemeral: true });
        }
    }
}