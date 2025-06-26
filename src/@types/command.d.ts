// src/@types/command.d.ts
import { Message, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { DisTube } from 'distube';

export interface Command {
    name: string;
    description: string;
    usage: string;
    category: 'all' | 'music' | 'help' | 'utility' | 'owner' | 'admin' = 'music';
    ownerOnly?: boolean = false;
    adminOnly?: boolean = false;
    aliases: string[];
    data?: SlashCommandOptionsOnlyBuilder;
    run?: (interaction: ChatInputCommandInteraction, distube: DisTube, client: ExtendedClient) => Promise<void>;
    execute: (message: Message, args: string[], distube: DisTube, client: ExtendedClient) => Promise<void>;
}

export interface SlashCommand {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
    run: (interaction: ChatInputCommandInteraction, client: ExtendedClient) => Promise<void>;
}