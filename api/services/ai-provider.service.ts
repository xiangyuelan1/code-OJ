import prisma from '../lib/prisma';

/** 安全解析 JSON 字符串，解析失败时返回默认值 */
function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/** 创建 / 更新 AI 供应商配置的输入参数 */
export interface ProviderConfigInput {
  name?: string;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  isDefault?: boolean;
  maxTokens?: number;
  temperature?: number;
  enabled?: boolean;
  priority?: number;
}

/** 解析后的有效配置：合并了供应商配置与功能级覆盖参数 */
export interface EffectiveConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string | null;
  baseUrl: string | null;
  model: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  priority: number;
  isDefault: boolean;
  featureOverrides?: {
    maxTokens?: number;
    temperature?: number;
  };
}

export class AIProviderService {
  /**
   * 获取所有 AI 供应商配置，按优先级降序、创建时间升序排列
   */
  async getAllConfigs() {
    return prisma.aIProviderConfig.findMany({
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * 根据 ID 获取单个供应商配置，不存在时抛出错误
   */
  async getConfigById(id: string) {
    const config = await prisma.aIProviderConfig.findUnique({ where: { id } });
    if (!config) {
      throw new Error(`供应商配置 ${id} 不存在`);
    }
    return config;
  }

  /**
   * 创建新的供应商配置。
   * 若 isDefault=true，在同一事务中先取消其他配置的默认标记，保证全局唯一默认。
   */
  async createConfig(data: ProviderConfigInput) {
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.aIProviderConfig.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.aIProviderConfig.create({
        data: {
          name: data.name ?? '未命名配置',
          provider: data.provider ?? 'openai',
          apiKey: data.apiKey,
          baseUrl: data.baseUrl,
          model: data.model ?? 'gpt-3.5-turbo',
          isDefault: data.isDefault ?? false,
          maxTokens: data.maxTokens ?? 4000,
          temperature: data.temperature ?? 0.7,
          enabled: data.enabled ?? true,
          priority: data.priority ?? 0,
        },
      });
    });
  }

  /**
   * 更新供应商配置。
   * 若设置 isDefault=true，在同一事务中先取消其他配置的默认标记，保证全局唯一默认。
   */
  async updateConfig(id: string, data: ProviderConfigInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.aIProviderConfig.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`供应商配置 ${id} 不存在`);
      }

      if (data.isDefault) {
        await tx.aIProviderConfig.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.aIProviderConfig.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.provider !== undefined && { provider: data.provider }),
          ...(data.apiKey !== undefined && { apiKey: data.apiKey }),
          ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl }),
          ...(data.model !== undefined && { model: data.model }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
          ...(data.maxTokens !== undefined && { maxTokens: data.maxTokens }),
          ...(data.temperature !== undefined && { temperature: data.temperature }),
          ...(data.enabled !== undefined && { enabled: data.enabled }),
          ...(data.priority !== undefined && { priority: data.priority }),
        },
      });
    });
  }

  /**
   * 删除供应商配置。
   * 若该配置是系统唯一配置则禁止删除，确保系统始终至少保留一个可用配置。
   */
  async deleteConfig(id: string) {
    const config = await prisma.aIProviderConfig.findUnique({ where: { id } });
    if (!config) {
      throw new Error(`供应商配置 ${id} 不存在`);
    }

    const totalCount = await prisma.aIProviderConfig.count();
    if (totalCount <= 1) {
      throw new Error('无法删除唯一的供应商配置，系统至少需要保留一个配置');
    }

    return prisma.aIProviderConfig.delete({ where: { id } });
  }

  /**
   * 将指定配置设为默认，同时取消其他配置的默认标记（事务保证唯一默认）。
   */
  async setDefault(id: string) {
    return prisma.$transaction(async (tx) => {
      const config = await tx.aIProviderConfig.findUnique({ where: { id } });
      if (!config) {
        throw new Error(`供应商配置 ${id} 不存在`);
      }

      await tx.aIProviderConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      return tx.aIProviderConfig.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  /**
   * 获取当前活跃的供应商配置，按以下优先级解析：
   * 1. 若指定了 feature，检查 AIFeatureConfig.promptTemplate 中是否包含 providerConfigId 覆盖
   * 2. 使用 isDefault=true 且 enabled=true 的默认配置
   * 3. 使用任意 enabled=true 的配置（按优先级降序）
   * 4. 兜底：从旧版 AIConfig 记录构造兼容对象
   */
  async getActiveConfig(feature?: string) {
    // 优先级 1：功能级供应商覆盖
    if (feature) {
      const featureConfig = await prisma.aIFeatureConfig.findUnique({
        where: { featureKey: feature },
      });
      if (featureConfig?.promptTemplate) {
        const parsed = safeJsonParse<Record<string, unknown>>(featureConfig.promptTemplate, {});
        if (parsed.providerConfigId && typeof parsed.providerConfigId === 'string') {
          const overrideConfig = await prisma.aIProviderConfig.findUnique({
            where: { id: parsed.providerConfigId },
          });
          if (overrideConfig?.enabled) {
            return overrideConfig;
          }
        }
      }
    }

    // 优先级 2：默认配置
    const defaultConfig = await prisma.aIProviderConfig.findFirst({
      where: { isDefault: true, enabled: true },
    });
    if (defaultConfig) {
      return defaultConfig;
    }

    // 优先级 3：任意已启用的配置
    const anyEnabled = await prisma.aIProviderConfig.findFirst({
      where: { enabled: true },
      orderBy: { priority: 'desc' },
    });
    if (anyEnabled) {
      return anyEnabled;
    }

    // 优先级 4：兜底旧版 AIConfig
    const legacy = await prisma.aIConfig.findFirst();
    if (legacy) {
      return {
        id: `legacy-${legacy.id}`,
        name: '旧版配置（已迁移）',
        provider: legacy.provider,
        apiKey: legacy.apiKey,
        baseUrl: legacy.baseUrl,
        model: legacy.model,
        isDefault: true,
        maxTokens: 4000,
        temperature: 0.7,
        enabled: legacy.enabled,
        priority: 0,
        createdAt: legacy.updatedAt,
        updatedAt: legacy.updatedAt,
      };
    }

    return null;
  }

  /**
   * 获取合并后的有效配置：将供应商配置与功能级参数覆盖合并。
   * 功能级的 maxTokens / temperature 若有值则覆盖供应商级的默认值，
   * 并在 featureOverrides 中记录哪些字段被覆盖。
   */
  async getEffectiveConfig(feature: string): Promise<EffectiveConfig | null> {
    const activeConfig = await this.getActiveConfig(feature);
    if (!activeConfig) return null;

    const featureConfig = await prisma.aIFeatureConfig.findUnique({
      where: { featureKey: feature },
    });

    const featureMaxTokens = featureConfig?.maxTokens;
    const featureTemperature = featureConfig?.temperature;
    const hasOverrides = featureMaxTokens !== undefined || featureTemperature !== undefined;

    return {
      id: activeConfig.id,
      name: activeConfig.name,
      provider: activeConfig.provider,
      apiKey: activeConfig.apiKey,
      baseUrl: activeConfig.baseUrl,
      model: activeConfig.model,
      maxTokens: featureMaxTokens ?? activeConfig.maxTokens,
      temperature: featureTemperature ?? activeConfig.temperature,
      enabled: activeConfig.enabled,
      priority: activeConfig.priority,
      isDefault: activeConfig.isDefault,
      ...(hasOverrides && {
        featureOverrides: {
          ...(featureMaxTokens !== undefined && { maxTokens: featureMaxTokens }),
          ...(featureTemperature !== undefined && { temperature: featureTemperature }),
        },
      }),
    };
  }

  /**
   * 测试供应商配置的连通性：向 AI API 发送一个最小化的 completion 请求。
   * 返回是否成功及响应耗时；失败时包含错误信息。
   */
  async testConnection(id: string): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    const config = await this.getConfigById(id);

    if (!config.apiKey) {
      return { success: false, error: '未配置 API Key' };
    }

    const rawBaseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;

    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
        signal: AbortSignal.timeout(15000),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return {
          success: false,
          latency,
          error: `API 返回 ${response.status}: ${body.slice(0, 200)}`,
        };
      }

      return { success: true, latency };
    } catch (err) {
      const latency = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, latency, error: message };
    }
  }

  /**
   * 将旧版 AIConfig 单条记录迁移为新的 AIProviderConfig。
   * 若已存在同名迁移记录则跳过，避免重复迁移。
   */
  async migrateFromLegacyConfig() {
    const legacy = await prisma.aIConfig.findFirst();
    if (!legacy) {
      return { migrated: false, reason: '旧版 AIConfig 不存在' };
    }

    const existingMigration = await prisma.aIProviderConfig.findFirst({
      where: { name: '旧版配置迁移' },
    });
    if (existingMigration) {
      return { migrated: false, reason: '已存在迁移记录，跳过重复迁移' };
    }

    const newConfig = await prisma.aIProviderConfig.create({
      data: {
        name: '旧版配置迁移',
        provider: legacy.provider,
        apiKey: legacy.apiKey,
        baseUrl: legacy.baseUrl,
        model: legacy.model,
        isDefault: true,
        maxTokens: 4000,
        temperature: 0.7,
        enabled: legacy.enabled,
        priority: 0,
      },
    });

    return { migrated: true, config: newConfig };
  }
}

export const aiProviderService = new AIProviderService();
