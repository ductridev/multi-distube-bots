// src/botManager.ts

import mongoose from 'mongoose';
import { BotConfigModel } from './models/BotConfig';
import { GlobalConfigModel } from './models/GlobalConfig';
import { createBot } from './bot/createBot';
import { getGlobalValue } from './utils/getGlobalConfig';
import seedConfig from './config.json';
import BotInstance from './@types/botInstance';
import { loadPluginsPartYoutube } from './bot/createDistube';
import { YouTubePlugin } from '@distube/youtube';

export const activeBots: BotInstance[] = [];

const initializeDatabase = async () => {
    const botCount = await BotConfigModel.countDocuments();
    if (botCount === 0) {
        console.log('⚙️ Seeding BotConfig from config.ts...');
        await BotConfigModel.insertMany(seedConfig.bots);
    }

    const globalCount = await GlobalConfigModel.countDocuments();
    if (globalCount === 0) {
        console.log('⚙️ Seeding GlobalConfig from config.ts...');
        await GlobalConfigModel.insertMany(seedConfig.globals);
    }
}

async function startAllBots() {
    if (!process.env.MONGOOSE_URL) {
        throw new Error('❌ MONGOOSE_URL is not defined in environment variables.');
    }
    if (!process.env.MONGOOSE_DB_NAME) {
        throw new Error('❌ MONGOOSE_DB_NAME is not defined in environment variables.');
    }
    await mongoose.connect(process.env.MONGOOSE_URL, {
        dbName: process.env.MONGOOSE_DB_NAME,
        serverSelectionTimeoutMS: 20000,
    });
    console.log('✅ [botManager] MongoDB đã kết nối.');

    await initializeDatabase();

    const bots = await BotConfigModel.find({ enabled: true });
    const mainPrefix = await getGlobalValue<string>('mainPrefix') ?? 'm';

    let youtubePlugin = new YouTubePlugin({
        ytdlOptions: {
            lang: 'vi',
            playerClients: ['WEB_EMBEDDED', 'WEB'],
        },
    });

    youtubePlugin = await loadPluginsPartYoutube(youtubePlugin);

    bots.forEach(botConfig => {
        createBot({ ...botConfig.toObject(), mainPrefix }, youtubePlugin);
    });
}

module.exports = startAllBots;
