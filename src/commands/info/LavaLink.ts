import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class LavaLink extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'lavalink',
			description: {
				content: 'cmd.lavalink.description',
				examples: ['lavalink'],
				usage: 'lavalink',
			},
			category: 'info',
			aliases: ['ll'],
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
		const nodes = client.manager.nodeManager.nodes;
		const nodesPerPage = 2;

		const nodeArray = Array.from(nodes.values());
		const chunks = client.utils.chunk(nodeArray, nodesPerPage);

		if (chunks.length === 0) chunks.push(nodeArray);

		const pages = chunks.map(async (chunk, index) => {
			const embed = this.client
				.embed()
				.setTitle(ctx.locale('cmd.lavalink.title'))
				.setColor(this.client.color.main)
				.setThumbnail(client.user?.avatarURL()!)
				.setFooter({
					text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
					iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
				})
				.setTimestamp();

			for (const node of chunk) {
				try {
					const statusEmoji = node.stats ? '🟢' : '🔴';
					const stats = node.stats || {
						players: 0,
						playingPlayers: 0,
						uptime: 0,
						cpu: { cores: 0, systemLoad: 0, lavalinkLoad: 0 },
						memory: { used: 0, reservable: 0 },
					};

					const nodeInfo = await node.fetchInfo();
					const plugin = nodeInfo.plugins;

					embed.addFields({
						name: `${node.id} (${statusEmoji})`,
						value: `\`\`\`yaml\n${ctx.locale('cmd.lavalink.content', {
							players: stats.players,
							playingPlayers: stats.playingPlayers,
							uptime: client.utils.formatTime(stats.uptime),
							cores: stats.cpu.cores,
							used: client.utils.formatBytes(stats.memory.used),
							reservable: client.utils.formatBytes(stats.memory.reservable),
							systemLoad: (stats.cpu.systemLoad * 100).toFixed(2),
							lavalinkLoad: (stats.cpu.lavalinkLoad * 100).toFixed(2),
							plugins: Array.isArray(plugin)
								? plugin
									.filter(p => p && typeof p.name === 'string' && typeof p.version === 'string')
									.map(p => `${p.name} v${p.version}`)
									.join(', ')
								: 'No plugins',
						})}\n\`\`\``,
					});
				} catch (e) {
					client.logger.error(e);
				}
			}

			embed.setFooter({
				text: ctx.locale('cmd.lavalink.page_info', {
					index: index + 1,
					total: chunks.length,
				}) + " • BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg"
			});

			return embed;
		});
		const finishedPages = await Promise.all(pages);
		return await client.utils.paginate(client, ctx, finishedPages);
	}
}


