import { useState, useEffect } from 'react';
import { aiAPI, enhancedAiAPI } from '../../services/api';
import { Cpu, Save, Loader2, Brain, Code, Lightbulb, Bug, FileText, TreePine, Tag, FileUp, CheckCircle, XCircle, Settings2, ToggleLeft, ToggleRight, Edit3, Plus, X } from 'lucide-react';

interface FeatureConfig {
  id: string;
  featureKey: string;
  featureName: string;
  description: string;
  enabled: boolean;
  promptTemplate: string;
  maxTokens: number;
  temperature: number;
  createdAt: string;
  updatedAt: string;
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
  const [activeTab, setActiveTab] = useState<'config' | 'features' | 'management' | 'usage'>('config');

  const [featureConfigs, setFeatureConfigs] = useState<FeatureConfig[]>([]);
  const [featureConfigsLoading, setFeatureConfigsLoading] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureConfig | null>(null);
  const [editForm, setEditForm] = useState({ promptTemplate: '', maxTokens: 4000, temperature: 0.7, description: '', featureName: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const aiFeatures = [
    { id: 'explainCode', name: '代码解释', description: '学生可以对代码请求AI解释，了解代码逻辑', icon: Code, color: 'cyan', endpoint: 'POST /api/ai/explain-code' },
    { id: 'getHint', name: '解题提示', description: '提供解题思路，引导但不直接给出答案', icon: Lightbulb, color: 'yellow', endpoint: 'POST /api/ai/hint' },
    { id: 'diagnoseError', name: '错误诊断', description: '分析代码错误原因并提供修复建议', icon: Bug, color: 'red', endpoint: 'POST /api/ai/diagnose' },
    { id: 'generateSolution', name: '题解生成', description: 'AI自动生成题目的详细题解', icon: FileText, color: 'blue', endpoint: 'POST /api/ai/generate-solution' },
    { id: 'generateTestCases', name: '测试用例生成', description: '为编程题自动生成判题测试用例', icon: CheckCircle, color: 'green', endpoint: 'POST /api/ai/generate-testcases' },
    { id: 'parseKnowledgeTree', name: '知识树解析', description: '从文本文件解析生成知识树结构', icon: TreePine, color: 'purple', endpoint: 'POST /api/ai/parse-knowledge-tree' },
    { id: 'classifyProblem', name: '题目分类', description: 'AI自动将题目归类到知识树节点', icon: Tag, color: 'orange', endpoint: 'POST /api/ai/classify-problem' },
    { id: 'parseProblemFile', name: '题目文件解析', description: '从txt/pdf文件批量导入题目', icon: FileUp, color: 'pink', endpoint: 'POST /api/ai/parse-problem-file' }
  ];

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'management') {
      loadFeatureConfigs();
    }
  }, [activeTab]);

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

  const loadFeatureConfigs = async () => {
    try {
      setFeatureConfigsLoading(true);
      const res = await enhancedAiAPI.getFeatureConfigs();
      if (res.success && res.data) {
        setFeatureConfigs(res.data);
      }
    } catch (error) {
      console.error('加载功能配置失败', error);
    } finally {
      setFeatureConfigsLoading(false);
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
        problem: { title: '测试题目', description: '这是一个测试' },
        context: '测试'
      });
      if (res.success) {
        setMessage('✅ 连接成功！AI功能可以正常使用。');
      }
    } catch (error: any) {
      setMessage('❌ 连接失败：' + (error.error?.message || '请检查配置'));
    }
  };

  const handleInitializeFeatures = async () => {
    setInitializing(true);
    try {
      const res = await enhancedAiAPI.initializeFeatureConfigs();
      if (res.success) {
        setMessage(`初始化完成！新建 ${res.data.created} 个功能配置，共 ${res.data.total} 个。`);
        await loadFeatureConfigs();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error: any) {
      setMessage(error.error?.message || '初始化失败');
    } finally {
      setInitializing(false);
    }
  };

  const handleToggleFeature = async (featureKey: string, enabled: boolean) => {
    try {
      const res = await enhancedAiAPI.updateFeatureConfig(featureKey, { enabled });
      if (res.success) {
        setFeatureConfigs(prev =>
          prev.map(fc => fc.featureKey === featureKey ? { ...fc, enabled } : fc)
        );
      }
    } catch (error: any) {
      setMessage(error.error?.message || '更新失败');
    }
  };

  const handleEditFeature = (feature: FeatureConfig) => {
    setEditingFeature(feature);
    setEditForm({
      promptTemplate: feature.promptTemplate,
      maxTokens: feature.maxTokens,
      temperature: feature.temperature,
      description: feature.description,
      featureName: feature.featureName,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingFeature) return;
    setEditSaving(true);
    try {
      const res = await enhancedAiAPI.updateFeatureConfig(editingFeature.featureKey, editForm);
      if (res.success) {
        setFeatureConfigs(prev =>
          prev.map(fc => fc.featureKey === editingFeature.featureKey ? { ...fc, ...editForm } : fc)
        );
        setEditingFeature(null);
        setMessage('功能配置更新成功！');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error: any) {
      setMessage(error.error?.message || '更新失败');
    } finally {
      setEditSaving(false);
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

      {message && (
        <div className="mb-6 p-4 bg-slate-700 rounded-lg">
          <p className="text-white">{message}</p>
        </div>
      )}

      <div className="flex space-x-1 mb-6 bg-slate-800 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'config' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>
          ⚙️ API配置
        </button>
        <button onClick={() => setActiveTab('features')} className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'features' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>
          📋 功能列表
        </button>
        <button onClick={() => setActiveTab('management')} className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'management' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>
          🔧 功能管理
        </button>
        <button onClick={() => setActiveTab('usage')} className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'usage' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>
          📊 使用统计
        </button>
      </div>

      {activeTab === 'config' && (
        <>
          <div className="bg-slate-800 rounded-xl p-8 shadow-xl mb-6">
            <div className="flex items-center mb-6">
              <Cpu className="h-8 w-8 text-cyan-400 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-white">AI API 配置</h2>
                <p className="text-slate-400 text-sm mt-1">配置 AI API 以启用智能辅导功能</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">启用 AI 功能</h3>
                  <p className="text-slate-400 text-sm mt-1">开启后所有AI功能可用</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">API 提供商</label>
                <select value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value })} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="custom">自定义 API</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">API Key <span className="text-red-400">*</span></label>
                <input type="password" value={config.apiKey} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="sk-..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">API 基础地址</label>
                <input type="text" value={config.baseUrl} onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder={config.provider === 'openai' ? 'https://api.openai.com/v1' : config.provider === 'claude' ? 'https://api.anthropic.com' : 'https://your-api.com/v1'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">模型</label>
                <input type="text" value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={handleSave} disabled={saving} className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                  保存配置
                </button>
                <button onClick={testConnection} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                  测试连接
                </button>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📌 当前状态</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg ${config.enabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <div className={`text-2xl mb-2 ${config.enabled ? 'text-green-400' : 'text-red-400'}`}>{config.enabled ? '✅' : '❌'}</div>
                <div className="text-white font-medium">{config.enabled ? '已启用' : '已禁用'}</div>
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
                <div className={`text-2xl mb-2 ${config.apiKey ? 'text-green-400' : 'text-red-400'}`}>{config.apiKey ? '✅' : '❌'}</div>
                <div className="text-white font-medium">{config.apiKey ? '已配置' : '未配置'}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'features' && (
        <div className="bg-slate-800 rounded-xl p-8 shadow-xl">
          <div className="flex items-center mb-6">
            <Brain className="h-8 w-8 text-cyan-400 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-white">AI 功能清单</h2>
              <p className="text-slate-400 text-sm mt-1">配置完成后，所有功能均可使用</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiFeatures.map((feature) => {
              const colorClasses: Record<string, string> = { cyan: 'border-cyan-500 bg-cyan-500/10', yellow: 'border-yellow-500 bg-yellow-500/10', red: 'border-red-500 bg-red-500/10', blue: 'border-blue-500 bg-blue-500/10', green: 'border-green-500 bg-green-500/10', purple: 'border-purple-500 bg-purple-500/10', orange: 'border-orange-500 bg-orange-500/10', pink: 'border-pink-500 bg-pink-500/10' };
              const iconColors: Record<string, string> = { cyan: 'text-cyan-400', yellow: 'text-yellow-400', red: 'text-red-400', blue: 'text-blue-400', green: 'text-green-400', purple: 'text-purple-400', orange: 'text-orange-400', pink: 'text-pink-400' };
              return (
                <div key={feature.id} className={`border-l-4 ${colorClasses[feature.color]} p-4 rounded-lg`}>
                  <div className="flex items-start">
                    <feature.icon className={`h-6 w-6 ${iconColors[feature.color]} mr-3 flex-shrink-0 mt-1`} />
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">{feature.name}</h3>
                      <p className="text-slate-400 text-sm mb-2">{feature.description}</p>
                      <div className="flex items-center justify-between">
                        <code className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">{feature.endpoint}</code>
                        <div className={`flex items-center text-sm ${config.enabled && config.apiKey ? 'text-green-400' : 'text-slate-500'}`}>
                          {config.enabled && config.apiKey ? (<><CheckCircle className="h-4 w-4 mr-1" />可用</>) : (<><XCircle className="h-4 w-4 mr-1" />需配置</>)}
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
              <p className="text-yellow-400 text-sm">⚠️ AI功能已禁用。请在上方"API配置"中启用并配置API密钥。</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'management' && (
        <div className="bg-slate-800 rounded-xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Settings2 className="h-8 w-8 text-cyan-400 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-white">功能管理</h2>
                <p className="text-slate-400 text-sm mt-1">管理各AI功能的启用状态和参数配置</p>
              </div>
            </div>
            <button
              onClick={handleInitializeFeatures}
              disabled={initializing}
              className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {initializing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              初始化默认配置
            </button>
          </div>

          {featureConfigsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
            </div>
          ) : featureConfigs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Settings2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>尚未初始化功能配置</p>
              <p className="text-sm mt-2">点击上方"初始化默认配置"按钮创建所有功能配置</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">功能名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">功能键</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">描述</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {featureConfigs.map((fc) => (
                    <tr key={fc.id} className="hover:bg-slate-750 transition-colors">
                      <td className="px-4 py-3 text-white text-sm font-medium">{fc.featureName}</td>
                      <td className="px-4 py-3"><code className="text-xs text-cyan-400 bg-slate-700 px-2 py-1 rounded">{fc.featureKey}</code></td>
                      <td className="px-4 py-3 text-slate-400 text-sm max-w-xs truncate">{fc.description}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleFeature(fc.featureKey, !fc.enabled)}
                          className="inline-flex items-center"
                          title={fc.enabled ? '点击禁用' : '点击启用'}
                        >
                          {fc.enabled ? (
                            <ToggleRight className="h-7 w-7 text-green-400" />
                          ) : (
                            <ToggleLeft className="h-7 w-7 text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleEditFeature(fc)}
                          className="inline-flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="bg-slate-800 rounded-xl p-8 shadow-xl">
          <div className="flex items-center mb-6">
            <Cpu className="h-8 w-8 text-cyan-400 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-white">使用统计</h2>
              <p className="text-slate-400 text-sm mt-1">AI功能使用情况概览</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-700 p-6 rounded-lg"><div className="text-3xl font-bold text-cyan-400 mb-2">0</div><div className="text-slate-400">总调用次数</div></div>
            <div className="bg-slate-700 p-6 rounded-lg"><div className="text-3xl font-bold text-green-400 mb-2">0</div><div className="text-slate-400">成功次数</div></div>
            <div className="bg-slate-700 p-6 rounded-lg"><div className="text-3xl font-bold text-blue-400 mb-2">0</div><div className="text-slate-400">消耗 Token</div></div>
            <div className="bg-slate-700 p-6 rounded-lg"><div className="text-3xl font-bold text-purple-400 mb-2">¥0.00</div><div className="text-slate-400">预估费用</div></div>
          </div>
          <div className="text-center py-12 text-slate-500">
            <Cpu className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>暂无使用记录</p>
            <p className="text-sm mt-2">配置AI后，学生的使用记录将显示在这里</p>
          </div>
        </div>
      )}

      {editingFeature && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">编辑功能配置</h3>
              <button onClick={() => setEditingFeature(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">功能名称</label>
                <input
                  type="text"
                  value={editForm.featureName}
                  onChange={(e) => setEditForm({ ...editForm, featureName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">功能键</label>
                <input
                  type="text"
                  value={editingFeature.featureKey}
                  disabled
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">描述</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">提示词模板</label>
                <textarea
                  value={editForm.promptTemplate}
                  onChange={(e) => setEditForm({ ...editForm, promptTemplate: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none font-mono text-sm"
                  placeholder="自定义提示词模板（留空使用默认模板）"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">最大 Token 数</label>
                  <input
                    type="number"
                    value={editForm.maxTokens}
                    onChange={(e) => setEditForm({ ...editForm, maxTokens: Number(e.target.value) })}
                    min={100}
                    max={16000}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">温度 (0-2)</label>
                  <input
                    type="number"
                    value={editForm.temperature}
                    onChange={(e) => setEditForm({ ...editForm, temperature: Number(e.target.value) })}
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2 px-5 rounded-lg transition-colors disabled:opacity-50"
              >
                {editSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                保存
              </button>
              <button
                onClick={() => setEditingFeature(null)}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
