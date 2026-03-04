/**
 * Script to clear TrackPlay data and re-run migration
 * 
 * This script:
 * 1. Deletes all existing TrackPlay records
 * 2. Re-migrates TrackPlay data from PlayerHistory with updated URL extraction logic
 * 
 * Usage: npx tsx scripts/remigrate-track-plays.ts
 * 
 * Options:
 *   --dry-run  Show what would be deleted/migrated without making changes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

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

async function main() {
	console.log('='.repeat(60));
	console.log('TrackPlay Re-migration Script');
	console.log('='.repeat(60));
	
	if (isDryRun) {
		console.log('\n[DRY RUN MODE] No changes will be made to the database.\n');
	}

	try {
		// Step 1: Count existing TrackPlay records
		console.log('Step 1: Counting existing TrackPlay records...');
		const existingCount = await prisma.trackPlay.count();
		console.log(`  Found ${existingCount} existing TrackPlay records.\n`);

		if (existingCount === 0) {
			console.log('No TrackPlay records to delete. Proceeding with migration...\n');
		} else {
			// Step 2: Delete all existing TrackPlay records
			console.log('Step 2: Deleting existing TrackPlay records...');
			if (!isDryRun) {
				const deleteResult = await prisma.trackPlay.deleteMany({});
				console.log(`  ✓ Deleted ${deleteResult.count} TrackPlay records.\n`);
			} else {
				console.log(`  [DRY RUN] Would delete ${existingCount} TrackPlay records.\n`);
			}
		}

		// Step 3: Get all PlayerHistory records for re-migration
		console.log('Step 3: Fetching PlayerHistory records for re-migration...');
		const playerHistory = await prisma.playerHistory.findMany({
			orderBy: { playedAt: 'asc' },
		});

		console.log(`  Found ${playerHistory.length} PlayerHistory records.\n`);

		if (playerHistory.length === 0) {
			console.log('No PlayerHistory data to migrate. Exiting.');
			return;
		}

		// Step 4: Prepare TrackPlay batch with URL extraction fallback
		console.log('Step 4: Preparing TrackPlay records with URL extraction fallback...');
		let fallbackCount = 0;
		let unknownTrackCount = 0;
		let validTitleCount = 0;

		const trackPlayBatch = playerHistory.map(record => {
			// Check if track title is empty, null, or undefined
			const hasValidTitle = record.trackTitle && record.trackTitle.trim() !== '';
			
			// Determine the track name with fallback logic
			let trackName: string;
			if (hasValidTitle) {
				trackName = record.trackTitle!;
				validTitleCount++;
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

			return {
				guildId: record.guildId,
				botId: record.clientId,
				trackName,
				trackUrl: record.trackUrl,
				source: detectSourceFromUrl(record.trackUrl),
				duration: Math.floor(record.duration / 1000), // Convert ms to seconds
				playedAt: record.playedAt,
				playedBy: record.author,
			};
		});

		console.log(`  Track title statistics:`);
		console.log(`    - ${validTitleCount} records with valid titles`);
		console.log(`    - ${fallbackCount} records used URL extraction fallback`);
		console.log(`    - ${unknownTrackCount} records defaulted to "Unknown Track"\n`);

		// Step 5: Batch insert TrackPlay records
		console.log('Step 5: Inserting TrackPlay records...');
		
		if (isDryRun) {
			console.log(`  [DRY RUN] Would insert ${trackPlayBatch.length} TrackPlay records.\n`);
		} else {
			const CHUNK_SIZE = 1000;
			let insertedCount = 0;

			for (let i = 0; i < trackPlayBatch.length; i += CHUNK_SIZE) {
				const chunk = trackPlayBatch.slice(i, i + CHUNK_SIZE);
				await prisma.trackPlay.createMany({
					data: chunk,
				});
				insertedCount += chunk.length;
				console.log(`  Inserted ${insertedCount}/${trackPlayBatch.length} TrackPlay records...`);
			}
			console.log(`  ✓ Successfully inserted ${insertedCount} TrackPlay records.\n`);
		}

		// Summary
		console.log('='.repeat(60));
		if (isDryRun) {
			console.log('[DRY RUN COMPLETE]');
			console.log('Run without --dry-run to apply changes.');
		} else {
			console.log('Re-migration completed successfully!');
		}
		console.log('='.repeat(60));
		console.log(`Summary:`);
		console.log(`  - Deleted: ${isDryRun ? existingCount + ' (dry run)' : existingCount} TrackPlay records`);
		console.log(`  - Migrated: ${isDryRun ? trackPlayBatch.length + ' (dry run)' : trackPlayBatch.length} TrackPlay records`);
		console.log(`  - URL extraction fallback used: ${fallbackCount} records`);
		console.log(`  - Unknown track defaults: ${unknownTrackCount} records`);

	} catch (error) {
		console.error('\n❌ Re-migration failed:', error);
		throw error;
	}
}

main()
	.catch((error) => {
		console.error('Fatal error during re-migration:', error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
