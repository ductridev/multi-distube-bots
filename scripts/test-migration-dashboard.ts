/**
 * Phase 5 Database Test - Verify New Models
 * 
 * This script tests all new database models added in Phase 5:
 * - DashboardUser
 * - DashboardSession
 * - AuditLog
 * - BotStats
 * - PlayerHistory
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPhase5Models() {
  console.log('🧪 Testing Phase 5 Database Models...\n');

  try {
    // Test 1: DashboardUser Model
    console.log('1️⃣ Testing DashboardUser model...');
    const testUser = await prisma.dashboardUser.create({
      data: {
        discordId: 'test-' + Date.now(),
        username: 'TestUser',
        avatar: 'https://cdn.discordapp.com/avatars/test.png',
        role: 'admin',
        managedBots: ['bot-1', 'bot-2']
      }
    });
    console.log('   ✅ DashboardUser created:', testUser.username);

    // Test 2: DashboardSession Model
    console.log('\n2️⃣ Testing DashboardSession model...');
    const testSession = await prisma.dashboardSession.create({
      data: {
        userId: testUser.id,
        token: 'test-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: '127.0.0.1',
        userAgent: 'Test/1.0'
      }
    });
    console.log('   ✅ DashboardSession created:', testSession.token);

    // Test 3: AuditLog Model
    console.log('\n3️⃣ Testing AuditLog model...');
    const testLog = await prisma.auditLog.create({
      data: {
        userId: testUser.id,
        action: 'test.action',
        target: 'test-target',
        metadata: {
          testField: 'testValue',
          timestamp: new Date().toISOString()
        }
      }
    });
    console.log('   ✅ AuditLog created:', testLog.action);

    // Test 4: BotStats Model
    console.log('\n4️⃣ Testing BotStats model...');
    const testStats = await prisma.botStats.create({
      data: {
        clientId: 'test-bot-' + Date.now(),
        guildCount: 100,
        playerCount: 5,
        totalPlays: 1000,
        uptime: 3600,
        memory: 512.5,
        cpu: 25.3,
        latency: 50
      }
    });
    console.log('   ✅ BotStats created: Guilds:', testStats.guildCount);

    // Test 5: PlayerHistory Model
    console.log('\n5️⃣ Testing PlayerHistory model...');
    const testHistory = await prisma.playerHistory.create({
      data: {
        guildId: 'test-guild-' + Date.now(),
        clientId: 'test-bot-' + Date.now(),
        trackUrl: 'https://youtube.com/watch?v=test',
        trackTitle: 'Test Track',
        author: 'test-user-123',
        duration: 180000
      }
    });
    console.log('   ✅ PlayerHistory created:', testHistory.trackTitle);

    // Test 6: Relations
    console.log('\n6️⃣ Testing Relations...');
    const userWithRelations = await prisma.dashboardUser.findUnique({
      where: { id: testUser.id },
      include: {
        sessions: true,
        auditLogs: true
      }
    });
    if (userWithRelations) {
      console.log('   ✅ User has', userWithRelations.sessions.length, 'session(s)');
      console.log('   ✅ User has', userWithRelations.auditLogs.length, 'audit log(s)');
    }

    // Test 7: Indexes (Query Performance)
    console.log('\n7️⃣ Testing Indexes...');
    const statsByClientId = await prisma.botStats.findMany({
      where: { clientId: testStats.clientId },
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    console.log('   ✅ BotStats index query successful:', statsByClientId.length, 'record(s)');

    const historyByGuild = await prisma.playerHistory.findMany({
      where: { guildId: testHistory.guildId },
      orderBy: { playedAt: 'desc' },
      take: 10
    });
    console.log('   ✅ PlayerHistory index query successful:', historyByGuild.length, 'record(s)');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.dashboardSession.delete({ where: { id: testSession.id } });
    await prisma.auditLog.delete({ where: { id: testLog.id } });
    await prisma.dashboardUser.delete({ where: { id: testUser.id } });
    await prisma.botStats.delete({ where: { id: testStats.id } });
    await prisma.playerHistory.delete({ where: { id: testHistory.id } });
    console.log('   ✅ Test data cleaned up');

    console.log('\n✅ All Phase 5 models are working correctly!\n');
    console.log('📊 Summary:');
    console.log('   - DashboardUser: ✅ Working');
    console.log('   - DashboardSession: ✅ Working');
    console.log('   - AuditLog: ✅ Working');
    console.log('   - BotStats: ✅ Working');
    console.log('   - PlayerHistory: ✅ Working');
    console.log('   - Relations: ✅ Working');
    console.log('   - Indexes: ✅ Working\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPhase5Models()
  .then(() => {
    console.log('🎉 Phase 5 Database Test Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
