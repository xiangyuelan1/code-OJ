import { PrismaClient } from '@prisma/client';

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
        usages: { select: { id: true, userId: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async usePromotion(code: string, userId: string) {
    const promotion = await prisma.promotion.findUnique({
      where: { code },
      include: { usages: true },
    });

    if (!promotion) throw new Error('推广码不存在');
    if (!promotion.isActive) throw new Error('推广码已停用');
    if (promotion.expiresAt && new Date() > promotion.expiresAt) throw new Error('推广码已过期');
    if (promotion.maxUses > 0 && promotion.currentUses >= promotion.maxUses) throw new Error('推广码已达使用上限');

    const existingUsage = promotion.usages.find(u => u.userId === userId);
    if (existingUsage) throw new Error('您已使用过此推广码');

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
        await tx.user.update({ where: { id: userId }, data: { accessExpiresAt: newExpiry } });
      } else if (promotion.type === 'POINTS') {
        await tx.user.update({ where: { id: userId }, data: { points: { increment: promotion.value || 100 } } });
      }
    });

    return { success: true, type: promotion.type, value: promotion.value };
  }

  async togglePromotion(id: string) {
    const promotion = await prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new Error('推广码不存在');
    return prisma.promotion.update({ where: { id }, data: { isActive: !promotion.isActive } });
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
      include: { promotion: { select: { code: true, name: true, type: true } } },
    });

    return { total, active, totalUsages, recentUsages };
  }

  // ===== 定价计划 =====

  async createPlan(data: {
    name: string;
    price: number;
    duration: number;
    unit: string;
    features: string[];
    isPopular: boolean;
    sortOrder: number;
  }) {
    return prisma.pricingPlan.create({
      data: {
        name: data.name,
        price: data.price,
        duration: data.duration || 30,
        unit: data.unit || 'DAY',
        features: JSON.stringify(data.features || []),
        isPopular: data.isPopular || false,
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  async getAllPlans() {
    return prisma.pricingPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
  }

  async getActivePlans() {
    return prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
  }

  async updatePlan(id: string, data: {
    name?: string;
    price?: number;
    duration?: number;
    unit?: string;
    features?: string[];
    isPopular?: boolean;
    sortOrder?: number;
  }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.features !== undefined) updateData.features = JSON.stringify(data.features);
    if (data.isPopular !== undefined) updateData.isPopular = data.isPopular;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    return prisma.pricingPlan.update({ where: { id }, data: updateData });
  }

  async togglePlan(id: string) {
    const plan = await prisma.pricingPlan.findUnique({ where: { id } });
    if (!plan) throw new Error('定价计划不存在');
    return prisma.pricingPlan.update({ where: { id }, data: { isActive: !plan.isActive } });
  }

  async deletePlan(id: string) {
    return prisma.pricingPlan.delete({ where: { id } });
  }

  // ===== 订单 =====

  async createOrder(data: { userId: string; planId: string; promotionId?: string; paymentMethod?: string }) {
    const plan = await prisma.pricingPlan.findUnique({ where: { id: data.planId } });
    if (!plan) throw new Error('定价计划不存在');
    if (!plan.isActive) throw new Error('该定价计划已下架');

    let amount = plan.price;
    let originalAmount = plan.price;

    if (data.promotionId) {
      const promo = await prisma.promotion.findUnique({ where: { id: data.promotionId } });
      if (promo && promo.isActive && promo.type === 'DISCOUNT') {
        amount = plan.price * (promo.value / 100);
        originalAmount = plan.price;
      }
    }

    return prisma.order.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        amount,
        originalAmount,
        promotionId: data.promotionId || null,
        paymentMethod: data.paymentMethod || null,
      },
    });
  }

  async getOrders() {
    return prisma.order.findMany({
      include: { plan: { select: { name: true, duration: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ===== 财务统计 =====

  async getFinancialStats() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalPayments,
      approvedPayments,
      thisMonthPayments,
      lastMonthPayments,
      pendingPayments,
      totalOrders,
      thisMonthOrders,
      totalUsers,
      paidUsers,
      thisMonthNewUsers,
    ] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.findMany({ where: { status: 'APPROVED' } }),
      prisma.payment.findMany({ where: { status: 'APPROVED', createdAt: { gte: thisMonth } } }),
      prisma.payment.findMany({ where: { status: 'APPROVED', createdAt: { gte: lastMonth, lt: thisMonth } } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.user.count(),
      prisma.user.count({ where: { accessType: 'PAID' } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
    ]);

    const totalRevenue = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
    const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

    // 最近6个月收入趋势
    const monthlyRevenue: { month: string; revenue: number; orders: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthPayments = await prisma.payment.findMany({
        where: { status: 'APPROVED', createdAt: { gte: monthStart, lt: monthEnd } },
      });
      const monthOrders = await prisma.order.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      });
      monthlyRevenue.push({
        month: `${monthStart.getMonth() + 1}月`,
        revenue: monthPayments.reduce((sum, p) => sum + p.amount, 0),
        orders: monthOrders,
      });
    }

    // 各定价计划销量
    const planSales = await prisma.pricingPlan.findMany({
      where: { isActive: true },
      include: { _count: { select: { orders: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      totalPayments,
      pendingPayments,
      totalOrders,
      thisMonthOrders,
      totalUsers,
      paidUsers,
      thisMonthNewUsers,
      conversionRate: totalUsers > 0 ? Math.round(paidUsers / totalUsers * 1000) / 10 : 0,
      monthlyRevenue,
      planSales: planSales.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        sales: p._count.orders,
      })),
    };
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
