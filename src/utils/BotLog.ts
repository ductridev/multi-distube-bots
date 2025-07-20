import type { TextChannel } from 'discord.js';
import type { Lavamusic } from '../structures/index';

export function sendLog(
	client: Lavamusic,
	message: string,
	type: 'error' | 'warn' | 'info' | 'success' = 'info',
): void {
	if (!client?.channels.cache && client.env.LOG_CHANNEL_ID) return;

	const channel = client.channels.cache.get(client.env.LOG_CHANNEL_ID!) as TextChannel;
	if (!channel) return;

	const colors = {
		error: 0xff0000,
		warn: 0xffff00,
		info: 0x00ff00,
		success: 0x00ff00,
	} as const;

	const color = colors[type];
	const embed = client.embed().setColor(color).setDescription(message).setFooter({
		text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
		iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
	}).setTimestamp();

	channel.send({ embeds: [embed], flags: 4096 }).catch(() => {
		null;
	});
}


