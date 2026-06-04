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
 * 直接用 SQL 检测并补齐缺失的列
 */
async function ensureSchemaColumns() {
  const requiredColumns: [string, string, string, string][] = [
    ['Exam', 'scope', 'TEXT', "'PUBLIC'"],
    ['Exam', 'classIds', 'TEXT', "'[]'"],
    ['Exam', 'pointsReward', 'INTEGER', '0'],
    ['Exam', 'medalEnabled', 'BOOLEAN', '0'],
    ['Exam', 'showRanking', 'BOOLEAN', '1'],
    ['Exam', 'passScore', 'INTEGER', '60'],
    ['Exam', 'maxAttempts', 'INTEGER', '1'],
    ['ExamAttempt', 'totalScore', 'INTEGER', 'NULL'],
    ['ExamAttempt', 'timeTaken', 'INTEGER', 'NULL'],
  ];

  let addedCount = 0;
  for (const [table, column, type, defaultValue] of requiredColumns) {
    try {
      const columns: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
      const columnExists = columns.some((c: any) => c.name === column);
      if (!columnExists) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${table}" ADD COLUMN "${column}" ${type} DEFAULT ${defaultValue}`
        );
        console.log(`[DB] ✅ Added missing column: ${table}.${column}`);
        addedCount++;
      }
    } catch (e: any) {
      console.warn(`[DB] ⚠️  Could not add ${table}.${column}: ${e.message}`);
    }
  }
  if (addedCount > 0) {
    console.log(`[DB] ✅ Added ${addedCount} missing columns via direct SQL`);
  }
}

async function startServer() {
  // 同步数据库 schema
  console.log('[DB] Syncing database schema...');
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('[DB] ✅ Database schema synced');
  } catch (e) {
    console.error('[DB] ❌ prisma db push failed:', e);
    process.exit(1);
  }

  // 连接数据库
  try {
    await prisma.$connect();
    console.log('[DB] ✅ Database connected');
  } catch (e) {
    console.error('[DB] ❌ Database connection failed:', e);
    process.exit(1);
  }

  // 兜底：直接 SQL 补齐缺失列
  await ensureSchemaColumns();

  const httpServer = createServer(app);
  setupSocketIO(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`🌐 前端地址: ${FRONTEND_URL}`);
    console.log(`📡 WebSocket 已启用`);
  });
}

startServer();
