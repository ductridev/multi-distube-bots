// src/utils/loadCommands.ts
import fs from 'fs';
import path from 'path';
import { Collection } from 'discord.js';
import { Command, SlashCommand } from '../@types/command';

const commandsBasePath = path.resolve(__dirname, '../commands');

function getCommandFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    return entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return getCommandFiles(fullPath);
        }
        return entry.name.endsWith('.ts') || entry.name.endsWith('.js') ? [fullPath] : [];
    });
}

export const loadAllCommands = async (): Promise<Collection<string, Command>> => {
    const commands = new Collection<string, Command>();
    const files = getCommandFiles(commandsBasePath);

    for (const file of files) {
        try {
            const mod = await import(file);
            const command: Command = mod.default || mod;

            if (command?.name) {
                commands.set(command.name, command);
                if (command.aliases?.length) {
                    for (const alias of command.aliases) {
                        commands.set(alias, command);
                    }
                }
            }
        } catch (err) {
            console.warn(`⚠️ Failed to load legacy command: ${file}`, err);
        }
    }

    return commands;
}

export async function loadSlashCommands(): Promise<SlashCommand[]> {
    const files = getCommandFiles(commandsBasePath);
    const slashCommands: SlashCommand[] = [];

    for (const file of files) {
        try {
            const mod = await import(file);
            const command: SlashCommand = mod.default || mod;

            if (command?.data) {
                slashCommands.push(command);
            }
        } catch (err) {
            console.warn(`⚠️ Could not load slash command: ${file}`, err);
        }
    }

    return slashCommands;
}
