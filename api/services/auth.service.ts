import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'oj-secret-key-2024';
const JWT_EXPIRES_IN = '24h';

export class AuthService {
  async register(username: string, email: string, password: string) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existingUser) {
      throw new Error('用户名或邮箱已存在');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'STUDENT'
      }
    });

    const token = this.generateToken(user.id, user.role);
    return { user, token };
  }

  async login(username: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }]
      }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    if (!user.isActive) {
      throw new Error('账户已被禁用');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('密码错误');
    }

    const token = this.generateToken(user.id, user.role);
    return { user, token };
  }

  async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        isActive: true
      }
    });
  }

  async getAllUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        isActive: true
      }
    });
  }

  async toggleUserStatus(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('用户不存在');
    
    return await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive }
    });
  }

  generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    } catch {
      throw new Error('无效的Token');
    }
  }

  async createAdmin() {
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@oj.com',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      console.log('默认管理员账户已创建: admin / admin123');
    }
  }
}

export const authService = new AuthService();
