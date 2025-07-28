import fs from 'fs/promises';
import path from 'path';
import { sessionMap } from '../..';

export const restoreSessions = async () => {
	const filePath = path.resolve(`${process.cwd()}/sessions-map.json`);

	await fs.mkdir(path.dirname(filePath), { recursive: true });

	let data: Record<string, Record<string, string>>;

	try {
		const raw = await fs.readFile(filePath, 'utf-8');
		data = JSON.parse(raw);
	} catch {
		console.warn(`[RESTORE] No session file found.`);
		return;
	}

	for (const [guildId, vcMap] of Object.entries(data)) {
		if (!sessionMap.has(guildId)) {
			sessionMap.set(guildId, new Map());
		}

		const guildMap = sessionMap.get(guildId)!;

		for (const [vcId, rawPlayerJson] of Object.entries(vcMap)) {
			// Don't revive into Player instance yet, just store raw
			guildMap.set(vcId, rawPlayerJson);
			console.log(`[RESTORE] Restored session for guild ${guildId}, VC ${vcId}`);
		}
	}
};