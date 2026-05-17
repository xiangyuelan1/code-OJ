import { useState, useEffect } from 'react';
import { accessAPI } from '../../services/api';
import { Shield, Save, Clock, CreditCard } from 'lucide-react';

interface ConfigItem {
  key: string;
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export function AdminAccessConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});

  const configItems: ConfigItem[] = [
    {
      key: 'trialDays',
      value: config.trialDays || '',
      label: '试用天数',
      description: '新用户注册后的免费试用天数',
      icon: <Clock className="h-5 w-5 text-cyan-400" />,
    },
    {
      key: 'paymentAmount',
      value: config.paymentAmount || '',
      label: '付费金额（元）',
      description: '用户付费使用的金额',
      icon: <CreditCard className="h-5 w-5 text-green-400" />,
    },
    {
      key: 'paymentDurationDays',
      value: config.paymentDurationDays || '',
      label: '付费时长（天）',
      description: '付费后可使用的天数',
      icon: <Shield className="h-5 w-5 text-purple-400" />,
    },
  ];

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await accessAPI.getConfig();
      if (res.success && res.data) {
        const configMap: Record<string, string> = {};
        if (Array.isArray(res.data)) {
          res.data.forEach((item: any) => {
            configMap[item.key] = item.value;
          });
        } else {
          Object.entries(res.data).forEach(([key, value]) => {
            configMap[key] = String(value);
          });
        }
        setConfig(configMap);
      }
    } catch (error) {
      console.error('获取访问配置失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    const value = config[key];
    if (!value) {
      alert('请填写配置值');
      return;
    }
    setSaving(key);
    try {
      const res = await accessAPI.updateConfig(key, value);
      if (res.success) {
        alert('配置已保存');
      }
    } catch (error: any) {
      alert(error.error?.message || '保存失败');
    } finally {
      setSaving(null);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">访问控制配置</h1>
      </div>

      <div className="space-y-6 max-w-2xl">
        {configItems.map((item) => (
          <div key={item.key} className="bg-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-700 rounded-lg shrink-0">
                {item.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{item.label}</h3>
                <p className="text-slate-400 text-sm mt-1">{item.description}</p>
                <div className="flex items-end gap-4 mt-4">
                  <input
                    type="text"
                    value={config[item.key] || ''}
                    onChange={(e) => handleConfigChange(item.key, e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder={`请输入${item.label}`}
                  />
                  <button
                    onClick={() => handleSave(item.key)}
                    disabled={saving === item.key}
                    className="flex items-center px-4 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving === item.key ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
