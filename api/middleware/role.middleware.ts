import { Request, Response, NextFunction } from 'express';

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ success: false, error: { message: '未认证' } });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ success: false, error: { message: '权限不足' } });
      return;
    }

    next();
  };
};
