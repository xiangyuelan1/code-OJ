import express from 'express';
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
 * 从 DATABASE_URL 环境变量中提取 SQLite 数据库文件路径
 * 支持格式: file:./dev.db / file:/app/prisma/dev.db
 */
function resolveDbPath(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  const filePath = url.replace(/^file:/, '');
  if (filePath.startsWith('/')) return filePath;
  return join(process.cwd(), 'prisma', filePath);
}

/**
 * 验证数据库结构是否与 Prisma Client 一致
 * 通过尝试查询已知应该存在的表来检测 schema 漂移
 */
async function verifyDatabase(): Promise<boolean> {
  try {
    await prisma.exam.findFirst();
    return true;
  } catch {
    return false;
  }
}

async function initDatabase() {
  console.log('[DB] Step 1/4: Generating Prisma Client from schema...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('[DB] ✅ Prisma Client generated');
  } catch (e) {
    console.error('[DB] ❌ Prisma generate failed:', e);
    process.exit(1);
  }

  const dbPath = resolveDbPath();
  console.log(`[DB] Database file path: ${dbPath}`);

  console.log('[DB] Step 2/4: Syncing schema to database (prisma db push)...');
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('[DB] ✅ Database schema synced');
  } catch (e) {
    console.error('[DB] ❌ prisma db push failed, attempting fallback...');
    try {
      execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
      console.log('[DB] ✅ Database initialized via migrate dev');
    } catch (e2) {
      console.error('[DB] ❌ All database init methods failed:', e2);
      process.exit(1);
    }
  }

  console.log('[DB] Step 3/4: Connecting to database...');
  try {
    await prisma.$connect();
    console.log('[DB] ✅ Database connected');
  } catch (error) {
    console.error('[DB] ❌ Database connection failed:', error);
    process.exit(1);
  }

  const isValid = await verifyDatabase();
  if (!isValid) {
    console.log('[DB] ⚠️  Database verification failed — schema drift detected');
    console.log('[DB] Deleting old database and recreating from schema...');
    await prisma.$disconnect();

    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
      console.log(`[DB] Deleted ${dbPath}`);
    }
    const journalPath = dbPath.replace(/\.db$/, '-journal');
    if (existsSync(journalPath)) {
      unlinkSync(journalPath);
    }

    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('[DB] ✅ Database recreated from schema');

    await prisma.$connect();
    console.log('[DB] ✅ Reconnected to fresh database');
  }

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
