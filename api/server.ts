import { createServer } from 'http';
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import app from './app.js';
import prisma from './lib/prisma.js';
import { setupSocketIO } from './services/socket.service.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * 获取数据库文件路径
 */
function resolveDbPath(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  const filePath = url.replace(/^file:/, '');
  if (filePath.startsWith('/')) return filePath;
  return join(process.cwd(), 'prisma', filePath);
}

/**
 * 直接用 SQL 检测并补齐缺失的列
 * 这是解决 prisma db push 对旧 SQLite 误判 "already in sync" 的终极方案
 * 不依赖 Prisma 迁移机制，直接 ALTER TABLE 添加缺失列
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
  } else {
    console.log('[DB] ✅ All required columns exist');
  }
}

/**
 * 确保缺失的表存在（通过 db push 创建）
 */
async function ensureMissingTables() {
  const requiredTables = ['ExamRanking', 'PricingPlan', 'Promotion', 'PromotionUsage'];
  for (const table of requiredTables) {
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
    } catch {
      console.log(`[DB] ⚠️  Table ${table} missing, running db push...`);
      try {
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
        console.log(`[DB] ✅ Table ${table} created`);
        return; // db push 会创建所有缺失的表，一次就够了
      } catch {
        console.warn(`[DB] ⚠️  db push failed for missing table ${table}`);
      }
      break;
    }
  }
}

async function initDatabase() {
  const dbPath = resolveDbPath();
  console.log(`[DB] Database file path: ${dbPath}`);
  console.log(`[DB] DATABASE_URL: ${process.env.DATABASE_URL}`);

  // 连接数据库
  try {
    await prisma.$connect();
    console.log('[DB] ✅ Database connected');
  } catch (error) {
    // 数据库文件不存在，需要创建
    console.log('[DB] Database not found, creating...');
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('[DB] ✅ Database created');
    } catch {
      console.error('[DB] ❌ Failed to create database');
      process.exit(1);
    }
    await prisma.$connect();
  }

  // 核心修复：直接用 SQL 补齐缺失列
  // 不依赖 prisma db push，因为 db push 对旧 SQLite 可能误判 "already in sync"
  await ensureSchemaColumns();

  // 补齐缺失的表
  await ensureMissingTables();

  // 最终验证
  try {
    await prisma.exam.findFirst();
    console.log('[DB] ✅ Database verification passed');
  } catch (e: any) {
    console.log(`[DB] ⚠️  Verification failed: ${e.message}`);
    console.log('[DB] Deleting old database and recreating...');
    await prisma.$disconnect();

    for (const p of [dbPath, dbPath.replace(/\.db$/, '-journal')]) {
      if (existsSync(p)) {
        try { unlinkSync(p); } catch { /* ignore */ }
        console.log(`[DB] Deleted ${p}`);
      }
    }

    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    await prisma.$connect();
    console.log('[DB] ✅ Reconnected to fresh database');
  }

  // Seed if empty
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('[DB] Database is empty, seeding...');
    try {
      execSync('npx tsx api/scripts/seed.ts', { stdio: 'inherit' });
      console.log('[DB] ✅ Seed data initialized');
    } catch (e) {
      console.error('[DB] ⚠️ Seed failed (non-fatal):', e);
    }
  } else {
    console.log(`[DB] ✅ Database has ${userCount} users, skipping seed`);
  }
}

async function startServer() {
  await initDatabase();

  const httpServer = createServer(app);
  setupSocketIO(httpServer);

  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 OJ System running on http://${HOST}:${PORT}`);
    console.log(`📋 Mode: ${process.env.NODE_ENV || 'development'}`);
  });

  const gracefulShutdown = async () => {
    console.log('Shutting down...');
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

startServer();
