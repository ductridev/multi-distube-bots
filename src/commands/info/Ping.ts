import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Ping extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'ping',
			description: {
				content: 'cmd.ping.description',
				examples: ['ping'],
				usage: 'ping',
			},
			category: 'general',
			aliases: ['pong'],
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
		// Send a message if in maintain mode
		if (client.config.maintenance) {
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

			// Show local maintenance mode
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

			await ctx.sendMessage({ embeds: [embed] });
		}

		// END: Send a message if in maintain mode

		// Send a deferred message
		const startTime = Date.now();
		await ctx.sendDeferMessage(ctx.locale('cmd.ping.content'));

		// Calculate latencies
		const botLatency = Date.now() - startTime;
		const apiLatency = Math.round(ctx.client.ws.ping);

		// Embed styling
		const embed = this.client.embed()
			.setAuthor({
				name: 'Pong!',
				iconURL: client.user?.displayAvatarURL(),
			})
			.setColor(this.client.color.main)
			.addFields([
				{
					name: ctx.locale('cmd.ping.bot_latency'),
					value: `\`\`\`diff\n+ ${botLatency}ms\n\`\`\``, // Always positive latency
					inline: true,
				},
				{
					name: ctx.locale('cmd.ping.api_latency'),
					value: `\`\`\`diff\n+ ${apiLatency}ms\n\`\`\``, // Always positive latency
					inline: true,
				},
			])
			.setFooter({
				text: ctx.locale('cmd.ping.requested_by', { author: ctx.author?.tag }) + " • BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
			})
			.setTimestamp();

		// Voice connection check
		const player = client.manager?.players?.get(ctx.guild.id);
		if (player && player.connected) {
			const voiceLatency = player.ping ?? 'Unknown';
			const vcRegion = player.voice.endpoint ?? 'Unknown';

			const lavalinkPing = voiceLatency?.lavalink ?? 'Unknown';
			const wsPing = voiceLatency?.ws ?? 'Unknown';

			embed.addFields([
				{
					name: ctx.locale('cmd.ping.vc_latency') ?? 'Voice Latency',
					value: `\`\`\`diff\n+ Lavalink: ${lavalinkPing}ms\n+ WebSocket: ${wsPing}ms\n\`\`\``,
					inline: true,
				},
				{
					name: ctx.locale('cmd.ping.vc_region') ?? 'VC Region',
					value: `\`\`\`diff\n+ ${vcRegion}\n\`\`\``,
					inline: true,
				},
			]);
		}

		// Send back the result
		return await ctx.editMessage({ content: '', embeds: [embed] });
	}
}


