import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class PromotionService {
  async createPromotion(data: {
    name: string;
    description?: string;
    type: string;
    value: number;
    maxUses: number;
    expiresAt?: string;
    code?: string;
  }, userId?: string) {
    const code = data.code || this.generateCode();

    return prisma.promotion.create({
      data: {
        code,
        name: data.name,
        description: data.description || null,
        type: data.type || 'TRIAL_EXTEND',
        value: data.value || 0,
        maxUses: data.maxUses || 0,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: userId || null,
      },
    });
  }

  async getAllPromotions() {
    return prisma.promotion.findMany({
      include: {
        usages: {
          select: { id: true, userId: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async usePromotion(code: string, userId: string) {
    const promotion = await prisma.promotion.findUnique({
      where: { code },
      include: { usages: true },
    });

    if (!promotion) {
      throw new Error('推广码不存在');
    }

    if (!promotion.isActive) {
      throw new Error('推广码已停用');
    }

    if (promotion.expiresAt && new Date() > promotion.expiresAt) {
      throw new Error('推广码已过期');
    }

    if (promotion.maxUses > 0 && promotion.currentUses >= promotion.maxUses) {
      throw new Error('推广码已达使用上限');
    }

    const existingUsage = promotion.usages.find(u => u.userId === userId);
    if (existingUsage) {
      throw new Error('您已使用过此推广码');
    }

    await prisma.$transaction(async (tx) => {
      await tx.promotionUsage.create({
        data: { promotionId: promotion.id, userId },
      });

      await tx.promotion.update({
        where: { id: promotion.id },
        data: { currentUses: { increment: 1 } },
      });

      if (promotion.type === 'TRIAL_EXTEND') {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('用户不存在');

        const extendDays = promotion.value || 7;
        const currentExpiry = user.accessExpiresAt ? new Date(user.accessExpiresAt) : new Date();
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        const newExpiry = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000);

        await tx.user.update({
          where: { id: userId },
          data: { accessExpiresAt: newExpiry },
        });
      } else if (promotion.type === 'POINTS') {
        const points = promotion.value || 100;
        await tx.user.update({
          where: { id: userId },
          data: { points: { increment: points } },
        });
      } else if (promotion.type === 'DISCOUNT') {
        // 折扣类型记录使用，实际折扣在支付时应用
      }
    });

    return { success: true, type: promotion.type, value: promotion.value };
  }

  async togglePromotion(id: string) {
    const promotion = await prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new Error('推广码不存在');

    return prisma.promotion.update({
      where: { id },
      data: { isActive: !promotion.isActive },
    });
  }

  async deletePromotion(id: string) {
    await prisma.promotionUsage.deleteMany({ where: { promotionId: id } });
    return prisma.promotion.delete({ where: { id } });
  }

  async getPromotionStats() {
    const total = await prisma.promotion.count();
    const active = await prisma.promotion.count({ where: { isActive: true } });
    const totalUsages = await prisma.promotionUsage.count();

    const recentUsages = await prisma.promotionUsage.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        promotion: { select: { code: true, name: true, type: true } },
      },
    });

    return { total, active, totalUsages, recentUsages };
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export const promotionService = new PromotionService();
