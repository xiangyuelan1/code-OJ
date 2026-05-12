import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import app from './app.js';
import { setupSocketIO } from './services/socket.service.js';

dotenv.config();

const PORT = process.env.PORT || 3005;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5175';

const httpServer = createServer(app);

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

setupSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`🌐 前端地址: ${FRONTEND_URL}`);
  console.log(`📡 WebSocket 已启用`);
});
