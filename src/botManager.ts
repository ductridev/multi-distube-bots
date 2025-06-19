// src/botManager.ts
// Load .env
import 'dotenv/config'

import mongoose from 'mongoose';
import { BotConfigModel } from './models/BotConfig';
import { GlobalConfigModel } from './models/GlobalConfig';
import { createBot } from './bot/createBot';
import { getGlobalValue } from './utils/getGlobalConfig';
import seedConfig from './config.json';
import BotInstance from './@types/botInstance';

const activeBots: BotInstance[] = [];

async function initializeDatabase() {
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
    });
    console.log('✅ MongoDB đã kết nối.');

    await initializeDatabase();

    const bots = await BotConfigModel.find({ enabled: true });
    const mainPrefix = await getGlobalValue<string>('mainPrefix') ?? 'm';

    bots.forEach(botConfig => {
        createBot({ ...botConfig.toObject(), mainPrefix }, activeBots);
    });
}

module.exports = startAllBots;
