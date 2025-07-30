import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@footballtcg.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@footballtcg.com',
      passwordHash: adminPasswordHash,
      coins: 10000,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Created admin user: ${admin.username}`);

  // Create test players
  const testPlayer = await prisma.player.upsert({
    where: { id: 'test-player-1' },
    update: {},
    create: {
      id: 'test-player-1',
      name: 'Max Mustermann',
      imageUrl: '/images/players/max-mustermann.png',
      points: 85,
      position: 'ST',
      color: 'BLUE',
      marketPrice: 1000,
      theme: 'Bundesliga',
      percentage: 0.05,
    },
  });
  console.log(`✅ Created test player: ${testPlayer.name}`);

  // Create test formation
  const formation433 = await prisma.formation.upsert({
    where: { id: 'formation-433' },
    update: {},
    create: {
      id: 'formation-433',
      name: '4-3-3',
      imageUrl: '/images/formations/433.png',
      positions: JSON.stringify([
        'GK', 'LB', 'CB', 'CB', 'RB', 
        'CDM', 'CM', 'CAM', 
        'LW', 'ST', 'RW'
      ]),
    },
  });
  console.log(`✅ Created formation: ${formation433.name}`);

  // Create test pack
  const starterPack = await prisma.pack.create({
    data: {
      name: 'Starter Pack',
      imageUrl: '/images/packs/starter.png',
      price: 100,
      status: 'ACTIVE',
      packPlayers: {
        create: [
          {
            player: {
              connect: { id: testPlayer.id }
            }
          }
        ]
      }
    },
  });
  console.log(`✅ Created pack: ${starterPack.name}`);

  console.log('🌱 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });