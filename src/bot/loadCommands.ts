// src/bot/loadCommands.ts
import { Collection } from 'discord.js';
import { Command } from '../@types/command';
import fs from 'fs';
import path from 'path';

export function loadCommands(commands: Collection<string, Command>) {
    const commandsPath = path.join(__dirname, '../commands');
    const files = fs.readdirSync(commandsPath);

    for (const file of files) {
        const command = require(`${commandsPath}/${file}`) as Command;
        if (command.name) {
            commands.set(command.name, command);
            if (command.aliases && command.aliases.length) {
                for (const alias of command.aliases) {
                    commands.set(alias, command);
                }
            }
        }
    }
}
