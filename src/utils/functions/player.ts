import type { Player, SearchResult, Track, UnresolvedSearchResult } from 'lavalink-client';
import type { Requester } from '../../types';
import { Lavamusic } from '../../structures';
import { vcLocks, voiceChannelMap, sessionMap, getStateManager } from '../..';

/**
 * Transforms a requester into a standardized requester object.
 *
 * @param {any} requester The requester to transform. Can be a string, a user, or an object with
 *                        the keys `id`, `username`, and `avatarURL`.
 * @returns {Requester} The transformed requester object.
 */
export const requesterTransformer = (requester: any, client: Lavamusic): Requester => {
	// if it's already the transformed requester
	if (typeof requester === 'object' && 'avatar' in requester && Object.keys(requester).length === 3)
		return requester as Requester;
	// if it's still a string
	if (typeof requester === 'object' && 'displayAvatarURL' in requester) {
		// it's a user
		return {
			id: requester.id,
			username: requester.username,
			avatarURL: requester.displayAvatarURL({ extension: 'png' }),
			discriminator: requester.discriminator,
		};
	}
	return {
		id: client.user?.id ?? '',
		username: client.user?.username ?? '',
		avatarURL: client.user?.displayAvatarURL({ extension: 'png' }),
		discriminator: client.user?.discriminator,
	};
};

/**
 * Function that will be called when the autoplay feature is enabled and the queue
 * is empty. It will search for tracks based on the last played track and add them
 * to the queue.
 *
 * @param {Player} player The player instance.
 * @param {Track} lastTrack The last played track.
 * @returns {Promise<void>} A promise that resolves when the function is done.
 */
export async function autoPlayFunction(player: Player, lastTrack?: Track): Promise<void> {
	if (!player.get('autoplay')) return;
	if (!lastTrack) return;

	if (lastTrack.info.sourceName === 'spotify') {
		const author = lastTrack.info.author;
		const title = lastTrack.info.title;
		const preRes = await player.search({
			query: `${author} - ${title}`,
			source: 'ytsearch',
		}, { requester: lastTrack.requester });
		if (preRes.tracks.length === 0) return;

		const identifier = preRes.tracks[0].info.identifier;

		const res = await player
			.search(
				{
					query: `https://www.youtube.com/watch?v=${identifier}&list=RD${identifier}`,
					source: 'youtube',
				},
				lastTrack.requester,
			)
			.then((response: UnresolvedSearchResult | SearchResult) => {
				response.tracks = (response.tracks as Track[]).filter(
					(v) => v.info.identifier !== lastTrack.info.identifier
				); // remove the lastPlayed track if it's in there..
				return response;
			})
			.catch(console.warn);
		if (res && res.tracks.length > 0)
			await player.queue.add(
				res.tracks.slice(0, 5).map((track) => {
					// transform the track plugininfo so you can figure out if the track is from autoplay or not.
					track.pluginInfo.clientData = { ...(track.pluginInfo.clientData || {}), fromAutoplay: true };
					return track;
				}),
			);
		return;
	}
	if (lastTrack.info.sourceName === 'youtube' || lastTrack.info.sourceName === 'youtubemusic') {
		const res = await player
			.search(
				{
					query: `https://www.youtube.com/watch?v=${lastTrack.info.identifier}&list=RD${lastTrack.info.identifier}`,
					source: 'youtube',
				},
				lastTrack.requester,
			)
			.then((response: UnresolvedSearchResult | SearchResult) => {
				response.tracks = (response.tracks as Track[]).filter(
					(v) => v.info.identifier !== lastTrack.info.identifier
				); // remove the lastPlayed track if it's in there..
				return response;
			})
			.catch(console.warn);
		if (res && res.tracks.length > 0)
			await player.queue.add(
				res.tracks.slice(0, 5).map((track) => {
					// transform the track plugininfo so you can figure out if the track is from autoplay or not.
					track.pluginInfo.clientData = { ...(track.pluginInfo.clientData || {}), fromAutoplay: true };
					return track;
				}),
			);
		return;
	}
	if (lastTrack.info.sourceName === 'jiosaavn') {
		const res = await player.search(
			{ query: `jsrec:${lastTrack.info.identifier}`, source: 'jsrec' },
			lastTrack.requester,
		);
		if (res.tracks.length > 0) {
			const track = res.tracks.filter(v => v.info.identifier !== lastTrack.info.identifier)[0];
			await player.queue.add(track);
		}
	}
	return;
}

/**
 * Applies fair play to the player's queue by ensuring that tracks from different requesters are played in a round-robin fashion.
 * @param {Player} player The player instance.
 * @returns {Promise<Track[]>} A promise that resolves to the fair queue of tracks.
 */
export async function applyFairPlayToQueue(player: Player): Promise<Track[]> {
	const tracks = [...player.queue.tracks];
	const requesterMap = new Map<string, any[]>();

	// Group tracks by requester
	for (const track of tracks) {
		const requesterId = (track.requester as any).id
		if (!requesterMap.has(requesterId)) {
			requesterMap.set(requesterId, []);
		}
		requesterMap.get(requesterId)!.push(track);
	}

	// Build fair queue
	const fairQueue: Track[] = [];
	while (fairQueue.length < tracks.length) {
		for (const [, trackList] of requesterMap.entries()) {
			if (trackList.length > 0) {
				fairQueue.push(trackList.shift()!);
			}
		}
	}

	// Clear the player's queue and add the fair queue tracks
	await player.queue.splice(0, player.queue.tracks.length);
	for (const track of fairQueue) {
		player.queue.add(track);
	}

	return fairQueue;
}

/**
 * Safely creates or gets a player with proper voice channel locking to prevent
 * multiple bots from joining the same voice channel simultaneously.
 * 
 * @param {Lavamusic} client The client instance
 * @param {string} guildId The guild ID
 * @param {string} voiceChannelId The voice channel ID
 * @param {string} textChannelId The text channel ID
 * @param {any} options Additional player options
 * @returns {Promise<Player | null>} The player instance or null if another bot is already in the channel
 */
export async function safeCreatePlayer(
	client: Lavamusic,
	guildId: string,
	voiceChannelId: string,
	textChannelId: string,
	options: {
		selfMute?: boolean;
		selfDeaf?: boolean;
		vcRegion?: string;
		summonUserId?: string;
	} = {}
): Promise<Player | null> {
	// Use lock to prevent race conditions
	return await vcLocks.acquire(`${guildId}-${voiceChannelId}`, async () => {
		// Check if player already exists
		let player = client.manager.getPlayer(guildId);
		if (player) {
			// Player exists, check if it's connected to the same voice channel
			if (player.voiceChannelId === voiceChannelId) {
				return player;
			}
			// Player exists but in different channel - don't create new one
			return null;
		}

		// Check if another bot is already in this voice channel
		const stateManager = getStateManager(client);
		let existingBotId: string | null = null;

		if (stateManager) {
			// Sharded mode: use ShardStateManager
			existingBotId = await stateManager.getBotInVoiceChannel(guildId, voiceChannelId);
		} else {
			// Non-sharded mode: use in-memory map
			const guildMap = voiceChannelMap.get(guildId);
			if (guildMap) {
				existingBotId = guildMap.get(voiceChannelId) || null;
			}
		}

		// If another bot is already in the channel, don't create player
		if (existingBotId && existingBotId !== client.user!.id) {
			return null;
		}

		// Safe to create player
		player = client.manager.createPlayer({
			guildId,
			voiceChannelId,
			textChannelId,
			selfMute: options.selfMute ?? false,
			selfDeaf: options.selfDeaf ?? true,
			vcRegion: options.vcRegion,
			customData: {
				botClientId: client.user!.id
			}
		});

		if (options.summonUserId) {
			player.set('summonUserId', options.summonUserId);
		}

		// Connect the player
		if (!player.connected) {
			await player.connect();
		}

		// Update voice channel mapping
		if (stateManager) {
			await stateManager.setVoiceChannelMapping(guildId, voiceChannelId, client.user!.id);
		} else {
			if (!voiceChannelMap.has(guildId)) {
				voiceChannelMap.set(guildId, new Map());
			}
			voiceChannelMap.get(guildId)!.set(voiceChannelId, client.user!.id);
		}

		// Update session map
		if (!sessionMap.has(guildId)) {
			sessionMap.set(guildId, new Map());
		}
		sessionMap.get(guildId)!.set(voiceChannelId, player);

		return player;
	});
}
