import { Command, type Context, type Lavamusic } from '../../structures/index';
import type { Requester } from '../../types';

export default class Grab extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'grab',
			description: {
				content: 'cmd.grab.description',
				examples: ['grab'],
				usage: 'grab',
			},
			category: 'music',
			aliases: ['gr'],
			cooldown: 3,
			args: false,
			vote: false,
			player: {
				voice: false,
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

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		const player = client.manager.getPlayer(ctx.guild!.id);

		await ctx.sendDeferMessage(ctx.locale('cmd.grab.loading'));

		const embed = this.client.embed().setFooter({
			text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
			iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
		})
			.setTimestamp()

		if (!player?.queue.current) {
			return await ctx.sendMessage({
				embeds: [
					embed.setColor(this.client.color.red).setDescription(ctx.locale('player.errors.no_song')),
				],
			});
		}

		const song = player.queue.current;

		const songInfo = ctx.locale('cmd.grab.content', {
			title: song.info.title,
			uri: song.info.uri,
			artworkUrl: song.info.artworkUrl,
			length: song.info.isStream ? 'LIVE' : client.utils.formatTime(song.info.duration),
			requester: (song.requester as Requester).id,
		});

		try {
			await ctx.author?.send({
				embeds: [
					this.client
						.embed()
						.setTitle(`**${song.info.title}**`)
						.setURL(song.info.uri!)
						.setThumbnail(song.info.artworkUrl!)
						.setDescription(songInfo)
						.setColor(this.client.color.main),
				],
			});

			return await ctx.editMessage({
				embeds: [embed.setDescription(ctx.locale('cmd.grab.check_dm')).setColor(this.client.color.green)],
			});
		} catch (_e) {
			return await ctx.editMessage({
				embeds: [embed.setDescription(ctx.locale('cmd.grab.dm_failed')).setColor(this.client.color.red)],
			});
		}
	}
}


