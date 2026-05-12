/**
 * local server entry file, for local development
 */
import app from './app.js';
import prisma from './lib/prisma.js';

/**
 * initialize database connection
 */
async function initDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

/**
 * start server with port
 */
const PORT = parseInt(process.env.PORT || '3005', 10);
const HOST = '0.0.0.0'; // 允许内网访问

async function startServer() {
  await initDatabase();

  const server = app.listen(PORT, HOST, () => {
    console.log(`✅ Server ready on http://${HOST}:${PORT}`);
    console.log(`📡 LAN访问地址: http://你的IP地址:${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Server closed');
      process.exit(0);
    });
  });
}

startServer();

export default app;