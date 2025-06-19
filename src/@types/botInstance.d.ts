import { Client } from "discord.js";
import DisTube from "distube";

export default interface BotInstance {
    name: string;
    client: Client;
    distube: DisTube;
    currentVoiceChannelId?: string;
}
