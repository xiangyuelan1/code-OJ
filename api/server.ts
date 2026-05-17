import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import prisma from './lib/prisma.js';
import { setupSocketIO } from './services/socket.service.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function initDatabase() {
  try {
    await prisma.$connect();
    console.log('Database connected');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

async function startServer() {
  await initDatabase();

  const httpServer = createServer(app);
  setupSocketIO(httpServer);

  httpServer.listen(PORT, HOST, () => {
    console.log(`OJ System running on http://${HOST}:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}

startServer();
