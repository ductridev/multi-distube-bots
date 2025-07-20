import { LavalinkManager, LavalinkPlayer, type LavalinkNodeOptions, type SearchPlatform, type SearchResult } from 'lavalink-client';
import { autoPlayFunction, requesterTransformer } from '../utils/functions/player';
import type Lavamusic from './Lavamusic';
import { sessionMap } from '..';

export default class LavalinkClient extends LavalinkManager {
	public client: Lavamusic;
	constructor(client: Lavamusic) {
		super({
			nodes: (client.env.NODES as LavalinkNodeOptions[]).map(node => {
				node.sessionId = client.playerSaver!.getAllLastNodeSessions().get(node.id!);
				return node;
			}),
			sendToShard: async (guildId, payload) => (await client.guilds.fetch(guildId)).shard.send(payload),
			queueOptions: {
				maxPreviousTracks: 25,
			},
			playerOptions: {
				defaultSearchPlatform: client.env.SEARCH_ENGINE,
				onDisconnect: {
					autoReconnect: true,
					destroyPlayer: false,
				},
				requesterTransformer: requesterTransformer,
				onEmptyQueue: {
					autoPlayFunction: (player, lastTrack) => autoPlayFunction(player, client, lastTrack),
				},
			},
		});
		this.client = client;
		this.resume();
	}
	/**
	 * Searches for a song and returns the tracks.
	 * @param query The query to search for.
	 * @param user The user who requested the search.
	 * @param source The source to search in. Defaults to youtube.
	 * @returns An array of tracks that match the query.
	 */
	public async search(query: string, user: unknown, source?: SearchPlatform): Promise<SearchResult> {
		const nodes = this.nodeManager.leastUsedNodes();
		const node = nodes[Math.floor(Math.random() * nodes.length)];
		const result = await node.search({ query, source }, user, false);
		return result;
	}

	private async resume(): Promise<void> {
		this.nodeManager.on("resumed", async (node, _payload, fetchedPlayers) => {
			this.client.logger.info(`Node ${node.id} is resuming players`);
			// create players:
			for (const fetchedPlayer of (fetchedPlayers as LavalinkPlayer[])) {
				// fetchedPlayer is the live data from lavalink
				const savedPlayerData = await this.client.db.getSavedPlayerData(fetchedPlayer.guildId, this.client.childEnv.clientId);
				const is247 = await this.client.db.get_247(this.client.childEnv.clientId, fetchedPlayer.guildId);
				this.client.logger.info(`Node ${node.id} is resuming player`);
				if (savedPlayerData === null) continue;

				// if lavalink says the bot got disconnected, we can skip the resuming, or force reconnect whatever you want!, here we choose to not do anything and thus delete the saved player data
				if (!fetchedPlayer.state.connected && !is247) {
					this.client.logger.info(`Node ${node.id} is skipping resuming player, because it already disconnected`);
					await this.client.db.deleteSavedPlayerData(fetchedPlayer.guildId, this.client.childEnv.clientId);
					continue;
				}

				// now you can create the player based on the live and saved data
				const player = this.createPlayer({
					guildId: fetchedPlayer.guildId,
					voiceChannelId: savedPlayerData.voiceChannelId,
					textChannelId: savedPlayerData.textChannelId,
					node: node.id,
					// you need to update the volume of the player by the volume of lavalink which might got decremented by the volume decrementer
					volume: this.options.playerOptions?.volumeDecrementer
						? Math.round(fetchedPlayer.volume / this.options.playerOptions.volumeDecrementer)
						: fetchedPlayer.volume,
					// all of the following options can either be saved too, or you can use pre-defined defaults
					selfDeaf: savedPlayerData.selfDeaf,
					selfMute: savedPlayerData.selfMute,
					applyVolumeAsFilter: savedPlayerData.applyVolumeAsFilter,
					instaUpdateFiltersFix: savedPlayerData.instaUpdateFiltersFix,
					vcRegion: savedPlayerData.vcRegion,
				});

				this.client.logger.info(`Node ${node.id} is resuming player for guild ${fetchedPlayer.guildId}`);

				player.voice = fetchedPlayer.voice;
				// normally just player.voice is enough, but if you restart the entire bot, you need to create a new connection, thus call player.connect();
				await player.connect();

				this.client.logger.info(`Node ${node.id} has resumed player for guild ${fetchedPlayer.guildId}`);

				player.filterManager.data = fetchedPlayer.filters; // override the filters data
				try {
					await player.queue.utils.sync(true, false); // get the queue data including the current track (for the requester)

					this.client.logger.info(`Node ${node.id} has synced queue for guild ${fetchedPlayer.guildId}`);
				} catch (error) {
					this.client.logger.error(error);
					this.client.logger.info(`Trying restore queue for guild ${fetchedPlayer.guildId} on node ${node.id} with saved session`);
					if (sessionMap.has(fetchedPlayer.guildId)) {
						const savedPlayer = sessionMap.get(fetchedPlayer.guildId)!.get(savedPlayerData.voiceChannelId);
						if (savedPlayer && savedPlayer.queue.tracks.length > 0) {
							const playingIdx = savedPlayer.queue.tracks.findIndex((track) => track === savedPlayer.queue.current);
							this.client.logger.info(`Restoring queue for guild ${fetchedPlayer.guildId} on node ${node.id} with saved session`);
							// Get all tracks after the current track
							if (playingIdx !== -1)
								savedPlayer.queue.tracks.slice(playingIdx).forEach((track) => player.queue.add(track));
							if (!player.playing) player.play();
						}
					} else {
						this.client.logger.info(`No saved session found for guild ${fetchedPlayer.guildId} on node ${node.id}`);
					}
				}

				// override the current track with the data from lavalink
				if (fetchedPlayer.track && fetchedPlayer.state.connected) player.queue.current = this.utils.buildTrack(fetchedPlayer.track, player.queue.current?.requester || this.client.user);
				else if (fetchedPlayer.track) player.queue.add(this.utils.buildTrack(fetchedPlayer.track, player.queue.current?.requester || this.client.user));

				this.client.logger.info(`Node ${node.id} has synced current track for guild ${fetchedPlayer.guildId}`);

				// override the position of the player
				player.lastPosition = fetchedPlayer.state.position;
				player.lastPositionChange = Date.now();

				this.client.logger.info(`Node ${node.id} has synced position for guild ${fetchedPlayer.guildId}`);

				// you can also override the ping of the player, or wait about 30s till it's done automatically
				player.ping.lavalink = fetchedPlayer.state.ping;

				// important to have skipping work correctly later
				player.paused = fetchedPlayer.paused;
				player.playing = !fetchedPlayer.paused && !!fetchedPlayer.track;

				this.client.logger.info(`Node ${node.id} has resumed player for guild ${fetchedPlayer.guildId}`);
			}

			this.client.logger.info(`Node ${node.id} has resumed all players`);
		})
	}
}


