import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PLAYER_POSITIONS_ENUM, DUMMY_PLAYER_SETTINGS, PLAYER_THEMES } from '@football-tcg/shared';
import type { PlayerColor, PlayerTheme } from '@football-tcg/shared';

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

  // Create themed players
  const themedPlayers = [];
  const colors: PlayerColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'PINK', 'CYAN'];
  const positions = ['ST', 'CM', 'CB', 'GK', 'LW', 'RW'];
  
  for (let i = 0; i < PLAYER_THEMES.length; i++) {
    const theme = PLAYER_THEMES[i] as PlayerTheme;
    const position = positions[i % positions.length] as string;
    const color = colors[i % colors.length] as PlayerColor;
    
    const themePlayerNames: Record<PlayerTheme, string> = {
      'TEN_D': 'David Alaba',
      'EIGHT_E': 'Toni Kroos',
      'ROWING': 'Leon Draisaitl',
      'HP': 'Harry Potter',
      'FOOTBALL': 'Lionel Messi',
      'MARVEL': 'Tony Stark'
    };
    
    const player = await prisma.player.upsert({
      where: { id: `themed-player-${theme.toLowerCase()}` },
      update: {},
      create: {
        id: `themed-player-${theme.toLowerCase()}`,
        name: themePlayerNames[theme],
        imageUrl: `/images/players/${theme.toLowerCase()}.png`,
        points: 75 + (i * 5),
        position: position,
        color: color,
        marketPrice: 800 + (i * 200),
        theme: theme,
        percentage: 0.04 + (i * 0.01),
      },
    });
    themedPlayers.push(player);
    console.log(`✅ Created themed player: ${player.name} (${theme})`);
  }

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

  // Create test pack with themed players
  const starterPack = await prisma.pack.create({
    data: {
      name: 'Starter Pack',
      imageUrl: '/images/packs/starter.png',
      price: 100,
      status: 'ACTIVE',
      packPlayers: {
        create: themedPlayers.slice(0, 3).map(player => ({
          player: {
            connect: { id: player.id }
          }
        }))
      }
    },
  });
  console.log(`✅ Created pack: ${starterPack.name}`);

  // Create dummy players for each position
  console.log('🤖 Creating dummy players...');
  
  for (const position of PLAYER_POSITIONS_ENUM) {
    const dummyPlayer = await prisma.player.upsert({
      where: { id: `dummy-${position.toLowerCase()}` },
      update: {},
      create: {
        id: `dummy-${position.toLowerCase()}`,
        name: `Dummy ${position}`,
        imageUrl: DUMMY_PLAYER_SETTINGS.IMAGE_URL,
        points: DUMMY_PLAYER_SETTINGS.POINTS,
        position: position,
        color: DUMMY_PLAYER_SETTINGS.COLOR,
        marketPrice: DUMMY_PLAYER_SETTINGS.MARKET_PRICE,
        theme: DUMMY_PLAYER_SETTINGS.THEME,
        percentage: DUMMY_PLAYER_SETTINGS.PERCENTAGE,
      },
    });
    console.log(`✅ Created dummy player: ${dummyPlayer.name}`);
  }

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