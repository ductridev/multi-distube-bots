// src/scripts/seedGuildAccess.ts

import mongoose from 'mongoose';
import GuildAccess from '../models/GuildAccess';

const WHITELIST_GUILDS = [
    '780793541412651018',
    '1296090853177036814',
];

async function seed() {
    const uri = process.env.MONGOOSE_URL || 'mongodb://localhost:27017/logs';
    const dbName = process.env.MONGOOSE_DB_NAME || 'bot_logs';

    await mongoose.connect(uri, { dbName });
    console.log('📦 Connected to MongoDB');

    for (const guildId of WHITELIST_GUILDS) {
        await GuildAccess.findOneAndUpdate(
            { guildId },
            { guildId, type: 'whitelist' },
            { upsert: true }
        );
        console.log(`✅ Whitelisted guild ${guildId}`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
}

seed().catch(err => {
    console.error('❌ Seed error:', err);
    process.exit(1);
});
