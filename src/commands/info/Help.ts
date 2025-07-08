import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Help extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'help',
			description: {
				content: 'cmd.help.description',
				examples: ['help'],
				usage: 'help',
			},
			category: 'info',
			aliases: ['h'],
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
			options: [
				{
					name: 'command',
					description: 'cmd.help.options.command',
					type: 3,
					required: false,
				},
			],
		});
	}

	public async run(client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
		const embed = this.client.embed().setFooter({
			text: "BuNgo Music Bot 🎵 • Maded by Tổ Rắm Độc with ♥️",
			iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
		})
			.setTimestamp();
		const botClientId = client.user!.id;
		const guildId = ctx.guild!.id;
		const commands = this.client.commands.filter(cmd => cmd.category !== 'dev');
		const categories = [...new Set(commands.map(cmd => cmd.category))];
		const currentPrefix = await client.db.getPrefix(guildId, botClientId);

		if (args[0]) {
			const command = this.client.commands.get(args[0].toLowerCase());
			if (!command) {
				return await ctx.sendMessage({
					embeds: [
						embed.setColor(this.client.color.red).setDescription(
							ctx.locale('cmd.help.not_found', {
								cmdName: args[0],
							}),
						),
					],
				});
			}
			const helpEmbed = embed
				.setColor(client.color.main)
				.setTitle(`${ctx.locale('cmd.help.title')} - ${command.name}`)
				.setDescription(
					ctx.locale('cmd.help.help_cmd', {
						description: ctx.locale(command.description.content),
						usage: `${currentPrefix}${command.description.usage}`,
						examples: command.description.examples.map((example: string) => `${currentPrefix}${example}`).join(', '),
						aliases: command.aliases.map((alias: string) => `\`${alias}\``).join(', '),
						category: command.category,
						cooldown: command.cooldown,
						premUser:
							command.permissions.user.length > 0
								? command.permissions.user.map((perm: string) => `\`${perm}\``).join(', ')
								: 'None',
						premBot: command.permissions.client.map((perm: string) => `\`${perm}\``).join(', '),
						dev: command.permissions.dev ? 'Yes' : 'No',
						slash: command.slashCommand ? 'Yes' : 'No',
						args: command.args ? 'Yes' : 'No',
						player: command.player.active ? 'Yes' : 'No',
						dj: command.player.dj ? 'Yes' : 'No',
						djPerm: command.player.djPerm ? command.player.djPerm : 'None',
						voice: command.player.voice ? 'Yes' : 'No',
					}),
				).setFooter({
					text: "BuNgo Music Bot 🎵 • Maded by Tổ Rắm Độc with ♥️",
					iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
				})
				.setTimestamp();
			return await ctx.sendMessage({ embeds: [helpEmbed] });
		}

		const fields = categories.map(category => ({
			name: category,
			value: commands
				.filter(cmd => cmd.category === category)
				.map(cmd => `\`${cmd.name}\``)
				.join(', '),
			inline: false,
		}));

		const helpEmbed = embed
			.setColor(client.color.main)
			.setTitle(ctx.locale('cmd.help.title'))
			.setDescription(
				ctx.locale('cmd.help.content', {
					bot: client.user?.username,
					prefix: currentPrefix,
				}),
			)
			.setFooter({
				text: ctx.locale('cmd.help.footer', { prefix: currentPrefix }),
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg"
			})
			.addFields(...fields);

		return await ctx.sendMessage({ embeds: [helpEmbed] });
	}
}


