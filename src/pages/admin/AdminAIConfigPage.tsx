import { useState, useEffect } from 'react';
import { aiAPI } from '../../services/api';
import { Cpu, Save, Loader2, Brain, Code, Lightbulb, Bug, FileText, TreePine, Tag, FileUp, CheckCircle, XCircle } from 'lucide-react';

interface AIUsage {
  date: string;
  feature: string;
  success: boolean;
  tokens: number;
}

export function AdminAIConfigPage() {
  const [config, setConfig] = useState({
    enabled: false,
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    model: 'gpt-3.5-turbo'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'features' | 'usage'>('config');

  const aiFeatures = [
    {
      id: 'explainCode',
      name: '代码解释',
      description: '学生可以对代码请求AI解释，了解代码逻辑',
      icon: Code,
      color: 'cyan',
      endpoint: 'POST /api/ai/explain-code',
      requires: ['apiKey']
    },
    {
      id: 'getHint',
      name: '解题提示',
      description: '提供解题思路，引导但不直接给出答案',
      icon: Lightbulb,
      color: 'yellow',
      endpoint: 'POST /api/ai/hint',
      requires: ['apiKey']
    },
    {
      id: 'diagnoseError',
      name: '错误诊断',
      description: '分析代码错误原因并提供修复建议',
      icon: Bug,
      color: 'red',
      endpoint: 'POST /api/ai/diagnose',
      requires: ['apiKey']
    },
    {
      id: 'generateSolution',
      name: '题解生成',
      description: 'AI自动生成题目的详细题解',
      icon: FileText,
      color: 'blue',
      endpoint: 'POST /api/ai/generate-solution',
      requires: ['apiKey']
    },
    {
      id: 'generateTestCases',
      name: '测试用例生成',
      description: '为编程题自动生成判题测试用例',
      icon: CheckCircle,
      color: 'green',
      endpoint: 'POST /api/ai/generate-testcases',
      requires: ['apiKey']
    },
    {
      id: 'parseKnowledgeTree',
      name: '知识树解析',
      description: '从文本文件解析生成知识树结构',
      icon: TreePine,
      color: 'purple',
      endpoint: 'POST /api/ai/parse-knowledge-tree',
      requires: ['apiKey']
    },
    {
      id: 'classifyProblem',
      name: '题目分类',
      description: 'AI自动将题目归类到知识树节点',
      icon: Tag,
      color: 'orange',
      endpoint: 'POST /api/ai/classify-problem',
      requires: ['apiKey']
    },
    {
      id: 'parseProblemFile',
      name: '题目文件解析',
      description: '从txt/pdf文件批量导入题目',
      icon: FileUp,
      color: 'pink',
      endpoint: 'POST /api/ai/parse-problem-file',
      requires: ['apiKey']
    }
  ];

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await aiAPI.getConfig();
      if (res.success && res.data) {
        setConfig({
          enabled: res.data.enabled,
          provider: res.data.provider,
          apiKey: res.data.apiKey || '',
          baseUrl: res.data.baseUrl || '',
          model: res.data.model
        });
      }
    } catch (error) {
      console.error('加载配置失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await aiAPI.updateConfig(config);
      if (res.success) {
        setMessage('配置保存成功！');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error: any) {
      setMessage(error.error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.apiKey) {
      setMessage('请先配置 API Key');
      return;
    }

    setMessage('正在测试连接...');
    try {
      const res = await aiAPI.getHint({
        problem: {
          title: '测试题目',
          description: '这是一个测试'
        },
        context: '测试'
      });

      if (res.success) {
        setMessage('✅ 连接成功！AI功能可以正常使用。');
      }
    } catch (error: any) {
      setMessage('❌ 连接失败：' + (error.error?.message || '请检查配置'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">🤖 AI 功能管理</h1>

      {/* 标签页 */}
      <div className="flex space-x-1 mb-6 bg-slate-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'config'
              ? 'bg-cyan-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ⚙️ API配置
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'features'
              ? 'bg-cyan-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📋 功能列表
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'usage'
              ? 'bg-cyan-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📊 使用统计
        </button>
      </div>

      {/* API配置 */}
      {activeTab === 'config' && (
        <>
          <div className="bg-slate-800 rounded-xl p-8 shadow-xl mb-6">
            <div className="flex items-center mb-6">
              <Cpu className="h-8 w-8 text-cyan-400 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-white">AI API 配置</h2>
                <p className="text-slate-400 text-sm mt-1">
                  配置 AI API 以启用智能辅导功能
                </p>
              </div>
            </div>

            {message && (
              <div className="mb-6 p-4 bg-slate-700 rounded-lg">
                <p className="text-white">{message}</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">启用 AI 功能</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    开启后所有AI功能可用
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API 提供商
                </label>
                <select
                  value={config.provider}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="custom">自定义 API</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Key <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="sk-..."
                />
                <p className="text-slate-500 text-sm mt-1">
                  {config.provider === 'openai' && '从 OpenAI API Keys 获取'}
                  {config.provider === 'claude' && '从 Anthropic API Keys 获取'}
                  {config.provider === 'custom' && '输入您的自定义 API Key'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API 基础地址
                </label>
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder={
                    config.provider === 'openai' ? 'https://api.openai.com/v1' :
                    config.provider === 'claude' ? 'https://api.anthropic.com' :
                    'https://your-api.com/v1'
                  }
                />
                <p className="text-slate-500 text-sm mt-1">
                  API 基础地址（如 https://api.openai.com/v1），也可直接填写完整端点地址（如 .../v1/chat/completions）
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  模型
                </label>
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-slate-500 text-sm mt-1">
                  {config.provider === 'openai' && '推荐: gpt-3.5-turbo, gpt-4-turbo, gpt-4'}
                  {config.provider === 'claude' && '推荐: claude-3-haiku, claude-3-sonnet, claude-3-opus'}
                  {config.provider === 'custom' && '输入模型名称'}
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                  保存配置
                </button>
                <button
                  onClick={testConnection}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  测试连接
                </button>
              </div>
            </div>
          </div>

          {/* 当前状态 */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📌 当前状态</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg ${config.enabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <div className={`text-2xl mb-2 ${config.enabled ? 'text-green-400' : 'text-red-400'}`}>
                  {config.enabled ? '✅' : '❌'}
                </div>
                <div className="text-white font-medium">
                  {config.enabled ? '已启用' : '已禁用'}
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-cyan-400 text-2xl mb-2 uppercase">{config.provider}</div>
                <div className="text-slate-400">提供商</div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-cyan-400 text-2xl mb-2">{config.model}</div>
                <div className="text-slate-400">模型</div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className={`text-2xl mb-2 ${config.apiKey ? 'text-green-400' : 'text-red-400'}`}>
                  {config.apiKey ? '✅' : '❌'}
                </div>
                <div className="text-white font-medium">
                  {config.apiKey ? '已配置' : '未配置'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 功能列表 */}
      {activeTab === 'features' && (
        <div className="bg-slate-800 rounded-xl p-8 shadow-xl">
          <div className="flex items-center mb-6">
            <Brain className="h-8 w-8 text-cyan-400 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-white">AI 功能清单</h2>
              <p className="text-slate-400 text-sm mt-1">
                配置完成后，所有功能均可使用
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiFeatures.map((feature) => {
              const colorClasses: Record<string, string> = {
                cyan: 'border-cyan-500 bg-cyan-500/10',
                yellow: 'border-yellow-500 bg-yellow-500/10',
                red: 'border-red-500 bg-red-500/10',
                blue: 'border-blue-500 bg-blue-500/10',
                green: 'border-green-500 bg-green-500/10',
                purple: 'border-purple-500 bg-purple-500/10',
                orange: 'border-orange-500 bg-orange-500/10',
                pink: 'border-pink-500 bg-pink-500/10'
              };

              const iconColors: Record<string, string> = {
                cyan: 'text-cyan-400',
                yellow: 'text-yellow-400',
                red: 'text-red-400',
                blue: 'text-blue-400',
                green: 'text-green-400',
                purple: 'text-purple-400',
                orange: 'text-orange-400',
                pink: 'text-pink-400'
              };

              return (
                <div
                  key={feature.id}
                  className={`border-l-4 ${colorClasses[feature.color]} p-4 rounded-lg`}
                >
                  <div className="flex items-start">
                    <feature.icon className={`h-6 w-6 ${iconColors[feature.color]} mr-3 flex-shrink-0 mt-1`} />
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">{feature.name}</h3>
                      <p className="text-slate-400 text-sm mb-2">{feature.description}</p>
                      <div className="flex items-center justify-between">
                        <code className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
                          {feature.endpoint}
                        </code>
                        <div className={`flex items-center text-sm ${
                          config.enabled && config.apiKey ? 'text-green-400' : 'text-slate-500'
                        }`}>
                          {config.enabled && config.apiKey ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              可用
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              需配置
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!config.enabled && (
            <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg">
              <p className="text-yellow-400 text-sm">
                ⚠️ AI功能已禁用。请在上方"API配置"中启用并配置API密钥。
              </p>
            </div>
          )}

          {config.enabled && !config.apiKey && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
              <p className="text-red-400 text-sm">
                ❌ AI功能已启用但未配置API密钥。请在上方填写API Key。
              </p>
            </div>
          )}
        </div>
      )}

      {/* 使用统计 */}
      {activeTab === 'usage' && (
        <div className="bg-slate-800 rounded-xl p-8 shadow-xl">
          <div className="flex items-center mb-6">
            <Cpu className="h-8 w-8 text-cyan-400 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-white">使用统计</h2>
              <p className="text-slate-400 text-sm mt-1">
                AI功能使用情况概览
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-700 p-6 rounded-lg">
              <div className="text-3xl font-bold text-cyan-400 mb-2">0</div>
              <div className="text-slate-400">总调用次数</div>
            </div>
            <div className="bg-slate-700 p-6 rounded-lg">
              <div className="text-3xl font-bold text-green-400 mb-2">0</div>
              <div className="text-slate-400">成功次数</div>
            </div>
            <div className="bg-slate-700 p-6 rounded-lg">
              <div className="text-3xl font-bold text-blue-400 mb-2">0</div>
              <div className="text-slate-400">消耗 Token</div>
            </div>
            <div className="bg-slate-700 p-6 rounded-lg">
              <div className="text-3xl font-bold text-purple-400 mb-2">¥0.00</div>
              <div className="text-slate-400">预估费用</div>
            </div>
          </div>

          <div className="text-center py-12 text-slate-500">
            <Cpu className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>暂无使用记录</p>
            <p className="text-sm mt-2">配置AI后，学生的使用记录将显示在这里</p>
          </div>
        </div>
      )}
    </div>
  );
}
