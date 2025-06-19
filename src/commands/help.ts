// src/commands/help.ts
/*
    Command: help
    Description: Display a list of commands or information about a specific command.
    Usage: b!help [command name]
    Category: help
    Aliases: h
*/

import { Command } from '../@types/command';
import { Message, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { replyWithEmbed, replyEmbedWFooter } from '../utils/embedHelper';

const help: Command = {
    name: 'help',
    description: 'Hiển thị danh sách lệnh hoặc thông tin chi tiết về một lệnh.',
    usage: 'b!help [tên lệnh]',
    category: 'help',
    aliases: ['h'],

    async execute(message: Message, args: string[]) {
        const commandDir = path.resolve(__dirname);
        const files = fs.readdirSync(commandDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

        const commands: Command[] = [];

        for (const file of files) {
            if (file.startsWith('help')) continue;

            const filePath = path.join(commandDir, file);
            const mod = await import(filePath);
            const cmd: Command = mod.default || mod;

            if (cmd?.name) commands.push(cmd);
        }

        // === Show command details ===
        if (args.length) {
            const name = args[0].toLowerCase();
            const cmd = commands.find(c =>
                c.name.toLowerCase() === name || (c.aliases?.map(a => a.toLowerCase()).includes(name))
            );

            if (!cmd) {
                await replyEmbedWFooter(message, new EmbedBuilder()
                    .setTitle('❌ Không tìm thấy lệnh')
                    .setDescription(`Không có lệnh tên \`${name}\`. Hãy dùng \`b!help\` để xem danh sách.`)
                    .setColor(0xff5555)
                );
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(`📘 Chi tiết lệnh \`${cmd.name}\``)
                .addFields(
                    { name: '📄 Mô tả', value: cmd.description || 'Không có mô tả.' },
                    { name: '🔧 Cách dùng', value: `\`${cmd.usage || 'Không có thông tin.'}\`` },
                    {
                        name: '🧩 Alias',
                        value: cmd.aliases?.length ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'Không có',
                    }
                )
                .setColor(0x00bfff);

            await replyEmbedWFooter(message, embed);
            return;
        }

        // === General help list ===
        // Only show unique commands (not alias duplicates)
        const uniqueCommands = commands.filter((cmd, index, self) =>
            self.findIndex(c => c.name === cmd.name) === index
        );

        const commandList = uniqueCommands
            .map(cmd => {
                return `🔹 \`${cmd.name}\` - ${cmd.description || 'Không có mô tả.'}`;
            })
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle('📚 Danh sách các lệnh có sẵn')
            .setDescription('Dùng `b!help <tên lệnh>` để xem chi tiết.')
            .setColor(0x00bfff)
            .addFields({
                name: 'Lệnh:',
                value: commandList,
                inline: false,
            });

        await replyEmbedWFooter(message, embed);
    },
};

export = help;
