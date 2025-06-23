// src/commands/admin/add-bot.ts
import { Command } from '../../@types/command';
import { ChatInputCommandInteraction, Client, GatewayIntentBits, Message, SlashCommandBuilder } from 'discord.js';
import { BotConfigModel } from '../../models/BotConfig';
import { createBot } from '../../bot/createBot';
import { getGlobalValue } from '../../utils/getGlobalConfig';
import { replyWithEmbed } from '../../utils/embedHelper';
import { YouTubePlugin } from '@distube/youtube';
import { loadPluginsPartYoutube } from '../../bot/createDistube';
import ExtendedClient from '../../@types/extendedClient';

export const addBot: Command = {
    name: 'addbot',
    description: 'Thêm bot mới với token.',
    usage: 'b!addbot <token> [prefix] [name] [displayName] [avatarUrl]',
    category: 'admin',
    ownerOnly: true,
    aliases: [],
    execute: async (message: Message, args: string[]) => {
        const [token, prefixArg, nameArg, displayNameArg, avatarUrlArg] = args;

        if (!token) {
            await replyWithEmbed(message, 'error', 'Bạn phải cung cấp token.');
            return;
        }

        const testClient = new Client({ intents: [GatewayIntentBits.Guilds] });
        try {
            await testClient.login(token);
            await testClient.destroy(); // Clean up if login is successful
        } catch (error) {
            await replyWithEmbed(message, 'error', 'Token không hợp lệ hoặc đã bị thu hồi.');
            return;
        }

        // Get all bots to determine next prefix
        const allBots = await BotConfigModel.find();
        const usedPrefixes = new Set(allBots.map(b => b.prefix));
        let prefix = prefixArg || '1';
        while (usedPrefixes.has(prefix)) {
            prefix = (parseInt(prefix) + 1).toString();
        }

        const fallbackBot = allBots[0];
        if (!fallbackBot) {
            await replyWithEmbed(message, 'error', 'Không có bot mẫu để lấy thông tin mặc định.');
            return;
        }

        const name = nameArg || `[${prefix}] BuNgo Bot Music`;
        const displayName = displayNameArg || name;
        const avatarURL = avatarUrlArg || fallbackBot.avatarURL;
        const ownerId = message.author.id;

        const existingBot = await BotConfigModel.findOne({ prefix });
        if (existingBot) {
            await replyWithEmbed(message, 'warning', `Bot với prefix "${prefix}" đã tồn tại.`);
            return;
        }

        const botConfig = {
            name,
            token,
            prefix,
            enabled: true,
            displayName,
            avatarURL,
            ownerId,
        };

        await BotConfigModel.create(botConfig);

        let youtubePlugin = new YouTubePlugin({
            ytdlOptions: {
                lang: 'vi',
                playerClients: ['WEB_EMBEDDED', 'WEB'],
            },
        });

        youtubePlugin = await loadPluginsPartYoutube(youtubePlugin);

        const mainPrefix = await getGlobalValue<string>('mainPrefix') ?? 'm';
        createBot({ ...botConfig, mainPrefix }, youtubePlugin);

        await replyWithEmbed(message, 'success', `Đã thêm bot mới với prefix \`${prefix}\`.`);
    },
};

export default {
    data: new SlashCommandBuilder()
        .setName('addbot')
        .setDescription('Thêm bot mới với token')
        .addStringOption(opt =>
            opt.setName('token')
                .setDescription('Token của bot mới')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('prefix')
                .setDescription('Prefix cho bot mới')
        )
        .addStringOption(opt =>
            opt.setName('name')
                .setDescription('Tên hiển thị bot')
        )
        .addStringOption(opt =>
            opt.setName('display_name')
                .setDescription('Tên hiển thị trong máy chủ')
        )
        .addStringOption(opt =>
            opt.setName('avatar')
                .setDescription('URL ảnh avatar cho bot')
        ),

    ownerOnly: true, // Custom property if your loader supports it

    run: async (interaction: ChatInputCommandInteraction, client: ExtendedClient) => {
        await interaction.deferReply({ ephemeral: true });

        const token = interaction.options.getString('token', true);
        const prefixArg = interaction.options.getString('prefix') ?? '';
        const nameArg = interaction.options.getString('name') ?? '';
        const displayNameArg = interaction.options.getString('display_name') ?? '';
        const avatarUrlArg = interaction.options.getString('avatar') ?? '';

        const testClient = new Client({ intents: [GatewayIntentBits.Guilds] });
        try {
            await testClient.login(token);
            await testClient.destroy();
        } catch (error) {
            await interaction.editReply('❌ Token không hợp lệ hoặc đã bị thu hồi.');
            return;
        }

        const allBots = await BotConfigModel.find();
        const usedPrefixes = new Set(allBots.map(b => b.prefix));
        let prefix = prefixArg || '1';
        while (usedPrefixes.has(prefix)) {
            prefix = (parseInt(prefix) + 1).toString();
        }

        const fallbackBot = allBots[0];
        if (!fallbackBot) {
            await interaction.editReply('❌ Không có bot mẫu để lấy thông tin mặc định.');
            return;
        }

        const name = nameArg || `[${prefix}] BuNgo Bot Music`;
        const displayName = displayNameArg || name;
        const avatarURL = avatarUrlArg || fallbackBot.avatarURL;
        const ownerId = interaction.user.id;

        const existingBot = await BotConfigModel.findOne({ prefix });
        if (existingBot) {
            await interaction.editReply(`⚠️ Bot với prefix "${prefix}" đã tồn tại.`);
            return;
        }

        const botConfig = {
            name,
            token,
            prefix,
            enabled: true,
            displayName,
            avatarURL,
            ownerId,
        };

        await BotConfigModel.create(botConfig);

        let youtubePlugin = new YouTubePlugin({
            ytdlOptions: {
                lang: 'vi',
                playerClients: ['WEB_EMBEDDED', 'WEB'],
            },
        });

        youtubePlugin = await loadPluginsPartYoutube(youtubePlugin);

        const mainPrefix = await getGlobalValue<string>('mainPrefix') ?? 'm';
        createBot({ ...botConfig, mainPrefix }, youtubePlugin);

        await interaction.editReply(`✅ Đã thêm bot mới với prefix \`${prefix}\`.`);
    },
};