import fs from 'fs/promises';
import path from 'path';
import { sessionMap } from '../..';
import { Player } from 'lavalink-client';

export const saveSessions = async () => {
    const out: Record<string, Record<string, string>> = {};

    for (const [guildId, guildMap] of sessionMap.entries()) {
        for (const [vcId, player] of guildMap.entries()) {
            if (player instanceof Player) {
                if(typeof out[guildId] === 'undefined') out[guildId] = {};
                out[guildId][vcId] = JSON.stringify(player.toJSON());
            }
        }
    }

    const filePath = path.resolve(`${process.cwd()}/sessions-map.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(out, null, 2));
    console.log(`[SAVE] Sessions saved`);
};