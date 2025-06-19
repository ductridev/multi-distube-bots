// src/@types/command.d.ts
import { Message } from 'discord.js';
import { DisTube } from 'distube';

export interface Command {
    name: string;
    description: string;
    usage: string;
    category: 'music' | 'help' | 'utility' = 'music';
    aliases: string[];
    execute(message: Message, args: string[], distube: DisTube): Promise<void>;
}
