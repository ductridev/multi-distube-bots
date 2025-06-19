// src/@types/extendedClient.d.ts or within a types folder
import { Client, Collection } from 'discord.js';
import { DisTube } from 'distube';
import { Command } from './command';

export default interface ExtendedClient extends Client<true> {
    commands: Collection<string, Command>;
    prefix: string;
    recentTracks: Map<string, string[]>;
    distube: DisTube;
}
