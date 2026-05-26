import { useState, useEffect, useMemo } from 'react';
import { aiAPI, enhancedAiAPI } from '../../services/api';
import { Cpu, Save, Loader2, Brain, Code, Lightbulb, Bug, FileText, TreePine, Tag, FileUp, CheckCircle, XCircle, Settings2, ToggleLeft, ToggleRight, Edit3, Plus, X, Play, RotateCcw, Zap, ZapOff, BarChart3, DollarSign, Activity, BookOpen, GraduationCap, PenTool, Gavel, Layers } from 'lucide-react';

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

interface FeatureUsageStats {
  count: number;
  avgTokens: number;
  avgCost: number;
}

interface UsageStats {
  totalTokens: number;
  totalCost: number;
  totalCalls: number;
  byFeature: Record<string, { totalTokens: number; totalCost: number; count: number }>;
}

type FeatureCategory = 'code_assist' | 'problem_mgmt' | 'learning' | 'exam' | 'knowledge' | 'ai_judge';

interface CategoryDef {
  key: FeatureCategory;
  label: string;
  icon: any;
  color: string;
  featureKeys: string[];
}

const FEATURE_CATEGORIES: CategoryDef[] = [
  {
    key: 'code_assist',
    label: '代码辅助',
    icon: Code,
    color: 'cyan',
    featureKeys: ['explain-code', 'smart-hint', 'optimize-code', 'diagnose'],
  },
  {
    key: 'problem_mgmt',
    label: '题目管理',
    icon: Tag,
    color: 'orange',
    featureKeys: ['classify-problem', 'batch-classify', 'generate-testcases', 'parse-problem-file'],
  },
  {
    key: 'learning',
    label: '学习辅助',
    icon: GraduationCap,
    color: 'purple',
    featureKeys: ['companion', 'generate-learning-path', 'analyze-submission-trend', 'recommend-similar'],
  },
  {
    key: 'exam',
    label: '考试出题',
    icon: PenTool,
    color: 'blue',
    featureKeys: ['generate-exam', 'generate-solution'],
  },
  {
    key: 'knowledge',
    label: '知识管理',
    icon: BookOpen,
    color: 'green',
    featureKeys: ['parse-knowledge-tree', 'auto-compose'],
  },
  {
    key: 'ai_judge',
    label: 'AI判题',
    icon: Gavel,
    color: 'red',
    featureKeys: ['ai-judge'],
  },
];

const DEFAULT_PROMPT_TEMPLATES: Record<string, string> = {
  'explain-code': '请详细解释以下代码的逻辑，包括每一行的作用和整体算法思路。',
  'smart-hint': '根据学生的尝试次数，提供渐进式提示。第一次给出方向性提示，之后逐步增加细节，但不要直接给出答案。',
  'optimize-code': '分析以下代码的性能瓶颈，并给出优化建议。重点关注时间复杂度和空间复杂度。',
  'diagnose': '分析代码错误原因并提供修复建议。检查输入输出格式、边界条件、数据类型溢出等问题。',
  'classify-problem': '根据题目标题、描述和标签，将其归类到最合适的知识树节点。',
  'batch-classify': '批量将题目归类到知识树节点，为每道题生成合适的标签。',
  'generate-testcases': '为编程题自动生成判题测试用例，包括正常用例、边界用例和压力测试用例。',
  'parse-problem-file': '从文本文件中解析题目信息，包括标题、描述、类型、难度和测试用例。',
  'companion': '作为AI学伴，与学生进行对话交流，帮助理解概念、解答疑问、提供学习建议。',
  'generate-learning-path': '根据学生当前水平和目标，生成个性化学习路径，推荐适合的题目和学习顺序。',
  'analyze-submission-trend': '分析学生近期的提交记录，找出常见错误模式和改进方向。',
  'recommend-similar': '基于题目标签和内容，推荐相似的练习题目。',
  'generate-exam': '根据条件自动组卷，考虑题目难度分布、知识点覆盖和题型搭配。',
  'generate-solution': '为题目生成详细的题解，包括思路分析、算法步骤和代码实现。',
  'parse-knowledge-tree': '从文本内容中解析生成知识树结构，提取知识点之间的层次关系。',
  'auto-compose': '从自然语言描述自动创建知识树题单，搜索匹配题目并组织结构。',
  'ai-judge': '预测代码能否通过测试用例，分析代码的正确性、边界处理和复杂度。',
};

const CATEGORY_COLOR_MAP: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300' },
  orange: { border: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300' },
  purple: { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
  blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  green: { border: 'border-green-500/30', bg: 'bg-green-500/10', text: 'text-green-400', badge: 'bg-green-500/20 text-green-300' },
  red: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
};

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

  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [testingFeature, setTestingFeature] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ featureKey: string; success: boolean; message: string } | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

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

  const featureUsageMap = useMemo(() => {
    const map: Record<string, FeatureUsageStats> = {};
    if (!usageStats?.byFeature) return map;
    for (const [key, stat] of Object.entries(usageStats.byFeature)) {
      map[key] = {
        count: stat.count,
        avgTokens: stat.count > 0 ? Math.round(stat.totalTokens / stat.count) : 0,
        avgCost: stat.count > 0 ? Math.round((stat.totalCost / stat.count) * 10000) / 10000 : 0,
      };
    }
    return map;
  }, [usageStats]);

  const activeFeatureCount = useMemo(() => featureConfigs.filter(fc => fc.enabled).length, [featureConfigs]);

  const categorizedFeatures = useMemo(() => {
    return FEATURE_CATEGORIES.map(cat => ({
      ...cat,
      features: featureConfigs.filter(fc => cat.featureKeys.includes(fc.featureKey)),
    }));
  }, [featureConfigs]);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'management') {
      loadFeatureConfigs();
      loadUsageStats();
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

  const loadUsageStats = async () => {
    try {
      const res = await enhancedAiAPI.getUsageStats({});
      if (res.success && res.data) {
        setUsageStats(res.data);
      }
    } catch (error) {
      console.error('加载使用统计失败', error);
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

  const handleToggleAll = async (enabled: boolean) => {
    try {
      const updates = featureConfigs.map(fc =>
        enhancedAiAPI.updateFeatureConfig(fc.featureKey, { enabled })
      );
      await Promise.all(updates);
      setFeatureConfigs(prev => prev.map(fc => ({ ...fc, enabled })));
      setMessage(enabled ? '已启用所有功能' : '已禁用所有功能');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.error?.message || '批量操作失败');
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
    setShowPromptPreview(false);
    setTestResult(null);
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

  const handleResetToDefault = () => {
    if (!editingFeature) return;
    const defaultTemplate = DEFAULT_PROMPT_TEMPLATES[editingFeature.featureKey] || '';
    setEditForm(prev => ({ ...prev, promptTemplate: defaultTemplate }));
  };

  const handleTestFeature = async () => {
    if (!editingFeature) return;
    setTestingFeature(editingFeature.featureKey);
    setTestResult(null);
    try {
      const res = await aiAPI.getHint({
        problem: { title: '测试题目', description: '这是一个功能测试' },
        context: `测试功能: ${editingFeature.featureName}`
      });
      setTestResult({
        featureKey: editingFeature.featureKey,
        success: res.success,
        message: res.success ? '功能测试通过，AI连接正常' : '功能测试未返回预期结果',
      });
    } catch (error: any) {
      setTestResult({
        featureKey: editingFeature.featureKey,
        success: false,
        message: error.error?.message || '测试失败，请检查API配置',
      });
    } finally {
      setTestingFeature(null);
    }
  };

  const getCategoryForFeature = (featureKey: string): CategoryDef => {
    return FEATURE_CATEGORIES.find(cat => cat.featureKeys.includes(featureKey)) || FEATURE_CATEGORIES[0];
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
        <div>
          {/* 使用汇总 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Activity className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{activeFeatureCount}/{featureConfigs.length}</div>
                  <div className="text-slate-400 text-sm">活跃功能</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{usageStats?.totalCalls ?? 0}</div>
                  <div className="text-slate-400 text-sm">总调用次数</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Layers className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{usageStats?.totalTokens?.toLocaleString() ?? 0}</div>
                  <div className="text-slate-400 text-sm">总消耗 Token</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">¥{usageStats?.totalCost?.toFixed(4) ?? '0.0000'}</div>
                  <div className="text-slate-400 text-sm">预估总费用</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Settings2 className="h-8 w-8 text-cyan-400 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-white">功能管理</h2>
                  <p className="text-slate-400 text-sm mt-1">管理各AI功能的启用状态和参数配置</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleAll(true)}
                  disabled={featureConfigs.length === 0}
                  className="flex items-center px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  <Zap className="h-4 w-4 mr-1.5" />
                  全部启用
                </button>
                <button
                  onClick={() => handleToggleAll(false)}
                  disabled={featureConfigs.length === 0}
                  className="flex items-center px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <ZapOff className="h-4 w-4 mr-1.5" />
                  全部禁用
                </button>
                <button
                  onClick={handleInitializeFeatures}
                  disabled={initializing}
                  className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {initializing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  初始化默认配置
                </button>
              </div>
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
              <div className="space-y-8">
                {categorizedFeatures.map(category => {
                  if (category.features.length === 0) return null;
                  const colors = CATEGORY_COLOR_MAP[category.color];
                  const CategoryIcon = category.icon;
                  return (
                    <div key={category.key}>
                      <div className="flex items-center gap-2 mb-4">
                        <CategoryIcon className={`h-5 w-5 ${colors.text}`} />
                        <h3 className="text-lg font-semibold text-white">{category.label}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {category.features.filter(f => f.enabled).length}/{category.features.length} 启用
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.features.map(fc => {
                          const usage = featureUsageMap[fc.featureKey];
                          return (
                            <div
                              key={fc.id}
                              className={`border ${colors.border} rounded-xl p-4 bg-slate-750 hover:bg-slate-700/80 transition-colors`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-medium truncate">{fc.featureName}</h4>
                                  <p className="text-slate-400 text-xs mt-1 line-clamp-2">{fc.description}</p>
                                </div>
                                <button
                                  onClick={() => handleToggleFeature(fc.featureKey, !fc.enabled)}
                                  className="ml-3 flex-shrink-0"
                                  title={fc.enabled ? '点击禁用' : '点击启用'}
                                >
                                  {fc.enabled ? (
                                    <ToggleRight className="h-8 w-8 text-green-400" />
                                  ) : (
                                    <ToggleLeft className="h-8 w-8 text-slate-500" />
                                  )}
                                </button>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                                <code className="bg-slate-700 px-1.5 py-0.5 rounded">{fc.featureKey}</code>
                                <span>maxTokens: {fc.maxTokens}</span>
                                <span>temp: {fc.temperature}</span>
                              </div>

                              {usage && usage.count > 0 && (
                                <div className="flex items-center gap-4 text-xs mb-3 p-2 bg-slate-700/50 rounded-lg">
                                  <span className="text-slate-400">
                                    调用 <strong className="text-slate-200">{usage.count}</strong> 次
                                  </span>
                                  <span className="text-slate-400">
                                    均Token <strong className="text-slate-200">{usage.avgTokens}</strong>
                                  </span>
                                  <span className="text-slate-400">
                                    均费 <strong className="text-slate-200">¥{usage.avgCost}</strong>
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-end">
                                <button
                                  onClick={() => handleEditFeature(fc)}
                                  className="flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                                >
                                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                                  编辑
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
            <div className="bg-slate-700 p-6 rounded-lg"><div className="text-3xl font-bold text-cyan-400 mb-2">{usageStats?.totalCalls ?? 0}</div><div className="text-slate-400">总调用次数</div></div>
            <div className="bg-slate-700 p-6 rounded-lg"><div className="text-3xl font-bold text-green-400 mb-2">{usageStats?.totalCalls ?? 0}</div><div className="text-slate-400">成功次数</div></div>
            <div className="bg-slate-700 p-6 rounded-lg"><div className="text-3xl font-bold text-blue-400 mb-2">{usageStats?.totalTokens?.toLocaleString() ?? 0}</div><div className="text-slate-400">消耗 Token</div></div>
            <div className="bg-slate-700 p-6 rounded-lg"><div className="text-3xl font-bold text-purple-400 mb-2">¥{usageStats?.totalCost?.toFixed(4) ?? '0.00'}</div><div className="text-slate-400">预估费用</div></div>
          </div>
          {usageStats && usageStats.totalCalls > 0 && usageStats.byFeature && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">按功能统计</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(usageStats.byFeature).map(([featureKey, stat]) => {
                  const cat = getCategoryForFeature(featureKey);
                  const colors = CATEGORY_COLOR_MAP[cat.color];
                  return (
                    <div key={featureKey} className="bg-slate-700 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <cat.icon className={`h-4 w-4 ${colors.text}`} />
                        <span className="text-white text-sm font-medium">{featureKey}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-slate-400">调用</div>
                          <div className="text-white font-medium">{stat.count}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Token</div>
                          <div className="text-white font-medium">{stat.totalTokens.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">费用</div>
                          <div className="text-white font-medium">¥{stat.totalCost.toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {(!usageStats || usageStats.totalCalls === 0) && (
            <div className="text-center py-12 text-slate-500">
              <Cpu className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>暂无使用记录</p>
              <p className="text-sm mt-2">配置AI后，学生的使用记录将显示在这里</p>
            </div>
          )}
        </div>
      )}

      {/* 编辑功能配置模态框 */}
      {editingFeature && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">编辑功能配置</h3>
              <button onClick={() => setEditingFeature(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-300">提示词模板</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPromptPreview(!showPromptPreview)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {showPromptPreview ? '编辑模式' : '预览模式'}
                    </button>
                    <button
                      onClick={handleResetToDefault}
                      className="flex items-center text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      重置为默认
                    </button>
                  </div>
                </div>
                {showPromptPreview ? (
                  <div className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg min-h-[120px]">
                    {editForm.promptTemplate ? (
                      <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono leading-relaxed">
                        {editForm.promptTemplate.split(/(\{\{[^}]+\}\}|\{[^}]+\})/).map((part, i) => {
                          const isVariable = /^\{\{[^}]+\}\}$/.test(part) || /^\{[^}]+\}$/.test(part);
                          return isVariable
                            ? <span key={i} className="text-cyan-300 bg-cyan-500/10 px-1 rounded">{part}</span>
                            : <span key={i}>{part}</span>;
                        })}
                      </pre>
                    ) : (
                      <p className="text-slate-500 text-sm italic">暂无提示词模板</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={editForm.promptTemplate}
                    onChange={(e) => setEditForm({ ...editForm, promptTemplate: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none font-mono text-sm"
                    placeholder="自定义提示词模板（留空使用默认模板）"
                  />
                )}
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

              {testResult && testResult.featureKey === editingFeature.featureKey && (
                <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                  {testResult.success ? '✅' : '❌'} {testResult.message}
                </div>
              )}
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
                onClick={handleTestFeature}
                disabled={testingFeature !== null}
                className="flex items-center px-5 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {testingFeature ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                测试
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
