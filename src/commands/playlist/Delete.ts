import type { AutocompleteInteraction } from 'discord.js';
import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class DeletePlaylist extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'delete',
			description: {
				content: 'cmd.delete.description',
				examples: ['delete <playlist name>'],
				usage: 'delete <playlist name>',
			},
			category: 'playlist',
			aliases: ['del'],
			cooldown: 3,
			args: true,
			vote: true,
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
					name: 'playlist',
					description: 'cmd.delete.options.playlist',
					type: 3,
					required: true,
					autocomplete: true,
				},
			],
		});
	}

	public async run(client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
		const playlistName = args.join(' ').trim();
		const embed = this.client.embed().setFooter({
			text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
			iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
		})
			.setTimestamp();

		const playlistExists = await client.db.getPlaylist(ctx.author?.id!, playlistName);
		if (!playlistExists) {
			return await ctx.sendMessage({
				embeds: [
					embed.setDescription(ctx.locale('cmd.delete.messages.playlist_not_found')).setColor(this.client.color.red),
				],
			});
		}

		// First, delete all songs from the playlist
		await client.db.deleteSongsFromPlaylist(ctx.author?.id!, playlistName);

		await client.db.deletePlaylist(ctx.author?.id!, playlistName);
		return await ctx.sendMessage({
			embeds: [
				embed
					.setDescription(
						ctx.locale('cmd.delete.messages.playlist_deleted', {
							playlistName,
						}),
					)
					.setColor(this.client.color.green),
			],
		});
	}

	public async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const focusedValue = interaction.options.getFocused();
		const userId = interaction.user.id;

		const playlists = await this.client.db.getUserPlaylists(userId);

		const filtered = playlists.filter(playlist => playlist.name.toLowerCase().startsWith(focusedValue.toLowerCase()));

		await interaction.respond(
			filtered.map(playlist => ({
				name: playlist.name,
				value: playlist.name,
			})),
		);
	}
}


