// import type { LavalinkNode, LavalinkPlayer, PlayerJson } from 'lavalink-client';
import type { LavalinkNode, LavalinkPlayer } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { sendLog } from '../../utils/BotLog';
import { sessionMap, updateSession, voiceChannelMap } from '../..';
import { TextBasedChannel, VoiceBasedChannel } from 'discord.js';

export default class Connect extends Event {
	private didResume = false;
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'connect',
		});

		this.resume();
	}

	public async run(node: LavalinkNode): Promise<void> {
		this.didResume = false;
		this.client.logger.success(`Node ${node.id} is ready!`);

		const interval = setInterval(async () => {
			await node.updateSession(true, 15 * 60e3); // 15 minutes
		}, 10 * 60e3);

		updateSession.set(`${node.id}-${this.client.childEnv.clientId}`, interval);

		let data = await this.client.db.get_247(this.client.childEnv.clientId);
		if (!data) return;

		if (!Array.isArray(data)) {
			data = [data];
		}

		data.forEach((main: { guildId: string; textId: string, botClientId: string; voiceId: string }, index: number) => {
			setTimeout(async () => {
				if (this.client.childEnv.clientId !== main.botClientId) return;

				const guild = this.client.guilds.cache.get(main.guildId);
				if (!guild) return;

				const channel = guild.channels.cache.get(main.textId) as TextBasedChannel | undefined;
				const vc = guild.channels.cache.get(main.voiceId) as VoiceBasedChannel | undefined;

				if (channel && vc) {
					try {
						// if (vc.rtcRegion === null) await vc.setRTCRegion('singapore');
						const player = this.client.manager.createPlayer({
							guildId: guild.id,
							voiceChannelId: vc.id,
							textChannelId: channel.id,
							selfDeaf: true,
							selfMute: false,
							customData: {
								botClientId: main.botClientId
							}
						});
						if (!player.connected) await player.connect();
						player.set('autoplay', true);
						// Save player
						if (!sessionMap.has(player.guildId)) sessionMap.set(player.guildId, new Map());
						sessionMap.get(player.guildId)!.set(player.voiceChannelId!, player);
					} catch (error) {
						this.client.logger.error(`Failed to create queue for guild ${guild.id}: ${error}`);
					}
				} else {
					this.client.logger.warn(
						`Missing channels for guild ${guild.id}. Text channel: ${main.textId}, Voice channel: ${main.voiceId}`,
					);
				}
			}, index * 1000);
		});

		sendLog(this.client, `Node ${node.id} is ready!`, 'success');

		setTimeout(async () => {
			if (!this.didResume) {
				this.client.logger.warn(`[RESUME FALLBACK] Resume event did not fire, handling manually.`);
				await this.handleResumeFallback(node);
			}
		}, 7000);
	}

	private async resume(): Promise<void> {
		this.client.manager.nodeManager.on("resumed", async (node, _payload, fetchedPlayers) => {
			this.didResume = true;
			this.client.logger.info(`Node ${node.id} is resuming players`);
			// create players:
			for (const fetchedPlayer of (fetchedPlayers as LavalinkPlayer[])) {
				// fetchedPlayer is the live data from lavalink
				const savedPlayerData = this.client.playerSaver?.getPlayer(fetchedPlayer.guildId);
				const is247 = await this.client.db.get_247(this.client.childEnv.clientId, fetchedPlayer.guildId);
				if (!savedPlayerData) continue;

				// if lavalink says the bot got disconnected, we can skip the resuming, or force reconnect whatever you want!, here we choose to not do anything and thus delete the saved player data
				if (!fetchedPlayer.state.connected && !this.client.channels.cache.has(savedPlayerData.voiceChannelId) && !is247) {
					this.client.logger.info(`Node ${node.id} is skipping resuming player, because it already disconnected`);
					await this.client.playerSaver?.delPlayer(fetchedPlayer.guildId);
					continue;
				}

				// now you can create the player based on the live and saved data
				const player = this.client.manager.createPlayer({
					guildId: fetchedPlayer.guildId,
					voiceChannelId: savedPlayerData.voiceChannelId,
					textChannelId: savedPlayerData.textChannelId,
					node: node.id,
					// you need to update the volume of the player by the volume of lavalink which might got decremented by the volume decrementer
					volume: this.client.manager.options.playerOptions?.volumeDecrementer
						? Math.round(fetchedPlayer.volume / this.client.manager.options.playerOptions.volumeDecrementer)
						: fetchedPlayer.volume,
					// all of the following options can either be saved too, or you can use pre-defined defaults
					selfDeaf: true,
					selfMute: false,
					applyVolumeAsFilter: savedPlayerData.options.applyVolumeAsFilter,
					instaUpdateFiltersFix: savedPlayerData.options.instaUpdateFiltersFix,
					vcRegion: savedPlayerData.options.vcRegion,
				});

				// normally just player.voice is enough, but if you restart the entire bot, you need to create a new connection, thus call player.connect();
				await player.connect();

				player.setRepeatMode(savedPlayerData.repeatMode);
				player.set('autoplay', savedPlayerData.data['autoplay'] === 'true' ? true : false);
				player.set('summonUserId', savedPlayerData.data['summonUserId']);

				sessionMap.get(player.guildId)!.set(player.voiceChannelId!, player);
				voiceChannelMap.get(player.guildId)!.set(player.voiceChannelId!, this.client.childEnv.clientId);

				player.filterManager.data = fetchedPlayer.filters; // override the filters data
				try {
					await player.queue.utils.sync(true, false); // get the queue data including the current track (for the requester)

					this.client.logger.info(`Node ${node.id} has synced queue for guild ${fetchedPlayer.guildId}`);
				} catch (error) {
					this.client.logger.warn(error);

					// override the previous tracks
					// if (savedPlayerData.queue?.previous && savedPlayerData.queue?.previous.length > 0)
					// 	savedPlayerData.queue.previous.forEach((track) => {
					// 		player.queue.add(this.client.manager.utils.buildTrack(track, player.queue.current?.requester || this.client.user));
					// 	});

					// override the current track with the data from lavalink
					if (fetchedPlayer.track) player.queue.add(this.client.manager.utils.buildTrack(fetchedPlayer.track, player.queue.current?.requester || this.client.user));

					this.client.logger.info(`Trying restore queue for guild ${fetchedPlayer.guildId} on node ${node.id} with saved session`);
					const playingIdx = savedPlayerData.queue?.tracks.findIndex((track) => track === savedPlayerData.queue?.current);
					this.client.logger.info(`Restoring queue for guild ${fetchedPlayer.guildId} on node ${node.id} with saved session`);
					// Get all tracks after the current track
					if (playingIdx !== -1)
						savedPlayerData.queue?.tracks.slice(playingIdx).forEach((track) => player.queue.add(track));
					else
						savedPlayerData.queue?.tracks.forEach((track) => player.queue.add(track));

					// override the position of the player
					player.lastPosition = fetchedPlayer.state.position;
					player.lastPositionChange = Date.now();

					this.client.logger.info(`Node ${node.id} has synced position for guild ${fetchedPlayer.guildId}`);
				}

				// const messageId: string | undefined = savedPlayerData.data["messageId"];
				// if (messageId) {
				// 	const message = await (this.client.channels.cache.get(player.textChannelId!) as TextBasedChannel).messages.fetch(messageId).catch(() => {
				// 		null;
				// 	});

				// 	if (message && message.deletable)
				// 		message.delete().catch(() => {
				// 			null;
				// 		});
				// }

				// you can also override the ping of the player, or wait about 30s till it's done automatically
				player.ping.lavalink = fetchedPlayer.state.ping;

				// important to have skipping work correctly later
				player.paused = fetchedPlayer.paused;
				if (!player.paused && player.queue.tracks.length > 0) player.play();

				this.client.logger.info(`Node ${node.id} has resumed player for guild ${fetchedPlayer.guildId}`);
				this.client.logger.info("Previous Track:", player.queue.previous.length);
				this.client.logger.info("Track:", player.queue.current);
				this.client.logger.info("Queue Length:", player.queue.tracks.length);
				this.client.logger.info("Paused:", player.paused);
				this.client.logger.info("Connected:", player.connected);
				this.client.logger.info("Voice Channel:", player.voiceChannelId);
				this.client.logger.info("Text Channel:", player.textChannelId);
			}

			this.client.logger.info(`Node ${node.id} has resumed all players`);
		})
	}

	private async handleResumeFallback(node: LavalinkNode): Promise<void> {
		// Fallback logic if "resumed" event never fired
		this.client.logger.info(`Node ${node.id} is resuming players`);
		sessionMap.forEach(async (vcMap, guildId) => {
			vcMap.forEach(async (oldPlayer, vcId) => {
				// Skip player if invalid
				if (typeof oldPlayer === "string"
					|| !oldPlayer.voiceChannelId
					|| !oldPlayer.textChannelId
					|| oldPlayer.options.customData?.botClientId !== this.client.childEnv.clientId) return;

				// Reconnect player only if channel still there
				if (this.client.channels.cache.has(vcId)) {
					const is247 = await this.client.db.get_247(this.client.childEnv.clientId, guildId);

					// if lavalink says the bot got disconnected, we can skip the resuming, or force reconnect whatever you want!, here we choose to not do anything and thus delete the saved player data
					if (
						!this.client.channels.cache.has(oldPlayer.voiceChannelId)
						&& !(this.client.channels.cache.get(oldPlayer.voiceChannelId) as VoiceBasedChannel).members.has(this.client.user!.id)
						&& !is247) {
						this.client.logger.info(`Node ${node.id} is skipping resuming player, because it already disconnected`);
						await this.client.playerSaver?.delPlayer(guildId);
						return;
					}

					// now you can create the player based on the live and saved data
					const player = this.client.manager.createPlayer({
						guildId: guildId,
						voiceChannelId: oldPlayer.voiceChannelId,
						textChannelId: oldPlayer.textChannelId,
						node: node.id,
						// you need to update the volume of the player by the volume of lavalink which might got decremented by the volume decrementer
						volume: this.client.manager.options.playerOptions?.volumeDecrementer
							? Math.round(oldPlayer.volume / this.client.manager.options.playerOptions.volumeDecrementer)
							: oldPlayer.volume,
						// all of the following options can either be saved too, or you can use pre-defined defaults
						selfDeaf: true,
						selfMute: false,
						applyVolumeAsFilter: oldPlayer.options.applyVolumeAsFilter,
						instaUpdateFiltersFix: oldPlayer.options.instaUpdateFiltersFix,
						vcRegion: oldPlayer.options.vcRegion,
					});

					// normally just player.voice is enough, but if you restart the entire bot, you need to create a new connection, thus call player.connect();
					await player.connect();

					player.setRepeatMode(oldPlayer.repeatMode);
					player.set('autoplay', oldPlayer.get('autoplay') === 'true' ? true : false);
					player.set('summonUserId', oldPlayer.get('summonUserId'));

					sessionMap.get(player.guildId)!.set(player.voiceChannelId!, player);
					voiceChannelMap.get(player.guildId)!.set(player.voiceChannelId!, this.client.childEnv.clientId);

					player.filterManager = oldPlayer.filterManager; // override the filters data
					try {
						await player.queue.utils.sync(true, false); // get the queue data including the current track (for the requester)

						this.client.logger.info(`Node ${node.id} has synced queue for guild ${guildId}`);
					} catch (error) {
						this.client.logger.warn(error);

						// override the previous tracks
						// if (oldPlayer.queue?.previous && oldPlayer.queue?.previous.length > 0)
						// 	oldPlayer.queue.previous.forEach((track) => {
						// 		player.queue.add(this.client.manager.utils.buildTrack(track, player.queue.current?.requester || this.client.user));
						// 	});

						// override the current track with the data from lavalink
						if (oldPlayer.queue?.current) player.queue.add(this.client.manager.utils.buildTrack(oldPlayer.queue.current, player.queue.current?.requester || this.client.user));

						this.client.logger.info(`Trying restore queue for guild ${guildId} on node ${node.id} with saved session`);
						const playingIdx = oldPlayer.queue?.tracks.findIndex((track) => track === oldPlayer.queue?.current);
						this.client.logger.info(`Restoring queue for guild ${guildId} on node ${node.id} with saved session`);
						// Get all tracks after the current track
						if (playingIdx !== -1)
							oldPlayer.queue?.tracks.slice(playingIdx).forEach((track) => player.queue.add(track));
						else
							oldPlayer.queue?.tracks.forEach((track) => player.queue.add(track));

						// override the position of the player
						player.lastPosition = oldPlayer.lastPosition;
						player.lastPositionChange = Date.now();

						this.client.logger.info(`Node ${node.id} has synced position for guild ${guildId}`);
					}

					// const messageId = oldPlayer.get<string | undefined>('messageId');

					// if (messageId) {
					// 	const message = await (this.client.channels.cache.get(player.textChannelId!) as TextBasedChannel).messages.fetch(messageId).catch(() => {
					// 		null;
					// 	});

					// 	if (message && message.deletable)
					// 		message.delete().catch(() => {
					// 			null;
					// 		});
					// }

					// you can also override the ping of the player, or wait about 30s till it's done automatically
					player.ping = oldPlayer.ping;

					// important to have skipping work correctly later
					player.paused = oldPlayer.paused;
					if (!player.paused && player.queue.tracks.length > 0) player.play();

					this.client.logger.info(`Node ${node.id} has resumed player for guild ${guildId}`);
					this.client.logger.info("Previous Track:", player.queue.previous.length);
					this.client.logger.info("Track:", player.queue.current);
					this.client.logger.info("Queue Length:", player.queue.tracks.length);
					this.client.logger.info("Paused:", player.paused);
					this.client.logger.info("Connected:", player.connected);
					this.client.logger.info("Voice Channel:", player.voiceChannelId);
					this.client.logger.info("Text Channel:", player.textChannelId);
				}
			})
		});

		this.client.logger.info(`Node ${node.id} has resumed all players`);
	}
}


