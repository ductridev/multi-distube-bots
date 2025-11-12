import { EmbedBuilder, type Guild, type GuildMember, type TextChannel } from 'discord.js';
import { Event, type Lavamusic } from '../../structures/index';
import { removeBotFromGuild } from '../..';
import { dashboardSocket } from '../../api/websocket/DashboardSocket';

export default class GuildDelete extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'guildDelete',
		});
	}

	public async run(guild: Guild): Promise<void> {
		if (!guild) return;

		// Emit guild:leave event to dashboard
		dashboardSocket.emitGuildLeave({
			guildId: guild.id,
			clientId: this.client.childEnv.clientId,
			name: guild.name,
		});

		// Automatically remove this bot from the guild's preferences
		try {
			await removeBotFromGuild(guild.id, this.client.childEnv.clientId);
			this.client.logger.info(`Auto-removed bot ${this.client.childEnv.clientId} from guild ${guild.id} (${guild.name || 'Unknown'}) preferences`);
		} catch (error) {
			this.client.logger.error(`Failed to auto-remove bot from guild ${guild.id} preferences:`, error);
		}

		let owner: GuildMember | undefined;
		try {
			owner = await guild.members.fetch(guild.ownerId);
		} catch (error) {
			this.client.logger.error(`Error fetching owner for guild ${guild.id}: ${error}`);
		}

		const embed = new EmbedBuilder()
			.setColor(this.client.config.color.red)
			.setAuthor({
				name: guild.name || 'Unknown Guild',
				iconURL: guild.iconURL({ extension: 'jpeg' })!,
			})
			.setDescription(`**${guild.name}** has been removed from my guilds!`)
			.setThumbnail(guild.iconURL({ extension: 'jpeg' }))
			.addFields(
				{
					name: 'Owner',
					value: owner ? owner.user.tag : 'Unknown#0000',
					inline: true,
				},
				{
					name: 'Members',
					value: guild.memberCount?.toString() || 'Unknown',
					inline: true,
				},
				{
					name: 'Created At',
					value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
					inline: true,
				},
				{
					name: 'Removed At',
					value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
					inline: true,
				},
				{ name: 'ID', value: guild.id, inline: true },
			)
			.setFooter({
				text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
			})
			.setTimestamp();

		const logChannelId = this.client.env.LOG_CHANNEL_ID;
		if (!logChannelId) {
			this.client.logger.error('Log channel ID not found in configuration.');
			return;
		}

		try {
			const channel = (await this.client.channels.fetch(logChannelId)) as TextChannel;
			if (!channel) {
				this.client.logger.error(
					`Log channel not found with ID ${logChannelId}. Please change the settings in .env or, if you have a channel, invite me to that guild.`,
				);
				return;
			}
			await channel.send({ embeds: [embed], flags: 4096 });
		} catch (error) {
			this.client.logger.error(`Error sending message to log channel ${logChannelId}: ${error}`);
		}
	}
}


