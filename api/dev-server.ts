import { createServer } from 'http';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import app from './app.js';
import prisma from './lib/prisma.js';
import { setupSocketIO } from './services/socket.service.js';

dotenv.config();

const PORT = process.env.PORT || 3005;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5175';

/**
 * 开发环境启动前自动同步 Prisma Client 和数据库
 * 解决核心问题：schema 变更后，如果只 db push 而不 generate，
 * Prisma Client 仍使用旧版类型定义，导致查询新字段时报 "column does not exist"
 */
function syncPrisma() {
  console.log('[Prisma Sync] Step 1/2: Generating Prisma Client...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('[Prisma Sync] ✅ Prisma Client generated');
  } catch (e) {
    console.error('[Prisma Sync] ❌ prisma generate failed:', e);
    process.exit(1);
  }

  console.log('[Prisma Sync] Step 2/2: Pushing schema to database...');
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('[Prisma Sync] ✅ Database schema synced');
  } catch (e) {
    console.error('[Prisma Sync] ❌ prisma db push failed:', e);
    process.exit(1);
  }
}

async function startServer() {
  // 启动前同步 schema → client + database
  syncPrisma();

  // 验证数据库连接
  try {
    await prisma.$connect();
    console.log('[Prisma Sync] ✅ Database connected');
  } catch (e) {
    console.error('[Prisma Sync] ❌ Database connection failed:', e);
    process.exit(1);
  }

  const httpServer = createServer(app);
  setupSocketIO(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`🌐 前端地址: ${FRONTEND_URL}`);
    console.log(`📡 WebSocket 已启用`);
  });
}

startServer();
