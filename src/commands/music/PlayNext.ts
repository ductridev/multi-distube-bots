import type { ApplicationCommandOptionChoiceData, AutocompleteInteraction, VoiceChannel } from 'discord.js';
import type { SearchResult } from 'lavalink-client';
import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class PlayNext extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'playnext',
			description: {
				content: 'cmd.playnext.description',
				examples: [
					'playnext example',
					'playnext https://www.youtube.com/watch?v=example',
					'playnext https://open.spotify.com/track/example',
					'playnext http://www.example.com/example.mp3',
				],
				usage: 'playnext <song>',
			},
			category: 'music',
			aliases: ['insert', 'pn'],
			cooldown: 0,
			args: true,
			vote: false,
			player: {
				voice: true,
				dj: false,
				active: false,
				djPerm: null,
			},
			permissions: {
				dev: false,
				client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks', 'Connect', 'Speak'],
				user: [],
			},
			slashCommand: true,
			options: [
				{
					name: 'song',
					description: 'cmd.playnext.options.song',
					type: 3,
					required: true,
					autocomplete: true,
				},
			],
		});
	}

	public async run(client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
		const query = args.join(' ');
		let player = client.manager.getPlayer(ctx.guild!.id);
		const memberVoiceChannel = (ctx.member as any).voice.channel as VoiceChannel;

		if (!player)
			player = client.manager.createPlayer({
				guildId: ctx.guild!.id,
				voiceChannelId: memberVoiceChannel.id,
				textChannelId: ctx.channel.id,
				selfMute: false,
				selfDeaf: true,
				vcRegion: memberVoiceChannel.rtcRegion!,
			});
		if (!player.connected) await player.connect();

		await ctx.sendDeferMessage(ctx.locale('cmd.playnext.loading'));

		const response = (await player.search({ query: query }, ctx.author)) as SearchResult;
		const embed = this.client.embed().setFooter({
				text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
			})
			.setTimestamp();

		if (!response || response.tracks?.length === 0) {
			return await ctx.editMessage({
				content: '',
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.play.errors.search_error'))],
			});
		}
		await player.queue.splice(0, 0, response.loadType === 'playlist' ? response.tracks : response.tracks[0]);

		if (response.loadType === 'playlist') {
			await ctx.editMessage({
				content: '',
				embeds: [
					embed
						.setColor(this.client.color.main)
						.setDescription(ctx.locale('cmd.playnext.added_playlist_to_play_next', { length: response.tracks.length })),
				],
			});
		} else {
			await ctx.editMessage({
				content: '',
				embeds: [
					embed.setColor(this.client.color.main).setDescription(
						ctx.locale('cmd.playnext.added_to_play_next', {
							title: response.tracks[0].info.title,
							uri: response.tracks[0].info.uri,
						}),
					),
				],
			});
		}
		if (!player.playing && player.queue.tracks.length > 0) await player.play({ paused: false });
	}
	public async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const focusedValue = interaction.options.getFocused(true);

		if (!focusedValue?.value.trim()) {
			return interaction.respond([]);
		}

		const res = await this.client.manager.search(focusedValue.value.trim(), interaction.user);
		const songs: ApplicationCommandOptionChoiceData[] = [];

		if (res.loadType === 'search') {
			res.tracks.slice(0, 10).forEach(track => {
				const name = `${track.info.title} by ${track.info.author}`;
				songs.push({
					name: name.length > 100 ? `${name.substring(0, 97)}...` : name,
					value: track.info.uri,
				});
			});
		}

		return await interaction.respond(songs);
	}
}


