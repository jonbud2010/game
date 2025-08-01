/**
 * Jest Integration Test Global Teardown
 * Cleanup nach allen Tests
 */

import fs from 'fs';
import path from 'path';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up after integration tests...');

  // Entferne Test-Database
  const testDbPath = path.join(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
      console.log('✅ Test database cleaned up');
    } catch (error) {
      console.warn('⚠️  Could not remove test database:', error);
    }
  }

  // Entferne andere Test-Dateien falls vorhanden
  const testFilesToClean = [
    'test.db-journal',
    'test.db-wal',
    'test.db-shm'
  ];

  for (const file of testFilesToClean) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn(`⚠️  Could not remove ${file}:`, error);
      }
    }
  }

  console.log('🎉 Integration test cleanup complete');
}