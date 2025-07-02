// src/@types/extendedClient.d.ts or within a types folder
import { Client, Collection } from 'discord.js';
import { DisTube } from 'distube';
import { Command } from './command';

export default interface ExtendedClient extends Client<true> {
    commands: Collection<string, Command>;
    prefix: string;
    recentTracks: Map<string, string[]>;
    distube: DisTube;
    voiceChannelMap: Map<string, string>;
    noSongTimeouts: Map<string, NodeJS.Timeout>;
    noListenerTimeouts: Map<string, NodeJS.Timeout>;
    noPlayWarningTimeouts: Map<string, NodeJS.Timeout>;
}
