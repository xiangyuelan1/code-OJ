import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const originalDatabaseUrl = process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasourceUrl: originalDatabaseUrl,
});

export default prisma;
