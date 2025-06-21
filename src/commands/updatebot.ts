// // src/commands/updatebot.ts
// /* 
//     Command: updatebot
//     Description: Updates bot name and avatar (only bot owner or admin bot).
//     Usage: b!updatebot @bot
//     Category: owner
//     Aliases: upd, updbot
// */

// import { Message } from 'discord.js';
// import { Command } from '../@types/command';
// import { BotConfigModel } from '../models/BotConfig';
// import { BotAdminModel } from '../models/BotAdmin';
// import DisTube from 'distube';

// const updatebot: Command = {
//     name: 'updatebot',
//     description: 'Cập nhật tên và avatar bot (chỉ chủ sở hữu hoặc admin bot).',
//     usage: 'b!updatebot @bot',
//     category: 'owner',
//     aliases: ['upd', 'updbot'],

//     execute: async (message: Message, args: string[], distube: DisTube) => {
//         const client = message.client;

//         // Get bot mention
//         const mentionedBot = message.mentions.users.find(user => user.bot);
//         const targetBot = mentionedBot ?? client.user;
//         const botName = targetBot?.username;

//         if (!botName) {
//             await message.reply('⚠️ Không thể xác định bot để cập nhật.');
//             return;
//         }

//         const botConfig = await BotConfigModel.findOne({ name: botName });
//         if (!botConfig) {
//             await message.reply('⚠️ Không tìm thấy cấu hình bot trong MongoDB.');
//             return;
//         }

//         // Check if user is bot owner (creator of this botConfig) or in BotAdmin list
//         const isOwner = message.author.id === botConfig.ownerId;
//         const isBotAdmin = await BotAdminModel.findOne({ userId: message.author.id });

//         if (!isOwner && !isBotAdmin) {
//             await message.reply('⛔ Bạn không có quyền cập nhật bot này.');
//             return;
//         }

//         const updates: string[] = [];

//         // Update username
//         if (botConfig.displayName && targetBot.username !== botConfig.displayName) {
//             try {
//                 await targetBot.setUsername(botConfig.displayName);
//                 updates.push(`✅ Đã cập nhật tên bot thành **${botConfig.displayName}**`);
//             } catch (err: any) {
//                 updates.push(`⚠️ Lỗi khi đổi tên bot: ${err.message}`);
//             }
//         } else {
//             updates.push('ℹ️ Tên bot không cần cập nhật.');
//         }

//         // Update avatar
//         if (botConfig.avatarURL) {
//             const currentAvatar = targetBot.displayAvatarURL({ extension: 'png', forceStatic: true });
//             if (!currentAvatar.includes(botConfig.avatarURL)) {
//                 try {
//                     await targetBot.setAvatar(botConfig.avatarURL);
//                     updates.push('✅ Đã cập nhật avatar bot.');
//                 } catch (err: any) {
//                     updates.push(`⚠️ Lỗi khi đổi avatar: ${err.message}`);
//                 }
//             } else {
//                 updates.push('ℹ️ Avatar bot không cần cập nhật.');
//             }
//         }

//         await message.reply(updates.join('\n'));
//     },
// };

// export = updatebot;