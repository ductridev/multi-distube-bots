import { Player } from 'lavalink-client';
import { sessionMap } from '../..';
import { Command, type Context, type Lavamusic } from '../../structures/index';
import { saveSessions } from '../../utils/functions/saveSessionsOnExit';

export default class SaveSession extends Command {
    constructor(client: Lavamusic) {
        super(client, {
            name: 'savesession',
            description: {
                content: 'Save all active player sessions to the database or cache.',
                examples: ['savesession'],
                usage: 'savesession',
            },
            category: 'dev',
            aliases: ['ssave'],
            cooldown: 3,
            args: false,
            player: {
                voice: false,
                dj: false,
                active: false,
                djPerm: null,
            },
            permissions: {
                dev: true,
                client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
                user: [],
            },
            slashCommand: false,
            options: [],
        });
    }

    public async run(client: Lavamusic, ctx: Context): Promise<any> {
        let saved = 0;
        let failed = 0;
        const embed = this.client.embed().setFooter({
            text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
            iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
        })
            .setTimestamp();

        for (const guildMap of sessionMap.values()) {
            for (const player of guildMap.values()) {
                try {
                    await client.playerSaver!.set((player as Player).guildId, JSON.stringify((player as Player).toJSON()));
                    saved++;
                } catch (e) {
                    console.warn(`Failed to save player for guild ${(player as Player).guildId}`, e);
                    failed++;
                }
            }
        }

        saveSessions();

        return await ctx.sendMessage({
            embeds: [embed.setColor(this.client.color.blue).setDescription(ctx.locale('cmd.save_session.saved', { saved, failed }))],
        });
    }
}
