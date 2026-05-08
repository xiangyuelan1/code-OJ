import { useState, useEffect } from 'react';
import { aiAPI } from '../../services/api';
import { Cpu, Save, Loader2 } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">AI 配置</h1>

      <div className="bg-slate-800 rounded-xl p-8 shadow-xl">
        <div className="flex items-center mb-6">
          <Cpu className="h-8 w-8 text-cyan-400 mr-3" />
          <div>
            <h2 className="text-xl font-semibold text-white">AI 功能设置</h2>
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
                开启后学生可以使用 AI 辅导功能
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
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API 基础地址（可选）
            </label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="https://api.openai.com/v1"
            />
            <p className="text-slate-500 text-sm mt-1">
              如果使用代理或自定义API端点，请填写此地址
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
              placeholder="gpt-3.5-turbo"
            />
            <p className="text-slate-500 text-sm mt-1">
              推荐: gpt-3.5-turbo, gpt-4, claude-3-sonnet
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

      <div className="mt-8 bg-slate-800 rounded-xl p-8 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-4">AI 功能说明</h2>
        <div className="space-y-4 text-slate-400">
          <div>
            <h3 className="text-white font-medium mb-2">🔍 AI 代码解释</h3>
            <p className="text-sm">
              学生可以对自己的代码请求 AI 解释，了解代码的执行逻辑和功能
            </p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">💡 AI 思路提示</h3>
            <p className="text-sm">
              在解题过程中，学生可以获取解题思路提示，引导但不直接给出答案
            </p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">🐛 AI 错误诊断</h3>
            <p className="text-sm">
              当代码出现错误时，AI 可以帮助分析错误原因并提供修复建议
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
