import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './db/connection.js';
import apiRoutes from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, async () => {
  console.log(`🚀 Football TCG Backend running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  
  // Connect to database
  try {
    await connectDatabase();
  } catch (error) {
    console.error('Failed to connect to database on startup');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

export default app;