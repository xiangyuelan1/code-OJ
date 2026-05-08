import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { message: '未提供认证Token' } });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = authService.verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({ success: false, error: { message: error.message } });
  }
};
