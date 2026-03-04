/**
 * Migration script to aggregate PlayerHistory data into new statistics tables
 * 
 * This script migrates existing PlayerHistory data to:
 * - PlaybackSession: Individual playback sessions
 * - TrackPlay: Individual track plays with source detection
 * - HourlyStats: Aggregated hourly statistics
 * 
 * Usage: npx tsx scripts/migrate-stats-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Detect source from track URL
 */
function detectSourceFromUrl(url: string): string {
	if (url.includes('youtube.com') || url.includes('youtu.be')) {
		return 'youtube';
	}
	if (url.includes('spotify.com')) {
		return 'spotify';
	}
	if (url.includes('soundcloud.com')) {
		return 'soundcloud';
	}
	return 'youtube'; // Default to youtube
}

/**
 * Extract track name from URL as fallback
 */
function extractNameFromUrl(url: string): string | null {
	try {
		const urlObj = new URL(url);
		const pathname = urlObj.pathname;
		
		// For YouTube: extract video ID or handle
		if (url.includes('youtube.com') || url.includes('youtu.be')) {
			// Handle youtube.com/watch?v=VIDEO_ID
			const videoId = urlObj.searchParams.get('v');
			if (videoId) {
				return `YouTube Video (${videoId})`;
			}
			// Handle youtu.be/VIDEO_ID
			if (urlObj.hostname === 'youtu.be' && pathname.length > 1) {
				return `YouTube Video (${pathname.slice(1)})`;
			}
		}
		
		// For Spotify: extract track/playlist/album name from path
		if (url.includes('spotify.com')) {
			const parts = pathname.split('/').filter(Boolean);
			if (parts.length >= 2) {
				const type = parts[0]; // track, playlist, album, etc.
				const name = parts[parts.length - 1].replace(/-/g, ' ');
				return `Spotify ${type}: ${name}`;
			}
		}
		
		// For SoundCloud: extract the last part of the path
		if (url.includes('soundcloud.com')) {
			const parts = pathname.split('/').filter(Boolean);
			if (parts.length >= 2) {
				return `SoundCloud: ${parts[parts.length - 1].replace(/-/g, ' ')}`;
			}
		}
		
		// Generic fallback: use the last part of the pathname
		const parts = pathname.split('/').filter(Boolean);
		if (parts.length > 0) {
			return parts[parts.length - 1].replace(/-/g, ' ').replace(/_/g, ' ');
		}
		
		return null;
	} catch {
		return null;
	}
}

/**
	* Get hour key from date (truncated to hour)
	*/
function getHourKey(date: Date): Date {
	const hourKey = new Date(date);
	hourKey.setMinutes(0, 0, 0);
	return hourKey;
}

async function main() {
	console.log('Starting migration of PlayerHistory data to new statistics tables...\n');

	try {
		// Get all PlayerHistory records
		const playerHistory = await prisma.playerHistory.findMany({
			orderBy: { playedAt: 'asc' },
		});

		console.log(`Found ${playerHistory.length} PlayerHistory records to migrate.\n`);

		if (playerHistory.length === 0) {
			console.log('No data to migrate. Exiting.');
			return;
		}

		// Group data for batch processing
		const playbackSessions: Map<string, typeof playerHistory> = new Map();
		const hourlyStatsMap: Map<string, {
			guildId: string;
			botId: string;
			hour: Date;
			sessionCount: number;
			totalDuration: number;
			youtubePlays: number;
			spotifyPlays: number;
			soundcloudPlays: number;
		}> = new Map();

		// Process each PlayerHistory record
		for (const record of playerHistory) {
			// Group by guild + hour for PlaybackSession
			const sessionKey = `${record.guildId}-${record.clientId}-${getHourKey(record.playedAt).toISOString()}`;
			
			if (!playbackSessions.has(sessionKey)) {
				playbackSessions.set(sessionKey, []);
			}
			playbackSessions.get(sessionKey)!.push(record);

			// Aggregate hourly stats
			const hourKey = `${record.guildId}-${record.clientId}-${getHourKey(record.playedAt).toISOString()}`;
			const source = detectSourceFromUrl(record.trackUrl);
			const durationSeconds = Math.floor(record.duration / 1000);

			if (!hourlyStatsMap.has(hourKey)) {
				hourlyStatsMap.set(hourKey, {
					guildId: record.guildId,
					botId: record.clientId,
					hour: getHourKey(record.playedAt),
					sessionCount: 0,
					totalDuration: 0,
					youtubePlays: 0,
					spotifyPlays: 0,
					soundcloudPlays: 0,
				});
			}

			const stats = hourlyStatsMap.get(hourKey)!;
			stats.sessionCount++;
			stats.totalDuration += durationSeconds;
			
			if (source === 'youtube') {
				stats.youtubePlays++;
			} else if (source === 'spotify') {
				stats.spotifyPlays++;
			} else if (source === 'soundcloud') {
				stats.soundcloudPlays++;
			}
		}

		console.log(`Grouped into ${playbackSessions.size} unique session groups.`);
		console.log(`Aggregated into ${hourlyStatsMap.size} hourly stat entries.\n`);

		// Migrate TrackPlay data
		console.log('Migrating TrackPlay data...');
		let trackPlayCount = 0;
		let skippedCount = 0;
		let fallbackCount = 0;
		let unknownTrackCount = 0;

		// Process records with fallback logic for empty track titles
		const trackPlayBatch = playerHistory
			.map(record => {
				// Check if track title is empty, null, or undefined
				const hasValidTitle = record.trackTitle && record.trackTitle.trim() !== '';
				
				// Determine the track name with fallback logic
				let trackName: string;
				if (hasValidTitle) {
					trackName = record.trackTitle;
				} else {
					// Try to extract name from URL
					const extractedName = extractNameFromUrl(record.trackUrl);
					if (extractedName) {
						trackName = extractedName;
						fallbackCount++;
					} else {
						trackName = 'Unknown Track';
						unknownTrackCount++;
					}
				}

				// Use original MongoDB ObjectId for uniqueness
				const trackPlayId = record.id;

				return {
					guildId: record.guildId,
					botId: record.clientId,
					trackName,
					trackUrl: record.trackUrl,
					source: detectSourceFromUrl(record.trackUrl),
					duration: Math.floor(record.duration / 1000), // Convert ms to seconds
					startedAt: record.playedAt,
					playedBy: record.authorId || record.author || 'Unknown', // Fallback to author if authorId is null
					trackPlayId,
				};
			});

		// Log statistics about empty track titles
		if (fallbackCount > 0 || unknownTrackCount > 0) {
			console.log(`  Records with empty track titles:`);
			console.log(`    - ${fallbackCount} records used URL extraction fallback`);
			console.log(`    - ${unknownTrackCount} records defaulted to "Unknown Track"`);
		}

		// Batch insert TrackPlay records (in chunks of 1000)
		const CHUNK_SIZE = 1000;
		for (let i = 0; i < trackPlayBatch.length; i += CHUNK_SIZE) {
			const chunk = trackPlayBatch.slice(i, i + CHUNK_SIZE);
			await prisma.trackPlay.createMany({
				data: chunk,
			});
			trackPlayCount += chunk.length;
			console.log(`  Migrated ${trackPlayCount}/${trackPlayBatch.length} TrackPlay records...`);
		}
		console.log(`✓ Migrated ${trackPlayCount} TrackPlay records.`);
		if (skippedCount > 0) {
			console.log(`  Skipped ${skippedCount} records with missing data.\n`);
		} else {
			console.log();
		}

		// Migrate PlaybackSession data (one session per hour per guild per bot)
		console.log('Migrating PlaybackSession data...');
		let sessionCount = 0;
		const sessionBatch: Array<{
			guildId: string;
			botId: string;
			startedAt: Date;
			endedAt: Date | null;
			duration: number;
			listenerCount: number;
			source: string;
			trackName: string | null;
			trackUrl: string | null;
		}> = [];

		for (const [key, records] of playbackSessions) {
			const [guildId, botId] = key.split('-');
			const firstRecord = records[0];
			const lastRecord = records[records.length - 1];
			
			// Calculate total duration and detect primary source
			const totalDuration = records.reduce((sum, r) => sum + Math.floor(r.duration / 1000), 0);
			const sourceCounts: Record<string, number> = {};
			for (const r of records) {
				const source = detectSourceFromUrl(r.trackUrl);
				sourceCounts[source] = (sourceCounts[source] || 0) + 1;
			}
			const primarySource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'youtube';

			sessionBatch.push({
				guildId,
				botId,
				startedAt: getHourKey(firstRecord.playedAt),
				endedAt: new Date(getHourKey(lastRecord.playedAt).getTime() + 60 * 60 * 1000), // End of hour
				duration: totalDuration,
				listenerCount: 0, // PlayerHistory doesn't have listener count
				source: primarySource,
				trackName: null,
				trackUrl: null,
			});
		}

		for (let i = 0; i < sessionBatch.length; i += CHUNK_SIZE) {
			const chunk = sessionBatch.slice(i, i + CHUNK_SIZE);
			await prisma.playbackSession.createMany({
				data: chunk,
			});
			sessionCount += chunk.length;
			console.log(`  Migrated ${sessionCount}/${sessionBatch.length} PlaybackSession records...`);
		}
		console.log(`✓ Migrated ${sessionCount} PlaybackSession records.\n`);

		// Migrate HourlyStats data
		console.log('Migrating HourlyStats data...');
		let hourlyStatsCount = 0;
		const hourlyStatsBatch = Array.from(hourlyStatsMap.values()).map(stats => ({
			guildId: stats.guildId,
			botId: stats.botId,
			hour: stats.hour,
			sessionCount: stats.sessionCount,
			totalDuration: stats.totalDuration,
			avgListeners: 0, // PlayerHistory doesn't have listener count
			maxListeners: 0,
			minListeners: 0,
			youtubePlays: stats.youtubePlays,
			spotifyPlays: stats.spotifyPlays,
			soundcloudPlays: stats.soundcloudPlays,
		}));

		// Use upsert for each HourlyStats record to avoid duplicate key errors
		for (const stat of hourlyStatsBatch) {
			await prisma.hourlyStats.upsert({
				where: {
					guildId_botId_hour: {
						guildId: stat.guildId,
						botId: stat.botId,
						hour: stat.hour,
					}
				},
				update: stat,
				create: stat,
			});
			hourlyStatsCount++;
			if (hourlyStatsCount % 100 === 0 || hourlyStatsCount === hourlyStatsBatch.length) {
				console.log(`  Migrated ${hourlyStatsCount}/${hourlyStatsBatch.length} HourlyStats records...`);
			}
		}
		console.log(`✓ Migrated ${hourlyStatsCount} HourlyStats records.\n`);

		console.log('='.repeat(50));
		console.log('Migration completed successfully!');
		console.log('='.repeat(50));
		console.log(`Total TrackPlay records: ${trackPlayCount}`);
		console.log(`Total PlaybackSession records: ${sessionCount}`);
		console.log(`Total HourlyStats records: ${hourlyStatsCount}`);

	} catch (error) {
		console.error('Migration failed:', error);
		throw error;
	}
}

main()
	.catch((error) => {
		console.error('Fatal error during migration:', error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
