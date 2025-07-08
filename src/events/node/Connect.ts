import type { LavalinkNode, LavalinkPlayer } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { sendLog } from '../../utils/BotLog';

export default class Connect extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'connect',
		});
	}

	public async run(node: LavalinkNode): Promise<void> {
		this.client.logger.success(`Node ${node.id} is ready!`);

		// Register resume event
		this.resume();

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
						});
						if (!player.connected) await player.connect();
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
	}

	private async resume(): Promise<void> {
		this.client.manager.nodeManager.on("connect", (node) => node.updateSession(true, 360e3));

		this.client.manager.nodeManager.on("resumed", async (node, _payload, fetchedPlayers) => {
			// create players:
			for (const fetchedPlayer of (fetchedPlayers as LavalinkPlayer[])) {
				// fetchedPlayer is the live data from lavalink
				const savedPlayerData = await this.client.db.getSavedPlayerData(fetchedPlayer.guildId, this.client.childEnv.clientId);
				if (savedPlayerData === null) continue;

				// if lavalink says the bot got disconnected, we can skip the resuming, or force reconnect whatever you want!, here we choose to not do anything and thus delete the saved player data
				if (!fetchedPlayer.state.connected) {
					console.log("skipping resuming player, because it already disconnected");
					await this.client.db.deleteSavedPlayerData(fetchedPlayer.guildId, this.client.childEnv.clientId);
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
						? Math.round(savedPlayerData.volume / this.client.manager.options.playerOptions.volumeDecrementer)
						: savedPlayerData.volume,
					// all of the following options can either be saved too, or you can use pre-defined defaults
					selfDeaf: true,
					selfMute: false,
					applyVolumeAsFilter: savedPlayerData.applyVolumeAsFilter,
					instaUpdateFiltersFix: savedPlayerData.instaUpdateFiltersFix,
				});

				// player.voice = data.voice;
				// normally just player.voice is enough, but if you restart the entire bot, you need to create a new connection, thus call player.connect();
				await player.connect();

				player.filterManager.data = fetchedPlayer.filters; // override the filters data
				await player.queue.utils.sync(true, false); // get the queue data including the current track (for the requester)
				// override the current track with the data from lavalink
				if (fetchedPlayer.track) player.queue.current = this.client.manager.utils.buildTrack(fetchedPlayer.track, player.queue.current?.requester || this.client.user);
				// override the position of the player
				player.lastPosition = fetchedPlayer.state.position;
				player.lastPositionChange = Date.now();
				// you can also override the ping of the player, or wait about 30s till it's done automatically
				player.ping.lavalink = fetchedPlayer.state.ping;
				// important to have skipping work correctly later
				player.paused = fetchedPlayer.paused;
				player.playing = !fetchedPlayer.paused && !!fetchedPlayer.track;
				// That's about it
			}
		})
		this.client.manager.on("playerUpdate", (_oldPlayer, newPlayer) => { // automatically sync player data on updates. if you don'T want to save everything you can instead also just save the data on playerCreate
			this.client.db.setSavedPlayerData(newPlayer.toJSON(), this.client.childEnv.clientId);
		});
		// delete the player again
		this.client.manager.on("playerDestroy", (player) => {
			this.client.db.deleteSavedPlayerData(player.guildId, this.client.childEnv.clientId);
		})
	}
}


