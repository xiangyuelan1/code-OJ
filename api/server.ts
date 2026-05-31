import express from 'express';
import { createServer } from 'http';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import app from './app.js';
import prisma from './lib/prisma.js';
import { setupSocketIO } from './services/socket.service.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * 数据库初始化流程
 *
 * 关键设计决策：使用 prisma db push 而非 prisma migrate deploy
 *
 * 原因：开发阶段频繁迭代 schema，使用 db push 直接同步 schema 到数据库，
 * 不依赖迁移文件历史。migrate deploy 要求迁移文件与 schema 完全对应，
 * 但快速迭代中迁移文件往往滞后于 schema 变更，导致部署后数据库缺少表/字段。
 *
 * 流程：prisma generate（确保 Client 与 schema 一致）→ prisma db push（同步 schema 到数据库）
 */
async function initDatabase() {
  console.log('[DB] Step 1/3: Generating Prisma Client from schema...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('[DB] ✅ Prisma Client generated');
  } catch (e) {
    console.error('[DB] ❌ Prisma generate failed:', e);
    process.exit(1);
  }

  console.log('[DB] Step 2/3: Syncing schema to database (prisma db push)...');
  try {
    execSync('npx prisma db push', { stdio: 'inherit' });
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

  console.log('[DB] Step 3/3: Connecting to database...');
  try {
    await prisma.$connect();
    console.log('[DB] ✅ Database connected');
  } catch (error) {
    console.error('[DB] ❌ Database connection failed:', error);
    process.exit(1);
  }

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
