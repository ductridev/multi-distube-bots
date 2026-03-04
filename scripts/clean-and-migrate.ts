import { PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning TrackPlay collection...');
  
  // Get the MongoDB connection string from environment
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set');
  }
  
  const client = new MongoClient(connectionString);
  await client.connect();
  
  const db = client.db();
  
  // Drop the TrackPlay collection
  try {
    await db.collection('TrackPlay').drop();
    console.log('TrackPlay collection dropped');
  } catch (error) {
    console.log('TrackPlay collection may not exist, continuing...');
  }
  
  // Drop the HourlyStats collection too
  try {
    await db.collection('HourlyStats').drop();
    console.log('HourlyStats collection dropped');
  } catch (error) {
    console.log('HourlyStats collection may not exist, continuing...');
  }
  
  await client.close();
  
  console.log('Now run: npx tsx scripts/migrate-stats-data.ts');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
