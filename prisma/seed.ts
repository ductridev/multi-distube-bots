import { PrismaClient } from '@prisma/client';
import botsData from './bots.json';

const prisma = new PrismaClient();

async function main() {
    const bots = botsData.bots;

    for (const bot of bots) {
        await prisma.botConfig.upsert({
            where: { clientId: bot.clientId },
            update: {
                name: bot.name,
                token: bot.token,
                prefix: bot.prefix,
                clientId: bot.clientId,
                status: bot.status || 'online',
                activity: bot.presence || 'Lavamusic',
                activityType: 0,
                active: bot.enabled ?? true,
            },
            create: {
                name: bot.name,
                token: bot.token,
                prefix: bot.prefix,
                clientId: bot.clientId,
                status: bot.status || 'online',
                activity: bot.presence || 'Lavamusic',
                activityType: 0,
                active: bot.enabled ?? true,
            },
        });

        console.log(`✅ Synced bot: ${bot.name} (${bot.prefix})`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
