/**
 * Test runner utility to validate the BDD test infrastructure
 */

import { testDb } from './testDatabase.js';
import { createTestFactories } from './testFactories.js';

export async function validateTestInfrastructure(): Promise<boolean> {
  try {
    console.log('🔧 Validating test infrastructure...');

    // Test database initialization
    console.log('📁 Testing database initialization...');
    await testDb.initialize();
    console.log('✅ Database initialized successfully');

    // Test factories
    console.log('🏭 Testing data factories...');
    const factories = createTestFactories(testDb.getPrisma());
    
    const testUser = await factories.createUser();
    console.log('✅ User factory working:', testUser.username);

    const testPlayer = await factories.createPlayer();
    console.log('✅ Player factory working:', testPlayer.name);

    const testPack = await factories.createPack();
    console.log('✅ Pack factory working:', testPack.name);

    // Test database cleanup
    console.log('🧹 Testing database cleanup...');
    await testDb.clean();
    console.log('✅ Database cleanup successful');

    // Test formations exist (from seeding)
    console.log('⚽ Testing formation seeding...');
    const formations = await testDb.getPrisma().formation.findMany();
    console.log(`✅ Found ${formations.length} formations`);

    console.log('🎉 All test infrastructure components validated successfully!');
    return true;

  } catch (error) {
    console.error('❌ Test infrastructure validation failed:', error);
    return false;
  } finally {
    await testDb.disconnect();
  }
}

// Run validation if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  validateTestInfrastructure()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(() => {
      process.exit(1);
    });
}