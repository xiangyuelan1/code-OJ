/**
 * 版本控制配置
 * full: 全量 SaaS 版（含商业化模块）
 * deploy: 私有部署版（去掉商业化，所有用户全权限）
 */

export type Edition = 'full' | 'deploy';

export interface EditionConfig {
  name: string;
  description: string;
  features: {
    // 商业化模块（仅 full 版有）
    payment: boolean;        // 支付系统
    pricingPlans: boolean;   // 定价计划
    promotions: boolean;     // 推广码/销售员
    accessControl: boolean;  // 免费/会员身份区分
    tokenQuota: boolean;     // AI Token 月度配额限制
    paymentPage: boolean;    // 付费介绍页

    // 以下所有版本都有
    ai: boolean;
    classManagement: boolean;
    exams: boolean;
    homework: boolean;
    courseSystem: boolean;
    discussions: boolean;
    starpath: boolean;
    match: boolean;
    achievements: boolean;
    dailyChallenge: boolean;
    knowledgeTree: boolean;
    adminPanel: boolean;
    teacherPanel: boolean;
  };
}

const EDITIONS: Record<Edition, EditionConfig> = {
  full: {
    name: '全量版',
    description: '完整 SaaS 平台，含商业化和权限体系',
    features: {
      payment: true,
      pricingPlans: true,
      promotions: true,
      accessControl: true,
      tokenQuota: true,
      paymentPage: true,
      ai: true,
      classManagement: true,
      exams: true,
      homework: true,
      courseSystem: true,
      discussions: true,
      starpath: true,
      match: true,
      achievements: true,
      dailyChallenge: true,
      knowledgeTree: true,
      adminPanel: true,
      teacherPanel: true,
    },
  },
  deploy: {
    name: '私有部署版',
    description: '去掉商业化模块，所有用户全权限，AI需自备Key',
    features: {
      payment: false,
      pricingPlans: false,
      promotions: false,
      accessControl: false,
      tokenQuota: false,
      paymentPage: false,
      ai: true,
      classManagement: true,
      exams: true,
      homework: true,
      courseSystem: true,
      discussions: true,
      starpath: true,
      match: true,
      achievements: true,
      dailyChallenge: true,
      knowledgeTree: true,
      adminPanel: true,
      teacherPanel: true,
    },
  },
};

export function getEditionConfig(): EditionConfig {
  const edition = (process.env.EDITION || 'full') as Edition;
  return EDITIONS[edition] || EDITIONS.full;
}

export function isFeatureEnabled(feature: keyof EditionConfig['features']): boolean {
  return getEditionConfig().features[feature];
}

export { EDITIONS };
