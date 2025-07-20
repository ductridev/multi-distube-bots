import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

config({
	path: path.join(__dirname, '../.env'),
});

const LavalinkNodeSchema = z.object({
	id: z.string(),
	host: z.string(),
	port: z.number(),
	authorization: z.string(),
	secure: z.preprocess(val => (val === 'true' || val === 'false' ? val === 'true' : val), z.boolean().optional()),
	sessionId: z.string().optional(),
	regions: z.string().array().optional(),
	retryAmount: z.number().optional(),
	retryDelay: z.number().optional(),
	requestSignalTimeoutMS: z.number().optional(),
	closeOnError: z.preprocess(val => (val === 'true' || val === 'false' ? val === 'true' : val), z.boolean().optional()),
	heartBeatInterval: z.number().optional(),
	enablePingOnStatsCheck: z.preprocess(val => (val === 'true' || val === 'false' ? val === 'true' : val), z.boolean().optional()),
});

const envSchema = z.object({
	GLOBAL_PREFIX: z.string().default('b!'),
	DEFAULT_LANGUAGE: z.string().default('Vietnamese'),
	OWNER_IDS: z.preprocess(val => (typeof val === 'string' ? JSON.parse(val) : val), z.string().array().optional()),
	GUILD_ID: z.string().optional(),
	TOPGG: z.string().optional(),
	KEEP_ALIVE: z.preprocess(val => val === 'true', z.boolean().default(false)),
	LOG_CHANNEL_ID: z.string().optional(),
	LOG_COMMANDS_ID: z.string().optional(),
	DATABASE_URL: z.string().optional(),
	SEARCH_ENGINE: z.preprocess(
		val => {
			if (typeof val === 'string') {
				return val.toLowerCase();
			}
			return val;
		},
		z
			.enum(['youtube', 'youtubemusic', 'soundcloud', 'spotify', 'apple', 'deezer', 'yandex', 'jiosaavn'])
			.default('youtube'),
	),
	NODES: z.preprocess(val => (typeof val === 'string' ? JSON.parse(val) : val), z.array(LavalinkNodeSchema)),
	GENIUS_API: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

for (const key in env) {
	if (!(key in env)) {
		throw new Error(`Missing env variable: ${key}. Please check the .env file and try again.`);
	}
}


