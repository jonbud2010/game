import prisma from './client';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('🗄️  Connected to PostgreSQL database successfully');
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('🗄️  Disconnected from database');
  } catch (error) {
    logger.error('❌ Error disconnecting from database:', error);
    throw error;
  }
}

export { prisma };