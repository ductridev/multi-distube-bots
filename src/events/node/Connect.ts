// import type { LavalinkNode, LavalinkPlayer, PlayerJson } from 'lavalink-client';
import type { LavalinkNode, LavalinkPlayer } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { sendLog } from '../../utils/BotLog';
import { sessionMap, voiceChannelMap } from '../..';

export default class Connect extends Event {
	// private didResume = false;
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'connect',
		});

		this.resume();
	}

	public async run(node: LavalinkNode): Promise<void> {
		this.client.logger.success(`Node ${node.id} is ready!`);

		await node.updateSession(true, 60 * 60e3); // 1 hour

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

				const channel = guild.channels.cache.get(main.textId);
				const vc = guild.channels.cache.get(main.voiceId);

				if (channel && vc) {
					try {
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

		// setTimeout(async () => {
		// 	if (!this.didResume) {
		// 		this.client.logger.warn(`[RESUME FALLBACK] Resume event did not fire, handling manually.`);
		// 		await this.handleResumeFallback(node);
		// 	}
		// }, 7000);
	}

	private async resume(): Promise<void> {
		this.client.manager.nodeManager.on("resumed", async (node, _payload, fetchedPlayers) => {
			// this.didResume = true;
			this.client.logger.info(`Node ${node.id} is resuming players`);
			// create players:
			for (const fetchedPlayer of (fetchedPlayers as LavalinkPlayer[])) {
				// fetchedPlayer is the live data from lavalink
				const savedPlayerData = this.client.playerSaver?.getPlayer(fetchedPlayer.guildId);
				const is247 = await this.client.db.get_247(this.client.childEnv.clientId, fetchedPlayer.guildId);
				this.client.logger.info(`Node ${node.id} is resuming player`);
				if (savedPlayerData === null) continue;

				// if lavalink says the bot got disconnected, we can skip the resuming, or force reconnect whatever you want!, here we choose to not do anything and thus delete the saved player data
				if (!fetchedPlayer.state.connected && !is247) {
					this.client.logger.info(`Node ${node.id} is skipping resuming player, because it already disconnected`);
					await this.client.playerSaver?.delPlayer(fetchedPlayer.guildId);
					continue;
				}

				// now you can create the player based on the live and saved data
				const player = this.client.manager.createPlayer({
					guildId: fetchedPlayer.guildId,
					voiceChannelId: savedPlayerData!.voiceChannelId,
					textChannelId: savedPlayerData!.textChannelId,
					node: node.id,
					// you need to update the volume of the player by the volume of lavalink which might got decremented by the volume decrementer
					volume: this.client.manager.options.playerOptions?.volumeDecrementer
						? Math.round(fetchedPlayer.volume / this.client.manager.options.playerOptions.volumeDecrementer)
						: fetchedPlayer.volume,
					// all of the following options can either be saved too, or you can use pre-defined defaults
					selfDeaf: true,
					selfMute: false,
					applyVolumeAsFilter: savedPlayerData!.options.applyVolumeAsFilter,
					instaUpdateFiltersFix: savedPlayerData!.options.instaUpdateFiltersFix,
					vcRegion: savedPlayerData!.options.vcRegion,
				});

				this.client.logger.info(`Node ${node.id} is resuming player for guild ${fetchedPlayer.guildId}`);

				// normally just player.voice is enough, but if you restart the entire bot, you need to create a new connection, thus call player.connect();
				await player.connect();

				sessionMap.get(player.guildId)!.set(player.voiceChannelId!, player);
				voiceChannelMap.get(player.guildId)!.set(player.voiceChannelId!, this.client.childEnv.clientId);

				this.client.logger.info(`Node ${node.id} has resumed player for guild ${fetchedPlayer.guildId}`);

				player.filterManager.data = fetchedPlayer.filters; // override the filters data
				try {
					await player.queue.utils.sync(true, false); // get the queue data including the current track (for the requester)

					this.client.logger.info(`Node ${node.id} has synced queue for guild ${fetchedPlayer.guildId}`);
				} catch (error) {
					this.client.logger.warn(error);
				}

				// override the current track with the data from lavalink
				if (fetchedPlayer.track && fetchedPlayer.state.connected) player.queue.add(this.client.manager.utils.buildTrack(fetchedPlayer.track, player.queue.current?.requester || this.client.user));
				else if (fetchedPlayer.track) player.queue.add(this.client.manager.utils.buildTrack(fetchedPlayer.track, player.queue.current?.requester || this.client.user));

				this.client.logger.info(`Trying restore queue for guild ${fetchedPlayer.guildId} on node ${node.id} with saved session`);
				const playingIdx = savedPlayerData!.queue?.tracks.findIndex((track) => track === savedPlayerData!.queue?.current);
				this.client.logger.info(`Restoring queue for guild ${fetchedPlayer.guildId} on node ${node.id} with saved session`);
				// Get all tracks after the current track
				if (playingIdx !== -1)
					savedPlayerData!.queue?.tracks.slice(playingIdx).forEach((track) => player.queue.add(track));

				this.client.logger.info(`Node ${node.id} has synced current track for guild ${fetchedPlayer.guildId}`);

				// override the position of the player
				player.lastPosition = fetchedPlayer.state.position;
				player.lastPositionChange = Date.now();

				this.client.logger.info(`Node ${node.id} has synced position for guild ${fetchedPlayer.guildId}`);

				// you can also override the ping of the player, or wait about 30s till it's done automatically
				player.ping.lavalink = fetchedPlayer.state.ping;

				// important to have skipping work correctly later
				player.paused = fetchedPlayer.paused;
				if (!player.paused && player.queue.tracks.length > 0) player.play();

				this.client.logger.info(`Node ${node.id} has resumed player for guild ${fetchedPlayer.guildId}`);
				this.client.logger.info("Track:", player.queue.current);
				this.client.logger.info("Paused:", player.paused);
				this.client.logger.info("Connected:", player.connected);
				this.client.logger.info("Voice Channel:", player.voiceChannelId);
				this.client.logger.info("Text Channel:", player.textChannelId);
				this.client.logger.info("Volume:", player.volume);
				this.client.logger.info("Voice Event Present:", player.voice);
			}

			this.client.logger.info(`Node ${node.id} has resumed all players`);
		})
	}

	// private async handleResumeFallback(_node: LavalinkNode): Promise<void> {
	// 	// Fallback logic if "resumed" event never fired
	// 	sessionMap.forEach((vcMap, _guildId) => {
	// 		vcMap.forEach(async (player, vcId) => {
	// 			if (typeof player === 'string') return;
	// 			if (!player.options.customData) return;

	// 			const json: PlayerJson = player.toJSON();

	// 			if (this.client.childEnv.clientId === player.options.customData.botClientId) {
	// 				const player = this.client.manager.createPlayer({
	// 					...json,
	// 				});

	// 				player.connect();
	// 				if (json.queue?.current) player.queue.add(json.queue.current);

	// 				const playingIdx = json.queue?.tracks.findIndex((track) => track === json.queue?.current);
	// 				// Get all tracks after the current track
	// 				if (playingIdx !== -1)
	// 					json.queue?.tracks.slice(playingIdx).forEach((track) => player.queue.add(track));

	// 				vcMap.set(vcId, player);

	// 				player.paused = json.paused;
	// 				if (!player.paused && player.queue.tracks.length > 0) player.play();

	// 				if (player.queue.tracks.length > 0) this.client.logger.info(`Node ${_node.id} has resumed player for guild ${player.guildId} at ${vcId}`);
	// 			}
	// 		})
	// 	})
	// }
}


