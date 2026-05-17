import prisma from '../lib/prisma';

const DEFAULT_TRIAL_DAYS = 3;

export class AccessService {
  /**
   * 检查用户是否有访问权限
   * ADMIN/TEACHER 角色始终有权限
   * accessType 为 ADMIN 时始终有权限
   * STUDENT 根据 accessType 判断：
   *   - TRIAL: 检查试用期（天数从 SystemConfig 读取）
   *   - PAID: 检查到期时间
   *   - CLASS: 检查班级成员关系
   *   - 若 accessType 非 CLASS 但用户实际属于某班级，也视为有 CLASS 权限
   */
  async checkAccess(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        accessType: true,
        trialStartsAt: true,
        accessExpiresAt: true,
      },
    });

    if (!user) {
      return { hasAccess: false, accessType: 'NONE', message: '用户不存在' };
    }

    if (user.role === 'ADMIN' || user.role === 'TEACHER') {
      return { hasAccess: true, accessType: user.role, expiresAt: undefined };
    }

    if (user.accessType === 'ADMIN') {
      return { hasAccess: true, accessType: 'ADMIN', expiresAt: undefined };
    }

    if (user.accessType === 'PAID') {
      if (user.accessExpiresAt && user.accessExpiresAt > new Date()) {
        return { hasAccess: true, accessType: 'PAID', expiresAt: user.accessExpiresAt };
      }
      return {
        hasAccess: false,
        accessType: 'PAID',
        expiresAt: user.accessExpiresAt ?? undefined,
        message: '付费访问已过期',
      };
    }

    if (user.accessType === 'CLASS') {
      const membership = await prisma.classMember.findFirst({
        where: { userId },
      });
      if (membership) {
        return { hasAccess: true, accessType: 'CLASS', expiresAt: undefined };
      }
      return { hasAccess: false, accessType: 'CLASS', message: '不属于任何班级' };
    }

    // TRIAL 或其他类型：先检查是否实际属于某班级（自动升级为 CLASS 权限）
    const classMembership = await prisma.classMember.findFirst({
      where: { userId },
    });
    if (classMembership) {
      return { hasAccess: true, accessType: 'CLASS', expiresAt: undefined };
    }

    // 试用期检查
    if (!user.trialStartsAt) {
      return { hasAccess: false, accessType: 'TRIAL', message: '试用尚未开始' };
    }
    const trialDays = await this.getTrialDays();
    const trialEnd = new Date(user.trialStartsAt);
    trialEnd.setDate(trialEnd.getDate() + trialDays);
    if (trialEnd > new Date()) {
      return { hasAccess: true, accessType: 'TRIAL', expiresAt: trialEnd };
    }
    return {
      hasAccess: false,
      accessType: 'TRIAL',
      expiresAt: trialEnd,
      message: '试用期已结束',
    };
  }

  /**
   * 为用户开启试用，仅在 trialStartsAt 未设置时生效
   */
  async startTrial(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { trialStartsAt: true },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.trialStartsAt) {
      return { trialStartsAt: user.trialStartsAt, started: false };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { trialStartsAt: new Date() },
      select: { trialStartsAt: true },
    });

    return { trialStartsAt: updated.trialStartsAt, started: true };
  }

  /**
   * 获取系统配置项
   */
  async getConfig(key: string): Promise<string | null> {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });
    return config?.value ?? null;
  }

  /**
   * 设置系统配置项，存在则更新，不存在则创建
   */
  async setConfig(key: string, value: string) {
    return await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  /**
   * 获取试用天数配置，默认 3 天
   */
  async getTrialDays(): Promise<number> {
    const value = await this.getConfig('trial_days');
    if (value) {
      const days = parseInt(value, 10);
      if (!isNaN(days) && days > 0) {
        return days;
      }
    }
    return DEFAULT_TRIAL_DAYS;
  }

  /**
   * 获取所有系统配置
   */
  async getAllConfigs() {
    return await prisma.systemConfig.findMany();
  }
}

export const accessService = new AccessService();
