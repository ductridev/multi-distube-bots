// src/@types/command.d.ts
import { Message } from 'discord.js';
import { DisTube } from 'distube';

export interface Command {
    name: string;
    description: string;
    usage: string;
    category: 'all' | 'music' | 'help' | 'utility' | 'owner' | 'admin' = 'music';
    ownerOnly?: boolean = false;
    adminOnly?: boolean = false;
    aliases: string[];
    execute(message: Message, args: string[], distube: DisTube): Promise<void>;
}
