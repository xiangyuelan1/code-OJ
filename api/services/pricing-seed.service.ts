/**
 * 定价方案和FAQ的默认种子数据服务
 * 
 * 当数据库中没有定价方案或FAQ数据时，自动填充 PaymentPage 中的硬编码默认值。
 * 管理员可在「销售推广」页面编辑这些数据，也可通过"重置为默认"恢复。
 */

import prisma from '../lib/prisma';

// ─── 默认学生方案 ──────────────────────────────────────────────────────────────

const DEFAULT_STUDENT_PLANS = [
  {
    name: '免费版',
    price: 0,
    priceDisplay: '¥0',
    period: '',
    altPrice: null,
    highlight: false,
    category: 'student',
    color: 'cyan',
    sortOrder: 0,
    features: [
      '3个知识树节点做题',
      '基础判题服务',
      '能力雷达（只读）',
      '社区浏览',
    ],
  },
  {
    name: '会员',
    price: 19.9,
    priceDisplay: '¥19.9',
    period: '/月',
    altPrice: '¥169/年',
    highlight: true,
    category: 'student',
    color: 'cyan',
    sortOrder: 1,
    features: [
      '全量知识树无限做题',
      'AI 提示 / AI 学伴 / AI 判题',
      '社区发帖与互动',
      '在线对战系统',
      '成就系统',
      '编程星途规划',
    ],
  },
  {
    name: '班级会员',
    price: 0,
    priceDisplay: '免费',
    period: '（跟随教师）',
    altPrice: null,
    highlight: false,
    category: 'student',
    color: 'cyan',
    sortOrder: 2,
    features: [
      '等同会员全部权益',
      '由教师开通，无需自行付费',
      '教师订阅失效则自动失效',
    ],
  },
];

// ─── 默认教师方案 ──────────────────────────────────────────────────────────────

const DEFAULT_TEACHER_PLANS = [
  {
    name: '入门版',
    price: 998,
    priceDisplay: '¥998',
    period: '/年',
    altPrice: null,
    highlight: false,
    category: 'teacher',
    color: 'cyan',
    sortOrder: 10,
    features: [
      '30 学生名额',
      '3 个班级',
      'AI 月额度 5 万 tokens',
      '基础数据看板',
      '在线作业批改',
    ],
  },
  {
    name: '标准版',
    price: 2998,
    priceDisplay: '¥2,998',
    period: '/年',
    altPrice: null,
    highlight: true,
    category: 'teacher',
    color: 'cyan',
    sortOrder: 11,
    features: [
      '100 学生名额',
      '10 个班级',
      'AI 月额度 20 万 tokens',
      '完整数据看板',
      '学情分析报告',
      '自定义题目',
    ],
  },
  {
    name: '专业版',
    price: 6998,
    priceDisplay: '¥6,998',
    period: '/年',
    altPrice: null,
    highlight: false,
    category: 'teacher',
    color: 'cyan',
    sortOrder: 12,
    features: [
      '300 学生名额',
      '不限班级数量',
      'AI 月额度 50 万 tokens',
      '定制考试系统',
      '高级学情分析',
      '优先技术支持',
    ],
  },
  {
    name: '企业/学校',
    price: 0,
    priceDisplay: '面议',
    period: '',
    altPrice: null,
    highlight: false,
    category: 'teacher',
    color: 'purple',
    sortOrder: 13,
    features: [
      '不限学生名额',
      '私有部署可选',
      '定制开发服务',
      '专属技术支持',
      '数据迁移服务',
      'SLA 保障',
    ],
  },
];

// ─── 默认部署方案 ──────────────────────────────────────────────────────────────

const DEFAULT_DEPLOY_PLANS = [
  {
    name: '基础部署',
    price: 20000,
    priceDisplay: '¥20,000',
    period: '+ ¥5,000/年维护',
    altPrice: null,
    highlight: false,
    category: 'deploy',
    color: 'cyan',
    sortOrder: 20,
    features: [
      '全功能系统部署',
      'AI 功能需自备 API Key',
      '安装部署指导',
      '首年含基础维护',
    ],
  },
  {
    name: '企业部署',
    price: 50000,
    priceDisplay: '¥50,000+',
    period: '按需定制',
    altPrice: null,
    highlight: true,
    category: 'deploy',
    color: 'cyan',
    sortOrder: 21,
    features: [
      '全功能 + 定制开发',
      '专属技术支持',
      '数据迁移服务',
      'AI 功能全集成',
      '持续运维保障',
    ],
  },
  {
    name: '社区版',
    price: 0,
    priceDisplay: '免费',
    period: '开源',
    altPrice: null,
    highlight: false,
    category: 'deploy',
    color: 'cyan',
    sortOrder: 22,
    features: [
      '核心做题判题功能',
      '无 AI 功能',
      '无高级分析',
      '社区支持',
    ],
  },
];

// ─── 默认 FAQ 列表 ─────────────────────────────────────────────────────────────

const DEFAULT_FAQ_LIST = [
  {
    question: '班级会员何时失效？',
    answer: '班级会员的有效期跟随教师订阅。当教师订阅到期或取消时，其下所有班级会员将自动失效。教师续费后会自动恢复。',
  },
  {
    question: '能否中途升级套餐？',
    answer: '可以随时升级。升级时会按剩余天数折算差价，无需重复付费已使用的时间。',
  },
  {
    question: '学生名额用完了怎么办？',
    answer: '可以联系管理员升级到更高版本，也可以单独购买额外名额包。升级后已有数据完整保留。',
  },
  {
    question: '私有部署支持哪些环境？',
    answer: '支持 Linux 服务器部署（推荐 Ubuntu 20.04+），提供 Docker 一键部署方案。最低配置：4核8G内存，50G存储。',
  },
  {
    question: '推广码和优惠可以叠加吗？',
    answer: '推广码优惠与其他活动优惠不可叠加，以最优惠价格为准。推广码有有效期限制，请在有效期内使用。',
  },
];

// ─── 导出的种子方法 ─────────────────────────────────────────────────────────────

/**
 * 如果数据库中没有定价方案，则使用默认数据填充。
 * 同时检查并填充FAQ数据。
 */
export async function seedDefaultPlansIfEmpty(): Promise<void> {
  // 填充定价方案
  const planCount = await prisma.pricingPlan.count();
  if (planCount === 0) {
    const allPlans = [...DEFAULT_STUDENT_PLANS, ...DEFAULT_TEACHER_PLANS, ...DEFAULT_DEPLOY_PLANS];
    for (const plan of allPlans) {
      await prisma.pricingPlan.create({
        data: {
          name: plan.name,
          price: plan.price,
          priceDisplay: plan.priceDisplay,
          period: plan.period,
          altPrice: plan.altPrice,
          features: JSON.stringify(plan.features),
          category: plan.category,
          highlight: plan.highlight,
          color: plan.color,
          sortOrder: plan.sortOrder,
          isPopular: plan.highlight, // highlight 同步到 isPopular
          isActive: true,
        },
      });
    }
    console.log(`[Seed] ✅ 已填充 ${allPlans.length} 个默认定价方案`);
  }

  // 填充FAQ（存储在 SystemConfig 中，key = "payment_faq"）
  const existingFaq = await prisma.systemConfig.findUnique({ where: { key: 'payment_faq' } });
  if (!existingFaq) {
    await prisma.systemConfig.create({
      data: {
        key: 'payment_faq',
        value: JSON.stringify(DEFAULT_FAQ_LIST),
      },
    });
    console.log('[Seed] ✅ 已填充默认FAQ数据');
  }
}

/**
 * 强制重置定价方案和FAQ为默认值（管理员"重置为默认"按钮调用）。
 * 会删除所有现有方案（无订单关联的）并重新创建默认值。
 */
export async function resetToDefaults(): Promise<{ plans: number; faqReset: boolean }> {
  // 删除无订单关联的方案
  const plansWithOrders = await prisma.pricingPlan.findMany({
    where: { orders: { some: {} } },
    select: { id: true },
  });
  const protectedIds = plansWithOrders.map(p => p.id);

  await prisma.pricingPlan.deleteMany({
    where: { id: { notIn: protectedIds } },
  });

  // 重新创建默认方案
  const allPlans = [...DEFAULT_STUDENT_PLANS, ...DEFAULT_TEACHER_PLANS, ...DEFAULT_DEPLOY_PLANS];
  for (const plan of allPlans) {
    await prisma.pricingPlan.create({
      data: {
        name: plan.name,
        price: plan.price,
        priceDisplay: plan.priceDisplay,
        period: plan.period,
        altPrice: plan.altPrice,
        features: JSON.stringify(plan.features),
        category: plan.category,
        highlight: plan.highlight,
        color: plan.color,
        sortOrder: plan.sortOrder,
        isPopular: plan.highlight,
        isActive: true,
      },
    });
  }

  // 重置FAQ
  await prisma.systemConfig.upsert({
    where: { key: 'payment_faq' },
    update: { value: JSON.stringify(DEFAULT_FAQ_LIST) },
    create: { key: 'payment_faq', value: JSON.stringify(DEFAULT_FAQ_LIST) },
  });

  return { plans: allPlans.length, faqReset: true };
}
