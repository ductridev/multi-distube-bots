import type { AutocompleteInteraction } from 'discord.js';
import { Command, type Context, type Lavamusic } from '../../structures/index';

const regionEmojis: Record<string, string> = {
	EU: '🇪🇺',
	VN: '🇻🇳',
	US: '🇺🇸',
	JP: '🇯🇵',
	KR: '🇰🇷',
	SG: '🇸🇬',
	AU: '🇦🇺',
};

function getRegionEmoji(region: string): string {
	return regionEmojis[region.toUpperCase()] || '🌐';
}

function getRegionGroups(client: Lavamusic): Map<string, import('lavalink-client').LavalinkNode[]> {
	const groups = new Map<string, import('lavalink-client').LavalinkNode[]>();
	for (const [, node] of client.manager.nodeManager.nodes) {
		if (!node.connected) continue;
		const group = (node.options as any).regionGroup?.toUpperCase() || 'Unknown';
		if (!groups.has(group)) groups.set(group, []);
		groups.get(group)!.push(node);
	}
	return groups;
}

function getNodeRegionGroup(node: import('lavalink-client').LavalinkNode): string {
	return (node.options as any).regionGroup?.toUpperCase() || 'Unknown';
}

export default class Region extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'region',
			description: {
				content: 'cmd.region.description',
				examples: ['region', 'region VN', 'region EU'],
				usage: 'region [region]',
			},
			category: 'music',
			aliases: ['rg', 'node'],
			cooldown: 5,
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
			options: [
				{
					name: 'region',
					description: 'cmd.region.options.region',
					type: 3,
					required: false,
					autocomplete: true,
				},
			],
		});
	}

	public async run(client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
		const player = client.manager.getPlayer(ctx.guild!.id);
		if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'));

		const embed = client.embed()
			.setFooter({
				text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
			})
			.setTimestamp();

		let targetRegion: string | undefined;
		if (ctx.isInteraction) {
			targetRegion = (ctx.options.get('region', false)?.value as string | undefined)?.toUpperCase();
		} else {
			targetRegion = args[0]?.toUpperCase();
		}

		const regionGroups = getRegionGroups(client);
		const currentRegion = getNodeRegionGroup(player.node);

		if (!targetRegion) {
			// Info mode: show current node + available regions
			embed.setColor(client.color.main)
				.setTitle(ctx.locale('cmd.region.info_title'))
				.setDescription(ctx.locale('cmd.region.current_region', {
					nodeId: player.node.id,
					region: `${getRegionEmoji(currentRegion)} ${currentRegion}`,
					ping: player.ping.lavalink ?? '?',
				}));

			for (const [group, nodes] of regionGroups) {
				const totalPlayers = nodes.reduce((sum, n) => sum + (n.stats?.players ?? 0), 0);
				const isCurrent = group === currentRegion;

				embed.addFields({
					name: `${getRegionEmoji(group)} ${group}${isCurrent ? ctx.locale('cmd.region.current_indicator') : ''}`,
					value: ctx.locale('cmd.region.region_field', {
						nodeCount: nodes.length,
						playerCount: totalPlayers,
						nodes: nodes.map(n => `\`${n.id}\``).join(', '),
					}),
					inline: true,
				});
			}

			return await ctx.sendMessage({ embeds: [embed] });
		}

		// Switch mode
		if (!regionGroups.has(targetRegion)) {
			const available = Array.from(regionGroups.keys())
				.map(r => `${getRegionEmoji(r)} \`${r}\``)
				.join(', ');
			embed.setColor(client.color.red)
				.setDescription(ctx.locale('cmd.region.invalid_region', {
					region: targetRegion,
					available,
				}));
			return await ctx.sendMessage({ embeds: [embed] });
		}

		if (targetRegion === currentRegion) {
			embed.setColor(client.color.main)
				.setDescription(ctx.locale('cmd.region.already_on_region', {
					region: `${getRegionEmoji(currentRegion)} ${currentRegion}`,
					nodeId: player.node.id,
				}));
			return await ctx.sendMessage({ embeds: [embed] });
		}

		const targetNodes = regionGroups.get(targetRegion)!
			.filter(n => n.id !== player.node.id)
			.sort((a, b) => (a.stats?.players ?? 0) - (b.stats?.players ?? 0));

		if (targetNodes.length === 0) {
			embed.setColor(client.color.red)
				.setDescription(ctx.locale('cmd.region.no_nodes_in_region', {
					region: `${getRegionEmoji(targetRegion)} ${targetRegion}`,
				}));
			return await ctx.sendMessage({ embeds: [embed] });
		}

		const oldNodeId = player.node.id;
		const oldPing = player.ping.lavalink ?? '?';
		const bestNode = targetNodes[0];

		try {
			await player.changeNode(bestNode.id);

			embed.setColor(client.color.green)
				.setDescription(ctx.locale('cmd.region.switched', {
					region: `${getRegionEmoji(targetRegion)} ${targetRegion}`,
					oldNode: oldNodeId,
					newNode: bestNode.id,
					oldPing,
					newPing: player.ping.lavalink ?? '?',
				}));
			return await ctx.sendMessage({ embeds: [embed] });
		} catch {
			embed.setColor(client.color.red)
				.setDescription(ctx.locale('cmd.region.switch_failed'));
			return await ctx.sendMessage({ embeds: [embed] });
		}
	}

	public async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const focusedValue = interaction.options.getFocused().toUpperCase();
		const client = this.client;
		const regionGroups = getRegionGroups(client);

		const choices = Array.from(regionGroups.keys()).map(region => ({
			name: `${getRegionEmoji(region)} ${region} (${regionGroups.get(region)!.length} node${regionGroups.get(region)!.length > 1 ? 's' : ''})`,
			value: region,
		}));

		const filtered = choices.filter(c => c.value.includes(focusedValue) || c.name.toUpperCase().includes(focusedValue));
		await interaction.respond(filtered.slice(0, 25)).catch(console.error);
	}
}
