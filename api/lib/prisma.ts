import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
  const dbFilePath = process.env.DATABASE_URL.replace('file:', '');
  if (!path.isAbsolute(dbFilePath)) {
    const absPath = path.resolve(process.cwd(), dbFilePath).replace(/\\/g, '/');
    process.env.DATABASE_URL = `file:${absPath}`;
  }
}

const prisma = new PrismaClient();

export default prisma;
