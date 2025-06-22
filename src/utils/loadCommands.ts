// src/utils/loadCommands.ts
import { Collection } from 'discord.js';
import { Command } from '../@types/command';
import fs from 'fs';
import path from 'path';

const commandsBasePath = path.resolve(__dirname, '../commands');

function getCommandFiles(dir: string, excludeHelp = false): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    return entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            return getCommandFiles(fullPath, excludeHelp);
        }

        const isCommandFile = entry.name.endsWith('.ts') || entry.name.endsWith('.js');

        return isCommandFile ? [fullPath] : [];
    });
}

export async function loadCommands(commands: Collection<string, Command>) {
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
            console.warn(`⚠️ Failed to load command: ${file}`, err);
        }
    }
}

export async function loadAllCommands(): Promise<Command[]> {
    const files = getCommandFiles(commandsBasePath, true);
    const commands: Command[] = [];

    for (const file of files) {
        try {
            const mod = await import(file);
            const command: Command = mod.default || mod;

            if (command?.name) {
                commands.push(command);
            }
        } catch (err) {
            console.warn(`⚠️ Could not import command: ${file}`, err);
        }
    }

    // Deduplicate by name (avoid alias duplication)
    return commands.filter((cmd, index, self) =>
        self.findIndex(c => c.name === cmd.name) === index
    );
}