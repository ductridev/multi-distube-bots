import { exec } from 'node:child_process';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Restart extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'restart',
			description: {
				content: 'Restart the bot',
				examples: ['restart'],
				usage: 'restart',
			},
			category: 'dev',
			aliases: ['reboot'],
			cooldown: 3,
			args: false,
			player: {
				voice: false,
				dj: false,
				active: false,
				djPerm: null,
			},
			permissions: {
				dev: true,
				client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
				user: [],
			},
			slashCommand: false,
			options: [],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<void> {
		const embed = this.client.embed();
		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Danger)
			.setLabel('Confirm Restart')
			.setCustomId('confirm-restart');
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
		const restartEmbed = embed
			.setColor(this.client.color.red)
			.setDescription(`**Are you sure you want to restart **\`${client.user?.username}\`?`)
			.setFooter({
				text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
			})
			.setTimestamp();

		const msg = await ctx.sendMessage({
			embeds: [restartEmbed],
			components: [row],
		});

		const filter = (i: any) => i.customId === 'confirm-restart' && i.user.id === ctx.author?.id;
		const collector = msg.createMessageComponentCollector({
			time: 30000,
			filter,
		});

		collector.on('collect', async i => {
			await i.deferUpdate();

			await msg.edit({
				content: 'Restarting the bot...',
				embeds: [],
				components: [],
			});

			try {
				// Destroy client connection
				await client.destroy();

				// Run npm run start to restart the bot directly
				exec('npm run start', (error, stdout, stderr) => {
					if (error) {
						console.error(`[RESTART ERROR]: ${error.message}`);
						return;
					}
					if (stderr) {
						console.error(`[RESTART STDERR]: ${stderr}`);
						return;
					}
					console.log(`[RESTART SUCCESS]: ${stdout}`);
				});
			} catch (error) {
				console.error('[RESTART ERROR]:', error);
				await msg.edit({
					content: 'An error occurred while restarting the bot.',
					components: [],
				});
			}
		});

		collector.on('end', async () => {
			if (collector.collected.size === 0) {
				await msg.edit({
					content: 'Restart cancelled.',
					components: [],
				});
			}
		});
	}
}

