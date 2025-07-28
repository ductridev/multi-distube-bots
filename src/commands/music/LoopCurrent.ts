import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class LoopCurrent extends Command {
    constructor(client: Lavamusic) {
        super(client, {
            name: 'loopcurrent',
            description: {
                content: 'cmd.loop_current.description',
                examples: ['loopcurrent', 'lc'],
                usage: 'loopcurrent',
            },
            category: 'general',
            aliases: ['lc'],
            cooldown: 3,
            args: false,
            vote: false,
            player: {
                voice: true,
                dj: false,
                active: true,
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

    public async run(client: Lavamusic, ctx: Context, _args: string[]): Promise<any> {
        const embed = this.client.embed().setColor(this.client.color.main).setFooter({
            text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
            iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
        })
            .setTimestamp();
        const player = client.manager.getPlayer(ctx.guild!.id);
        let loopMessage = '';

        switch (player?.repeatMode) {
            case 'track': {
                player.setRepeatMode('off');
                loopMessage = ctx.locale('cmd.loop.looping_off');
                break;
            }
            default: {
                player!.setRepeatMode('track');
                loopMessage = ctx.locale('cmd.loop.looping_song');
                break;
            }
        }

        return await ctx.sendMessage({
            embeds: [embed.setDescription(loopMessage)],
        });
    }
}


