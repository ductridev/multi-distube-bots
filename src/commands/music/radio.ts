// // src/commands/radio.js
// /* 
//     Command: radio
//     Description: Plays a radio station.
//     Usage: b!radio <radio name or URL>
//     Category: music
//     Aliases: r, rad
// */

// import { Command } from '../@types/command';
// import { GuildTextBasedChannel, Message } from 'discord.js';
// import { replyWithEmbed } from '../utils/embedHelper';

// const radio: Command = {
//   name: 'radio',
//   description: 'Phát radio.',
//   usage: 'b!radio <radio name or URL>',
//   category: 'music',
//   aliases: ['r', 'rad'],
//   async execute(message: Message, args: string[], distube) {
//     const query = args.join(' ');
//     if (!query) {
//       await replyWithEmbed(message, 'error', 'Vui lòng nhập tên đài hoặc URL radio.');
//       return;
//     }

//     const vc = message.member?.voice.channel;
//     if (!vc) {
//       await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
//       return;
//     }

//     try {
//       await distube.play(vc, query, {
//         member: message.member!,
//         textChannel: message.channel as GuildTextBasedChannel,
//       });
//       await replyWithEmbed(message, 'success', '📻 Đang phát radio.');
//     } catch (err) {
//       console.error('Lỗi phát radio:', err);
//       await replyWithEmbed(message, 'error', 'Không thể phát radio.');
//     }
//   },
// };

// export = radio;
