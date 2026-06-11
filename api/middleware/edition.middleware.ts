import { Request, Response, NextFunction } from 'express';
import { getEditionConfig, EditionConfig } from '../../config/editions';

/**
 * 版本功能中间件工厂
 * 如果当前版本未启用指定功能，返回 404（该功能不存在）
 */
export function editionMiddleware(feature: keyof EditionConfig['features']) {
  const config = getEditionConfig();
  const enabled = config.features[feature];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) {
      res.status(404).json({
        success: false,
        error: { message: '当前版本不包含此功能', code: 'EDITION_FEATURE_DISABLED' },
      });
      return;
    }
    next();
  };
}

/**
 * 获取当前版本信息（用于前端获取版本配置）
 */
export function getEditionInfo() {
  const config = getEditionConfig();
  return {
    edition: process.env.EDITION || 'full',
    name: config.name,
    features: config.features,
  };
}
