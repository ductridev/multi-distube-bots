import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class MaintainInfo extends Command {
    constructor(client: Lavamusic) {
        super(client, {
            name: 'maintaininfo',
            description: {
                content: 'Show current maintenance status.',
                examples: ['maintaininfo'],
                usage: 'maintaininfo',
            },
            category: 'general',
            aliases: ['maintain', 'maintenance', 'maintstatus', 'status'],
            cooldown: 3,
            args: false,
            vote: false,
            player: {
                voice: false,
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
        const embed = this.client.embed()
            .setAuthor({
                name: ctx.locale('maintenance.status_title'),
                iconURL: client.user?.displayAvatarURL(),
            })
            .setColor(this.client.color.main)
            .setFooter({
                text: ctx.locale('maintenance.requested_by', { author: ctx.author?.tag }) + " • BuNgo Music Bot 🎵",
                iconURL: client.user?.displayAvatarURL() ?? "",
            })
            .setTimestamp();

        // Show maintenance mode
        const isLocal = this.client.config?.maintenance ?? false;
        embed.addFields({
            name: ctx.locale('maintenance.field_title'),
            value: isLocal
                ? ctx.locale('maintenance.local_field_enabled')
                : ctx.locale('maintenance.local_field_disabled'),
            inline: true,
        });

        // If using sharding, show global maintenance info
        if (client.shard) {
            try {
                const results = await client.shard.broadcastEval(
                    (c) => {
                        const typed = c as any;
                        return typed.config?.maintenance ?? false;
                    }
                );

                const count = results.filter(Boolean).length;
                const total = results.length;

                embed.addFields({
                    name: ctx.locale('maintenance.field_title'),
                    value:
                        count > 0
                            ? ctx.locale('maintenance.global_field_value_enabled', { count, total })
                            : ctx.locale('maintenance.global_field_value_disabled'),
                    inline: true,
                });
            } catch (error) {
                embed.addFields({
                    name: ctx.locale('maintenance.field_title'),
                    value: ctx.locale('maintenance.global_field_fetch_failed'),
                    inline: true,
                });
            }
        }

        return await ctx.sendMessage({ embeds: [embed] });
    }
}
