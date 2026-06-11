import prisma from '../lib/prisma';
import { getEditionConfig } from '../../config/editions';

const DEFAULT_TRIAL_DAYS = 3;

// 试用天数配置的内存缓存（避免每次权限检查都查DB）
let trialDaysCache: { value: number; expiresAt: number } | null = null;
const TRIAL_DAYS_CACHE_TTL = 5 * 60 * 1000; // 5分钟

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
    // 私有部署版所有用户默认全权限
    if (getEditionConfig().features.accessControl === false) {
      return { hasAccess: true, accessType: 'ADMIN', expiresAt: undefined };
    }

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
      // accessExpiresAt 为 null 视为永不过期（管理员手动授予的永久权限）
      if (!user.accessExpiresAt || user.accessExpiresAt > new Date()) {
        return { hasAccess: true, accessType: 'PAID', expiresAt: user.accessExpiresAt ?? undefined };
      }
      return {
        hasAccess: false,
        accessType: 'PAID',
        expiresAt: user.accessExpiresAt,
        message: '付费访问已过期',
      };
    }

    if (user.accessType === 'CLASS') {
      // 必须属于一个教师有效的班级才有权限
      const validMembership = await prisma.classMember.findFirst({
        where: {
          userId,
          class: {
            creator: {
              isActive: true,
              role: { in: ['TEACHER', 'ADMIN'] },
            },
          },
        },
      });
      if (validMembership) {
        return { hasAccess: true, accessType: 'CLASS', expiresAt: undefined };
      }
      return { hasAccess: false, accessType: 'CLASS', message: '不属于任何有效班级，或教师权限已失效' };
    }

    // TRIAL 或其他类型：先检查是否实际属于某有效班级（教师有效时自动升级为 CLASS 权限）
    const classMembership = await prisma.classMember.findFirst({
      where: {
        userId,
        class: {
          creator: {
            isActive: true,
            role: { in: ['TEACHER', 'ADMIN'] },
          },
        },
      },
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
   * 使用内存缓存（TTL 5分钟）避免每次权限检查都查询数据库
   */
  async getTrialDays(): Promise<number> {
    const now = Date.now();
    if (trialDaysCache && trialDaysCache.expiresAt > now) {
      return trialDaysCache.value;
    }

    const value = await this.getConfig('trial_days');
    let days = DEFAULT_TRIAL_DAYS;
    if (value) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        days = parsed;
      }
    }

    trialDaysCache = { value: days, expiresAt: now + TRIAL_DAYS_CACHE_TTL };
    return days;
  }

  /**
   * 获取所有系统配置
   */
  async getAllConfigs() {
    return await prisma.systemConfig.findMany();
  }
}

export const accessService = new AccessService();
