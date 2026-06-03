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
 * 获取数据库文件路径，用于验证和删除操作
 * Prisma 对 SQLite 的 file:./dev.db 解析为相对于 schema.prisma 所在目录（即 prisma/）
 */
function resolveDbPath(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  const filePath = url.replace(/^file:/, '');
  if (filePath.startsWith('/')) return filePath;
  return join(process.cwd(), 'prisma', filePath);
}

/**
 * 执行 shell 命令
 */
function runCmd(cmd: string, label: string) {
  console.log(`[DB] Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`[DB] ✅ ${label}`);
  } catch (e) {
    console.error(`[DB] ❌ ${label} failed`);
    throw e;
  }
}

/**
 * 验证数据库结构是否与 Prisma Client 一致
 * Prisma findFirst 会 SELECT 所有列，缺少列时抛出 P2022
 */
async function verifyDatabase(): Promise<{ valid: boolean; error?: string }> {
  try {
    await prisma.exam.findFirst();
    await prisma.pricingPlan.findFirst();
    await prisma.examRanking.findFirst();
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}

/**
 * 强制清理 Prisma 迁移追踪表，使 db push 能正确检测 schema 差异
 * 解决核心问题：旧数据库有 _prisma_migrations 表，导致 db push
 * 误判为 "already in sync" 而跳过实际需要的 schema 变更
 */
async function cleanMigrationTracking() {
  try {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS _prisma_migrations');
    console.log('[DB] ✅ Cleaned _prisma_migrations table');
  } catch {
    // 表不存在，忽略
  }
}

async function initDatabase() {
  const dbPath = resolveDbPath();
  console.log(`[DB] Database file path: ${dbPath}`);
  console.log(`[DB] DATABASE_URL: ${process.env.DATABASE_URL}`);

  // Step 1: 生成 Prisma Client
  console.log('[DB] Step 1/4: Generating Prisma Client...');
  runCmd('npx prisma generate', 'Prisma Client generated');

  // Step 2: 清理迁移追踪 + 同步 schema
  console.log('[DB] Step 2/4: Syncing schema to database...');

  // 先连接数据库清理迁移追踪表，确保 db push 不会误判
  try {
    await prisma.$connect();
    await cleanMigrationTracking();
    await prisma.$disconnect();
  } catch {
    // 数据库可能不存在，忽略
  }

  try {
    runCmd('npx prisma db push --accept-data-loss', 'Database schema synced');
  } catch {
    console.log('[DB] ⚠️  db push failed, trying migrate dev...');
    try {
      runCmd('npx prisma migrate dev --name init', 'Database initialized via migrate');
    } catch {
      console.error('[DB] ❌ All database init methods failed');
      process.exit(1);
    }
  }

  // db push 后重新 generate，确保 Client 与实际数据库完全一致
  runCmd('npx prisma generate', 'Prisma Client re-generated after db push');

  // Step 3: 连接并验证
  console.log('[DB] Step 3/4: Connecting and verifying...');
  try {
    await prisma.$connect();
    console.log('[DB] ✅ Database connected');
  } catch (error) {
    console.error('[DB] ❌ Database connection failed:', error);
    process.exit(1);
  }

  const { valid, error } = await verifyDatabase();
  if (!valid) {
    console.log(`[DB] ⚠️  Database verification failed: ${error}`);
    console.log('[DB] Deleting old database and recreating...');
    await prisma.$disconnect();

    for (const p of [dbPath, dbPath.replace(/\.db$/, '-journal')]) {
      if (existsSync(p)) {
        unlinkSync(p);
        console.log(`[DB] Deleted ${p}`);
      }
    }

    runCmd('npx prisma db push', 'Database recreated from schema');
    runCmd('npx prisma generate', 'Prisma Client re-generated');

    await prisma.$connect();
    console.log('[DB] ✅ Reconnected to fresh database');
  } else {
    console.log('[DB] ✅ Database verification passed');
  }

  // Step 4: Seed if empty
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('[DB] Step 4/4: Database is empty, seeding...');
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
