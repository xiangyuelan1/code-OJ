import prisma from '../lib/prisma';

/**
 * 柯德默认配置项定义
 * 启动时自动填充（仅插入不存在的 key，不覆盖已有值）
 */
const CODER_DEFAULT_CONFIGS: Array<{ key: string; value: string; description: string }> = [
  { key: 'coder_name', value: '柯德', description: 'AI 助手显示名称' },
  { key: 'coder_greeting_mentor', value: '你好，我是柯德。有什么编程问题可以帮你解答？', description: '专业导师性格的问候语' },
  { key: 'coder_greeting_lively', value: '嘿！我是柯德 ✨ 今天想学点什么？', description: '活泼学伴性格的问候语' },
  { key: 'coder_greeting_gentle', value: '你好呀，我是柯德。有什么我可以帮忙的吗？不着急，慢慢说。', description: '温柔引导性格的问候语' },
  { key: 'coder_proactive_enabled', value: 'true', description: '是否启用主动提示功能' },
  { key: 'coder_proactive_idle_minutes', value: '5', description: '用户空闲多少分钟后触发主动提示' },
  { key: 'coder_proactive_consecutive_failures', value: '3', description: '连续答错多少次触发主动提示' },
  { key: 'coder_max_history_per_user', value: '100', description: '每用户最大保留对话历史条数' },
  { key: 'coder_profile_update_interval', value: '10', description: '每多少次交互自动更新用户画像' },
  { key: 'coder_allowed_topics', value: 'programming,learning,encouragement,career', description: '允许讨论的话题范围' },
];

/**
 * 启动时自动填充柯德默认配置（仅插入不存在的 key）
 */
export async function seedCoderConfigDefaults() {
  let insertedCount = 0;

  for (const config of CODER_DEFAULT_CONFIGS) {
    const existing = await prisma.coderConfig.findUnique({ where: { key: config.key } });
    if (!existing) {
      await prisma.coderConfig.create({ data: config });
      insertedCount++;
    }
  }

  if (insertedCount > 0) {
    console.log(`[Coder] ✅ Seeded ${insertedCount} default config entries`);
  }
}
