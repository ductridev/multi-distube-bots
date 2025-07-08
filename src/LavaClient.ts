// import { type ClientOptions, GatewayIntentBits } from 'discord.js';
// import Lavamusic from './structures/Lavamusic';
// import yargs from 'yargs';
// import { hideBin } from 'yargs/helpers';
// import z from 'zod';

// const { GuildMembers, MessageContent, GuildVoiceStates, GuildMessages, Guilds, GuildMessageTyping } = GatewayIntentBits;

// const clientOptions: ClientOptions = {
// 	intents: [Guilds, GuildMessages, MessageContent, GuildVoiceStates, GuildMembers, GuildMessageTyping],
// 	allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
// };

// const argv = yargs(hideBin(process.argv))
// 	.string(['token', 'id', 'clientId', 'prefix', 'activity', 'status', 'name'])
// 	.argv as Record<string, string>;

// const childEnvSchema = z.object({
// 	token: z.string(),
// 	prefix: z.string(),
// 	activity: z.string().default('Tui tên Bô'),
// 	activityType: z.preprocess(val => {
// 		if (typeof val === 'string') {
// 			return Number.parseInt(val, 10);
// 		}
// 		return val;
// 	}, z.number().default(0)),
// 	status: z.preprocess(
// 		val => {
// 			if (typeof val === 'string') {
// 				return val.toLowerCase();
// 			}
// 			return val;
// 		},
// 		z.enum(['online', 'idle', 'dnd', 'invisible']).default('dnd'),
// 	),
// 	name: z.string(),
// 	id: z.string(),
// 	clientId: z.string(),
// });

// export const childEnv = childEnvSchema.parse(argv);

// const client = new Lavamusic(clientOptions);
// client.start(childEnv.token);


