import os from 'node:os';
import { version } from 'discord.js';
import { showTotalMemory, usagePercent } from 'node-system-stats';
import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Botinfo extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'botinfo',
			description: {
				content: 'cmd.botinfo.description',
				examples: ['botinfo'],
				usage: 'botinfo',
			},
			category: 'info',
			aliases: ['bi', 'info', 'stats', 'status'],
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
		const osInfo = `${os.type()} ${os.release()}`;
		const osUptime = client.utils.formatTime(os.uptime());
		const osHostname = os.hostname();
		const cpuInfo = `${os.arch()} (${os.cpus().length} cores)`;
		const cpuUsed = (await usagePercent({ coreIndex: 0, sampleMs: 2000 })).percent;
		const memTotal = showTotalMemory(true);
		const memUsed = (process.memoryUsage().rss / 1024 ** 2).toFixed(2);
		const nodeVersion = process.version;
		const discordJsVersion = version;
		const commands = client.commands.size;

		let guilds = 0;
		let users = 0;
		let channels = 0;

		if (client.shard) {
			const [guildCounts, memberCounts, channelCounts] = await Promise.all([
				client.shard.broadcastEval(c => c.guilds.cache.size),
				client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)),
				client.shard.broadcastEval(c => c.channels.cache.size),
			]);

			guilds = guildCounts.reduce((acc, count) => acc + count, 0);
			users = memberCounts.reduce((acc, count) => acc + count, 0);
			channels = channelCounts.reduce((acc, count) => acc + count, 0);
		} else {
			guilds = client.guilds.cache.size;
			users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
			channels = client.channels.cache.size;
		}

		const botInfo = ctx.locale('cmd.botinfo.content', {
			osInfo,
			osUptime,
			osHostname,
			cpuInfo,
			cpuUsed,
			memUsed,
			memTotal,
			nodeVersion,
			discordJsVersion,
			guilds,
			channels,
			users,
			commands,
		});

		const embed = this.client.embed()
			.setColor(this.client.color.main)
			.setDescription(botInfo)
			.setFooter({
				text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
			})
			.setTimestamp();

		await ctx.sendMessage({
			embeds: [embed],
		});
	}
}


