import { Request, Response, NextFunction } from 'express';
import { featureToggleService } from '../services/feature-toggle.service';
import prisma from '../lib/prisma';
import { getEditionConfig } from '../../config/editions';

/**
 * 功能权限中间件工厂
 * 校验当前用户是否有权限使用指定功能
 * @param featureKey 功能标识，对应 SystemFeature 表中的 featureKey
 */
export function featureMiddleware(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 私有部署版不做功能权限区分，所有功能对所有用户开放
    if (!getEditionConfig().features.accessControl) {
      next();
      return;
    }

    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, error: { message: '未认证' } });
      return;
    }

    // 查询用户 accessType
    const userInfo = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { accessType: true },
    });

    const accessType = userInfo?.accessType || 'TRIAL';
    const result = await featureToggleService.checkFeatureAccess(featureKey, user.role, accessType);

    if (!result.allowed) {
      res.status(403).json({
        success: false,
        error: { message: result.reason || '权限不足', code: 'FEATURE_RESTRICTED' },
      });
      return;
    }

    next();
  };
}
