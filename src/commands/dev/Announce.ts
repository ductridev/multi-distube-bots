import { Player } from 'lavalink-client';
import { sessionMap } from '../..';
import { Command, type Context, type Lavamusic } from '../../structures/index';
import { EmbedBuilder, TextChannel } from 'discord.js';

export default class Announce extends Command {
    constructor(client: Lavamusic) {
        super(client, {
            name: 'announce',
            description: {
                content: 'Send a message to all active player text channels.',
                examples: ['announce Hello! We are updating!'],
                usage: 'announce <message>',
            },
            category: 'dev',
            aliases: ['broadcast'],
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

    public async run(client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
        let content = args.join(' ');
        if (!content) content = ctx.locale('cmd.announce.messages.default_content');

        const embed = new EmbedBuilder()
            .setColor(this.client.color.main)
            .setTitle('📢 Announcement')
            .setDescription(content)
            .setFooter({
                text: `Sent by ${client.user?.tag} • BuNgo Music Bot 🎵`,
                iconURL: client.user?.displayAvatarURL() || undefined,
            })
            .setTimestamp();

        let sentCount = 0;
        for (const guildMap of sessionMap.values()) {
            for (const player of guildMap.values()) {
                try {
                    const channel = client.channels.cache.get((player as Player)!.textChannelId!);
                    if (channel && channel.isTextBased() && (channel as TextChannel).viewable && (channel as TextChannel).permissionsFor(client.user!)?.has(['SendMessages', 'EmbedLinks'])) {
                        await (channel as TextChannel).send({ embeds: [embed] });
                        sentCount++;
                    }
                } catch (e) {
                    console.warn(`Failed to send announcement to ${(player as Player).textChannelId}:`, e);
                }
            }
        }

        return ctx.sendMessage(`✅ Announcement sent to ${sentCount} channel(s).`);
    }
}
