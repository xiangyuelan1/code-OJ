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
 * 直接用 SQL 检测并补齐缺失的列
 * 这是解决 prisma db push 对旧 SQLite 误判 "already in sync" 的终极方案
 * 不依赖 Prisma 迁移机制，直接 ALTER TABLE 添加缺失列
 */
async function ensureSchemaColumns() {
  // 定义所有需要检查的表和列
  // 格式: [表名, 列名, SQL类型, 默认值]
  const requiredColumns: [string, string, string, string][] = [
    // Exam 表新增列
    ['Exam', 'scope', 'TEXT', "'PUBLIC'"],
    ['Exam', 'classIds', 'TEXT', "'[]'"],
    ['Exam', 'pointsReward', 'INTEGER', '0'],
    ['Exam', 'medalEnabled', 'BOOLEAN', '0'],
    ['Exam', 'showRanking', 'BOOLEAN', '1'],
    ['Exam', 'passScore', 'INTEGER', '60'],
    ['Exam', 'maxAttempts', 'INTEGER', '1'],
    // ExamAttempt 表新增列
    ['ExamAttempt', 'totalScore', 'INTEGER', 'NULL'],
    ['ExamAttempt', 'timeTaken', 'INTEGER', 'NULL'],
  ];

  let addedCount = 0;
  for (const [table, column, type, defaultValue] of requiredColumns) {
    try {
      // 检查列是否已存在
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

  // 检查 ExamRanking 表是否存在
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM "ExamRanking" LIMIT 1');
  } catch {
    console.log('[DB] ExamRanking table missing, will be created by db push...');
  }

  if (addedCount > 0) {
    console.log(`[DB] ✅ Added ${addedCount} missing columns via direct SQL`);
  } else {
    console.log('[DB] ✅ All required columns exist');
  }
}

async function initDatabase() {
  const dbPath = resolveDbPath();
  console.log(`[DB] Database file path: ${dbPath}`);
  console.log(`[DB] DATABASE_URL: ${process.env.DATABASE_URL}`);

  // Step 1: 生成 Prisma Client
  console.log('[DB] Step 1/4: Generating Prisma Client...');
  runCmd('npx prisma generate', 'Prisma Client generated');

  // Step 2: 同步 schema（先尝试 db push）
  console.log('[DB] Step 2/4: Syncing schema to database...');
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

  // db push 后重新 generate
  runCmd('npx prisma generate', 'Prisma Client re-generated after db push');

  // Step 3: 连接 + 直接 SQL 补齐缺失列（兜底）
  console.log('[DB] Step 3/4: Connecting and ensuring schema...');
  try {
    await prisma.$connect();
    console.log('[DB] ✅ Database connected');
  } catch (error) {
    console.error('[DB] ❌ Database connection failed:', error);
    process.exit(1);
  }

  // 直接用 SQL 检测并补齐缺失列——这是最可靠的方式
  // 解决 prisma db push 对旧 SQLite 数据库误判 "already in sync" 的问题
  await ensureSchemaColumns();

  // 最终验证：用 Prisma Client 查询包含新字段的表
  try {
    await prisma.exam.findFirst();
    await prisma.examRanking.findFirst();
    console.log('[DB] ✅ Database verification passed');
  } catch (e: any) {
    console.log(`[DB] ⚠️  Verification still failing: ${e.message}`);
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
