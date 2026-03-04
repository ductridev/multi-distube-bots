import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Live extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'livelyrics',
			description: {
				content: 'cmd.livelyrics.description',
				examples: ['livelyrics'],
				usage: 'livelyrics',
			},
			category: 'music',
			aliases: ['karaoke', 'syncedlyrics', 'lyricslive'],
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
			options: [],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		const player = client.manager.getPlayer(ctx.guild!.id);
		if (!player) {
			return await ctx.sendMessage(ctx.locale('LIVE_LYRICS.NO_PLAYER'));
		}

		const embed = this.client.embed().setFooter({
			text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
			iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
		}).setTimestamp();

		// Check if there's a current track
		const track = player.queue.current;
		if (!track) {
			return await ctx.sendMessage(ctx.locale('LIVE_LYRICS.NO_PLAYER'));
		}

		// Check if session already exists
		if (client.liveLyricsService?.hasSession(ctx.guild!.id)) {
			return await ctx.sendMessage({
				embeds: [embed
					.setColor(client.color.yellow)
					.setDescription(ctx.locale('LIVE_LYRICS.ALREADY_RUNNING'))
				]
			});
		}

		await ctx.sendDeferMessage(ctx.locale('LIVE_LYRICS.SEARCHING'));

		try {
			// Fetch synced lyrics
			const lyricsResult = await player.getCurrentLyrics(true);

			// Check if we have synced lyrics (lines with timestamps)
			if (!lyricsResult || !lyricsResult.lines?.length) {
				return await ctx.editMessage({
					embeds: [embed
						.setColor(client.color.yellow)
						.setTitle(ctx.locale('LIVE_LYRICS.NO_SYNCED_TITLE'))
						.setDescription(ctx.locale('LIVE_LYRICS.NO_SYNCED_DESCRIPTION', {
							prefix: client.env.GLOBAL_PREFIX,
						}))
						.setThumbnail(track.info.artworkUrl)
					],
				});
			}

			// Check if lyrics have timestamps (synced)
			const hasTimestamps = lyricsResult.lines.some(
				(line) => line.timestamp !== null && line.timestamp !== undefined
			);

			if (!hasTimestamps) {
				return await ctx.editMessage({
					embeds: [embed
						.setColor(client.color.yellow)
						.setTitle(ctx.locale('LIVE_LYRICS.NO_SYNCED_TITLE'))
						.setDescription(ctx.locale('LIVE_LYRICS.NO_SYNCED_DESCRIPTION', {
							prefix: client.env.GLOBAL_PREFIX,
						}))
						.setThumbnail(track.info.artworkUrl)
					],
				});
			}

			// Start live lyrics session
			const message = await client.liveLyricsService!.startSession(
				player,
				ctx.channelId,
				lyricsResult
			);

			if (!message) {
				return await ctx.editMessage({
					embeds: [embed
						.setColor(client.color.red)
						.setDescription(ctx.locale('LIVE_LYRICS.ERROR'))
					],
				});
			}

			// Delete the deferred message since we created a new one
			await ctx.editMessage({
				embeds: [embed
					.setColor(client.color.main)
					.setDescription(ctx.locale('LIVE_LYRICS.STARTED'))
				],
			});

			// Remove the "started" message after a few seconds
			setTimeout(async () => {
				try {
					if (ctx.msg?.deletable) {
						await ctx.msg.delete().catch(() => null);
					}
				} catch {
					// Ignore errors
				}
			}, 3000);

		} catch (error) {
			client.logger.error('Live lyrics error:', error);
			await ctx.editMessage({
				embeds: [embed
					.setColor(client.color.red)
					.setDescription(ctx.locale('LIVE_LYRICS.ERROR'))
				],
			});
		}
	}
}
