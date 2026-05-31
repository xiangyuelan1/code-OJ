import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import prisma from '../lib/prisma';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { message: '未提供认证Token' } });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = authService.verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, username: true }
    });

    if (!user) {
      res.status(401).json({ success: false, error: { message: '用户不存在或已被删除' } });
      return;
    }

    (req as any).user = {
      userId: user.id,
      role: user.role,
      username: user.username
    };
    next();
  } catch (error: any) {
    res.status(401).json({ success: false, error: { message: 'Token无效或已过期' } });
  }
};
