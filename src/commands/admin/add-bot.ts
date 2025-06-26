// src/commands/admin/add-bot.ts
/* 
    Command: addbot
    Description: Adds a new bot to the bot list.
    Usage: b!addbot <token> <prefix> <name> <display_name> <avatar>
    Category: admin
    Aliases: []
*/
import { ChatInputCommandInteraction, Client, GatewayIntentBits, Message, SlashCommandBuilder } from 'discord.js';
import { BotConfigModel } from '../../models/BotConfig';
import { createBot } from '../../bot/createBot';
import { getGlobalValue } from '../../utils/getGlobalConfig';
import { replyWithEmbed } from '../../utils/embedHelper';
import { YouTubePlugin } from '@distube/youtube';
import { loadPluginsPartYoutube } from '../../bot/createDistube';
import { Command } from '../../@types/command';

const addbot: Command = {
    name: 'addbot',
    description: 'Thêm bot mới vào danh sách bot.',
    usage: 'b!addbot <token> <prefix> <name> <display_name> <avatar>',
    category: 'admin',
    adminOnly: true,
    aliases: [],
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
    execute: async (message: Message, args: string[]) => {
        try {
            const [token, prefixArg, nameArg, displayNameArg, avatarUrlArg] = args;
            await handleAddBot(token, prefixArg, nameArg, displayNameArg, avatarUrlArg, message.author.id, async (msg) => {
                await replyWithEmbed(message, 'info', msg);
            });
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
    run: async (interaction: ChatInputCommandInteraction, distube, client) => {
        try {
            await interaction.deferReply({ ephemeral: true });
            const token = interaction.options.getString('token', true);
            const prefixArg = interaction.options.getString('prefix') ?? '';
            const nameArg = interaction.options.getString('name') ?? '';
            const displayNameArg = interaction.options.getString('display_name') ?? '';
            const avatarUrlArg = interaction.options.getString('avatar') ?? '';
            await handleAddBot(token, prefixArg, nameArg, displayNameArg, avatarUrlArg, interaction.user.id, async (msg) => {
                await interaction.editReply(msg);
            });
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
};

export = addbot;

async function handleAddBot(
    token: string,
    prefixArg: string,
    nameArg: string,
    displayNameArg: string,
    avatarUrlArg: string,
    ownerId: string,
    sendMsg: (msg: string) => Promise<any>
) {
    try {
        const testClient = new Client({ intents: [GatewayIntentBits.Guilds] });
        try {
            await testClient.login(token);
            await testClient.destroy();
        } catch (err) {
            await sendMsg('❌ Token không hợp lệ hoặc đã bị thu hồi.');
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
            await sendMsg('❌ Không có bot mẫu để lấy thông tin mặc định.');
            return;
        }

        const name = nameArg || `[${prefix}] BuNgo Bot Music`;
        const displayName = displayNameArg || name;
        const avatarURL = avatarUrlArg || fallbackBot.avatarURL;

        const existingBot = await BotConfigModel.findOne({ prefix });
        if (existingBot) {
            await sendMsg(`⚠️ Bot với prefix "${prefix}" đã tồn tại.`);
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
        await sendMsg(`✅ Đã thêm bot mới với prefix \`${prefix}\`.`);
    } catch (err) {
        console.error(err);
        await sendMsg('❌ Có lỗi xảy ra khi thêm bot.');
    }
}