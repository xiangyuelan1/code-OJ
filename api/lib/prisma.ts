import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// 直接使用 DATABASE_URL，不手动转换路径
// Prisma 对 SQLite 的 file:./dev.db 解析为相对于 schema.prisma 所在目录
const prisma = new PrismaClient();

export default prisma;
