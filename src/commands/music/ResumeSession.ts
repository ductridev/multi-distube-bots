import { Player, PlayerJson } from 'lavalink-client';
import { sessionMap } from '../..';
import { Command, type Context, type Lavamusic } from '../../structures/index';
import { VoiceChannel } from 'discord.js';

export default class ResumeSession extends Command {
    constructor(client: Lavamusic) {
        super(client, {
            name: 'resumesession',
            description: {
                content: 'cmd.resume.description',
                examples: ['resume'],
                usage: 'resume',
            },
            category: 'music',
            aliases: ['rsession', 'restore'],
            cooldown: 3,
            args: false,
            vote: false,
            player: {
                voice: true,
                dj: false,
                active: false,
                djPerm: null,
            },
            permissions: {
                dev: false,
                client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
                user: [],
            },
            slashCommand: true,
            options: [],
        });
    }

    public async run(client: Lavamusic, ctx: Context): Promise<any> {
        const embed = this.client.embed().setFooter({
            text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
            iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
        })
            .setTimestamp();

        const guildId = ctx.guild.id;
        const memberVoiceChannel = (ctx.member as any).voice.channel as VoiceChannel;
        if (!memberVoiceChannel) {
            return await ctx.sendMessage({
                embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.join.no_voice_channel'))],
            });
        }

        const guildMap = sessionMap.get(guildId);
        if (!guildMap) {
            return await ctx.sendMessage({
                embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.resume_session.no_session_found'))],
            });
        }

        for (const [vcKey, oldPlayer] of guildMap.entries()) {
            if (vcKey !== memberVoiceChannel.id) continue;

            try {
                let json: PlayerJson;
                if (typeof oldPlayer === 'string') json = JSON.parse(oldPlayer) as PlayerJson;
                else if (oldPlayer instanceof Player) json = (oldPlayer as Player).toJSON() as PlayerJson;
                else continue

                const player = client.manager.createPlayer({
                    ...json,
                });

                player.connect();
                if (json.queue?.current) player.queue.add(json.queue.current);

                if (json.queue?.tracks.length || 0 > 0) json.queue?.tracks.forEach((track) => player.queue.add(track));
                const playingIdx = json.queue?.tracks.findIndex((track) => track === json.queue?.current);
                // Get all tracks after the current track
                if (playingIdx !== -1)
                    json.queue?.tracks.slice(playingIdx).forEach((track) => player.queue.add(track));

                guildMap.set(memberVoiceChannel.id, player);
                if (!player.paused && player.queue.tracks.length > 0) player.play();
                return await ctx.sendMessage({
                    embeds: [embed.setColor(this.client.color.green).setDescription(ctx.locale('cmd.resume_session.resumed'))],
                });
            } catch (err) {
                console.error('[RESUME ERROR]', err);
                return await ctx.sendMessage({
                    embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.resume_session.resume_failed'))],
                });
            }
        }

        return await ctx.sendMessage({
            embeds: [embed.setColor(this.client.color.yellow).setDescription(ctx.locale('cmd.resume_session.no_session_found'))],
        });
    }
}
