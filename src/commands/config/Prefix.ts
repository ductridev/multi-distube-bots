import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Prefix extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'prefix',
			description: {
				content: 'cmd.prefix.description',
				examples: ['prefix set !', 'prefix reset'],
				usage: 'prefix',
			},
			category: 'general',
			aliases: ['pf'],
			cooldown: 3,
			args: true,
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
				user: ['ManageGuild'],
			},
			slashCommand: true,
			options: [
				{
					name: 'set',
					description: 'cmd.prefix.options.set',
					type: 1,
					options: [
						{
							name: 'prefix',
							description: 'cmd.prefix.options.prefix',
							type: 3,
							required: true,
						},
					],
				},
				{
					name: 'reset',
					description: 'cmd.prefix.options.reset',
					type: 1,
				},
			],
		});
	}

	public async run(client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
		const embed = client.embed().setColor(this.client.color.main);
		const guildId = ctx.guild!.id;
		const botClientId = client.user!.id;
		const isInteraction = ctx.isInteraction;
		let subCommand: string | undefined;
		let prefix: string | undefined;

		if (isInteraction) {
			subCommand = ctx.options.getSubCommand();
			prefix = ctx.options.get('prefix')?.value?.toString();
		} else {
			subCommand = args[0] || '';
			prefix = args[1] || '';
		}

		const currentPrefix = await client.db.getPrefix(guildId, botClientId);

		switch (subCommand) {
			case 'set': {
				if (!prefix) {
					embed.setDescription(
						ctx.locale('cmd.prefix.messages.current_prefix', {
							prefix: currentPrefix,
						}),
					);
					return await ctx.sendMessage({ embeds: [embed] });
				}
				if (prefix.length > 3) {
					embed.setDescription(ctx.locale('cmd.prefix.errors.prefix_too_long'));
					return await ctx.sendMessage({ embeds: [embed] });
				}
				await client.db.setPrefix(guildId, botClientId, prefix);
				embed.setDescription(ctx.locale('cmd.prefix.messages.prefix_set', { prefix }));
				return await ctx.sendMessage({ embeds: [embed] });
			}
			case 'reset': {
				const defaultPrefix = client.childEnv.prefix;
				await client.db.setPrefix(guildId, botClientId, defaultPrefix);
				embed.setDescription(
					ctx.locale('cmd.prefix.messages.prefix_reset', {
						prefix: defaultPrefix,
					}),
				);
				return await ctx.sendMessage({ embeds: [embed] });
			}
			default: {
				embed.setDescription(
					ctx.locale('cmd.prefix.messages.current_prefix', {
						prefix: currentPrefix,
					}),
				);
				return await ctx.sendMessage({ embeds: [embed] });
			}
		}
	}
}


