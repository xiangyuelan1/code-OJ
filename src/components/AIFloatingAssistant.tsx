import { useState, useRef, useEffect } from 'react';
import { Send, Minus, X, Settings, Bot, Trash2, ChevronLeft, BookOpen, Lightbulb, BarChart3, Users, Brain, FileText, TrendingUp, Sparkles, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthStore } from '../stores/auth.store';
import { coderAPI, enhancedAiAPI } from '../services/api';
import { CoderAvatar } from './ui/CoderAvatar';

// ============================================================
// 类型定义
// ============================================================

/** 聊天消息 */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** 柯德性格类型 */
type Personality = 'professional' | 'lively' | 'gentle';

/** 柯德工作模式 */
type CoderMode = 'companion' | 'assistant' | 'admin';

/** 用户画像（来自后端） */
interface CoderProfile {
  personality?: Personality;
  mode?: CoderMode;
}

/** 快捷操作定义 */
interface QuickAction {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

// ============================================================
// 常量配置
// ============================================================

/** 各模式下的快捷操作 */
const QUICK_ACTIONS: Record<CoderMode, QuickAction[]> = {
  companion: [
    { icon: <Brain className="w-3 h-3" />, label: '分析错题', prompt: '请帮我分析最近的错题，找出常见错误模式并给出改进建议' },
    { icon: <FileText className="w-3 h-3" />, label: '解释代码', prompt: '请帮我解释当前这段代码的执行逻辑和核心思路' },
    { icon: <Lightbulb className="w-3 h-3" />, label: '推荐题目', prompt: '请根据我当前的学习情况推荐适合我水平的练习题' },
    { icon: <TrendingUp className="w-3 h-3" />, label: '学习建议', prompt: '请根据我的学习进度给出今天的学习建议和目标' },
    { icon: <BarChart3 className="w-3 h-3" />, label: '今日总结', prompt: '请帮我总结一下今天的学习情况' },
  ],
  assistant: [
    { icon: <Zap className="w-3 h-3" />, label: 'AI出题', prompt: '请帮我根据当前课程内容生成练习题' },
    { icon: <Users className="w-3 h-3" />, label: '班级报告', prompt: '请帮我分析班级的整体学习情况并生成报告' },
    { icon: <BookOpen className="w-3 h-3" />, label: '课程建议', prompt: '请根据学生的掌握情况给出课程内容建议' },
    { icon: <Brain className="w-3 h-3" />, label: '学生分析', prompt: '请帮我分析学生的学习薄弱环节' },
  ],
  admin: [
    { icon: <BarChart3 className="w-3 h-3" />, label: '用量统计', prompt: '请展示系统的AI使用量统计' },
    { icon: <Lightbulb className="w-3 h-3" />, label: '系统洞察', prompt: '请分析系统整体运行状况并给出优化建议' },
    { icon: <FileText className="w-3 h-3" />, label: '内容生成', prompt: '请帮我批量生成平台内容' },
  ],
};

/** 性格卡片配置 */
const PERSONALITY_OPTIONS: { key: Personality; emoji: string; name: string; desc: string }[] = [
  { key: 'professional', emoji: '🎓', name: '专业导师', desc: '严谨精确，注重知识的系统性和准确性' },
  { key: 'lively', emoji: '🌟', name: '活泼学伴', desc: '幽默有趣，用生动的方式让学习充满乐趣' },
  { key: 'gentle', emoji: '🌸', name: '温柔引导', desc: '耐心体贴，循循善诱引导你独立思考' },
];

/** 模式显示名称 */
const MODE_LABELS: Record<CoderMode, string> = {
  companion: '学伴',
  assistant: '助理',
  admin: '管理',
};

/** 主动消息轮询间隔（毫秒） */
const PROACTIVE_POLL_INTERVAL = 60000;

// ============================================================
// 主组件
// ============================================================

/**
 * 柯德 (Coder) - AI 浮动助手
 * 全站右下角浮动球，提供智能对话、主动提示、多模式交互
 */
export function AIFloatingAssistant() {
  const { isAuthenticated, user } = useAuthStore();

  // --- 面板状态 ---
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'settings' | 'welcome'>('chat');

  // --- 对话状态 ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // --- 用户画像 ---
  const [profile, setProfile] = useState<CoderProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // --- 主动消息 ---
  const [hasNotification, setHasNotification] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState<string | null>(null);

  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const proactiveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bubbleDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 用户角色判断
  const userRole = user?.role || 'STUDENT';
  const canSwitchMode = userRole === 'TEACHER' || userRole === 'ADMIN';
  const currentMode = profile?.mode || 'companion';

  // 未认证不渲染
  if (!isAuthenticated) return null;

  // ============================================================
  // 副作用：加载用户画像
  // ============================================================

  useEffect(() => {
    if (!isAuthenticated) return;
    loadProfile();
  }, [isAuthenticated]);

  // ============================================================
  // 副作用：主动消息轮询
  // ============================================================

  useEffect(() => {
    if (!isAuthenticated) return;
    startProactivePolling();
    return () => stopProactivePolling();
  }, [isAuthenticated]);

  // ============================================================
  // 副作用：打开面板时加载历史
  // ============================================================

  useEffect(() => {
    if (isOpen && !historyLoaded && profileLoaded) {
      // 若无画像（首次用户），显示欢迎界面
      if (!profile?.personality) {
        setView('welcome');
      } else {
        loadHistory();
      }
    }
  }, [isOpen, profileLoaded]);

  // ============================================================
  // 副作用：自动滚动到底部
  // ============================================================

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // ============================================================
  // API 交互方法
  // ============================================================

  /** 加载用户画像 */
  const loadProfile = async () => {
    try {
      const res = await coderAPI.getProfile();
      if (res.success && res.data) {
        setProfile(res.data);
      }
    } catch {
      // 首次用户无画像属于正常情况
    } finally {
      setProfileLoaded(true);
    }
  };

  /** 加载对话历史 */
  const loadHistory = async () => {
    try {
      const res = await coderAPI.getHistory({ limit: 20 });
      if (res.success && res.data?.messages) {
        const history: ChatMessage[] = res.data.messages.map((m: any) => ({
          id: m.id || `hist-${Date.now()}-${Math.random()}`,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt || m.timestamp || Date.now()).getTime(),
        }));
        setMessages(history);
      }
    } catch {
      // 加载失败静默处理，不影响用户使用
    } finally {
      setHistoryLoaded(true);
    }
  };

  /**
   * 快捷操作路由：识别快捷操作的提示词，调用对应的专业 API
   * 返回 null 表示无匹配，应走通用 chat 逻辑
   */
  const routeQuickAction = async (messageText: string): Promise<string | null> => {
    // 学生模式：分析错题
    if (messageText.includes('分析最近的错题')) {
      const res = await enhancedAiAPI.analyzeMistakes({ timeRange: 'month' });
      if (res.success && res.data) {
        const d = res.data as { weakPoints?: string[]; patterns?: string[]; suggestions?: string[] };
        const parts: string[] = ['## 📊 柯德·错题分析\n'];
        if (d.weakPoints?.length) parts.push(`**薄弱知识点：** ${d.weakPoints.join('、')}\n`);
        if (d.patterns?.length) parts.push(`**错误模式：**\n${d.patterns.map(p => `- ${p}`).join('\n')}\n`);
        if (d.suggestions?.length) parts.push(`**改进建议：**\n${d.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
        return parts.join('\n');
      }
      return '暂无足够错题数据进行分析，继续练习后再来试试吧。';
    }

    // 学生模式：推荐题目
    if (messageText.includes('推荐适合我水平的练习题')) {
      const res = await enhancedAiAPI.getPersonalizedRecommendations();
      if (res.success && res.data) {
        const d = res.data as { recommendations?: Array<{ title?: string; reason?: string }> ; summary?: string };
        const parts: string[] = ['## 🎯 柯德·题目推荐\n'];
        if (d.summary) parts.push(`${d.summary}\n`);
        if (d.recommendations?.length) {
          parts.push(d.recommendations.map((r, i) => `${i + 1}. **${r.title || '推荐题目'}** — ${r.reason || ''}`).join('\n'));
        }
        return parts.join('\n') || '暂无推荐，请先多做几道题让我了解你的水平。';
      }
      return '暂无推荐，请先多做几道题让我了解你的水平。';
    }

    // 学生模式：学习建议
    if (messageText.includes('给出今天的学习建议')) {
      // 复用柯德 chat 接口，但指定 feature 为 learning-advice
      const res = await coderAPI.chat({
        message: messageText,
        context: { feature: 'learning-advice', pageContext: window.location.pathname },
      });
      const content = res.success && res.data?.response
        ? res.data.response
        : res.data?.message || res.data?.content || null;
      return content;
    }

    // 学生模式：解释代码（提示用户粘贴代码）
    if (messageText.includes('解释当前这段代码')) {
      return '请将你想要解释的代码粘贴到这里，我来为你逐行解析 💡\n\n> 提示：粘贴代码后发送即可获得详细解释。';
    }

    // 教师模式：AI 出题
    if (messageText.includes('根据当前课程内容生成练习题')) {
      const res = await enhancedAiAPI.generateProblemEnhanced({
        topic: '综合练习',
        difficulty: 'MEDIUM',
        count: 3,
      });
      if (res.success && res.data) {
        const problems = Array.isArray(res.data) ? res.data : (res.data as any).problems || [res.data];
        const parts: string[] = ['## ✨ 柯德·生成题目\n'];
        problems.forEach((p: any, i: number) => {
          parts.push(`### 题目 ${i + 1}: ${p.title || '未命名'}\n`);
          if (p.description) parts.push(`${p.description}\n`);
          if (p.difficulty) parts.push(`难度: ${p.difficulty}\n`);
        });
        parts.push('\n> 可前往「教师面板 → 柯德·智能出题」进行更详细的配置和保存。');
        return parts.join('\n');
      }
      return '生成失败，请前往教师面板使用完整的出题功能。';
    }

    // 教师模式：班级报告
    if (messageText.includes('分析班级的整体学习情况并生成报告')) {
      return '请前往「教师面板」选择具体班级，点击「柯德·班级报告」生成详细分析报告。\n\n我也可以在这里帮你解答关于班级管理的问题，请直接提问 😊';
    }

    // 无匹配，走通用 chat
    return null;
  };

  /** 发送消息 */
  const handleSend = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    resetTextareaHeight();

    try {
      // 先尝试快捷操作路由
      let aiContent = await routeQuickAction(messageText);

      // 无匹配则走通用柯德 chat
      if (aiContent === null) {
        const res = await coderAPI.chat({
          message: messageText,
          context: {
            feature: currentMode,
            pageContext: window.location.pathname,
          },
        });
        aiContent = res.success && res.data?.response
          ? res.data.response
          : res.data?.message || res.data?.content || '抱歉，我暂时无法回应，请稍后再试。';
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '网络异常，请稍后重试。',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  /** 更新性格选择 */
  const selectPersonality = async (personality: Personality) => {
    try {
      await coderAPI.updateProfile({ personality });
      setProfile(prev => ({ ...prev, personality }));
      // 首次选择完成后切换到对话界面
      setView('chat');
      if (!historyLoaded) loadHistory();
      // 添加柯德的问候消息
      setMessages([{
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: getGreeting(personality),
        timestamp: Date.now(),
      }]);
    } catch {
      // 保存失败仍然允许使用
      setProfile(prev => ({ ...prev, personality }));
      setView('chat');
    }
  };

  /** 切换工作模式 */
  const switchMode = async (mode: CoderMode) => {
    try {
      await coderAPI.updateProfile({ mode });
      setProfile(prev => ({ ...prev, mode }));
    } catch {
      // 静默失败
    }
  };

  /** 清除对话历史 */
  const clearChat = async () => {
    try {
      await coderAPI.clearHistory();
      setMessages([]);
    } catch {
      // 静默
    }
  };

  // ============================================================
  // 主动消息逻辑
  // ============================================================

  const startProactivePolling = () => {
    proactiveTimerRef.current = setInterval(async () => {
      try {
        const res = await coderAPI.checkProactive({
          type: 'PAGE_CONTEXT',
          data: { path: window.location.pathname, timestamp: Date.now() },
        });
        if (res.success && res.data?.shouldTrigger) {
          setHasNotification(true);
          setProactiveMessage(res.data.message || null);
          // 5秒后自动隐藏气泡
          if (bubbleDismissRef.current) clearTimeout(bubbleDismissRef.current);
          bubbleDismissRef.current = setTimeout(() => {
            setProactiveMessage(null);
          }, 5000);
        }
      } catch {
        // 轮询失败静默
      }
    }, PROACTIVE_POLL_INTERVAL);
  };

  const stopProactivePolling = () => {
    if (proactiveTimerRef.current) {
      clearInterval(proactiveTimerRef.current);
      proactiveTimerRef.current = null;
    }
    if (bubbleDismissRef.current) {
      clearTimeout(bubbleDismissRef.current);
      bubbleDismissRef.current = null;
    }
  };

  // ============================================================
  // UI 辅助方法
  // ============================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  /** 处理 textarea 自动增高 */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    // 最多3行高度（约72px）
    el.style.height = Math.min(el.scrollHeight, 72) + 'px';
  };

  /** 键盘事件：Enter发送，Shift+Enter换行 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** 打开面板 */
  const openPanel = () => {
    setIsOpen(true);
    setHasNotification(false);
    setProactiveMessage(null);
    setTimeout(() => textareaRef.current?.focus(), 300);
  };

  /** 获取问候语 */
  const getGreeting = (personality: Personality): string => {
    switch (personality) {
      case 'professional':
        return '你好，我是柯德。作为你的编程导师，我会用专业严谨的方式帮助你理解每一个知识点。有任何问题尽管提问。';
      case 'lively':
        return '嗨！我是柯德~ 🎉 你的编程学习好伙伴！一起来让代码变得有趣吧！有什么想挑战的？';
      case 'gentle':
        return '你好呀，我是柯德。很高兴认识你，让我们一步一步来，有什么不明白的随时告诉我，我会耐心引导你哦。';
    }
  };

  /** 格式化时间戳用于 hover 展示 */
  const formatTimestamp = (ts: number): string => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // ============================================================
  // 渲染：浮动球
  // ============================================================

  // --- 定时文字提示（每30秒轮播） ---
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(false);
  const tipMessages = ['需要帮助？', '点我聊天', '有什么问题？'];

  useEffect(() => {
    const interval = setInterval(() => {
      setTipVisible(true);
      setTipIndex(prev => (prev + 1) % tipMessages.length);
      // 3秒后隐藏
      setTimeout(() => setTipVisible(false), 3000);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderFloatingBall = () => (
    <div className="fixed bottom-5 right-5 z-50 md:bottom-5 md:right-5">
      {/* 发光环动画样式 */}
      <style>{`
        @keyframes coder-ball-ring {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes coder-tip-fade {
          0% { opacity: 0; transform: translateY(4px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        .coder-ball-ring {
          animation: coder-ball-ring 2.5s ease-out infinite;
        }
        .coder-tip-anim {
          animation: coder-tip-fade 3s ease-in-out forwards;
        }
      `}</style>

      {/* 定时文字提示 */}
      {tipVisible && !proactiveMessage && (
        <div className="absolute bottom-full right-0 mb-3 px-3 py-1.5 rounded-lg bg-slate-800/95 border border-purple-500/30 backdrop-blur-sm text-xs text-purple-300 shadow-lg coder-tip-anim whitespace-nowrap">
          {tipMessages[tipIndex]}
        </div>
      )}

      {/* 主动消息气泡 */}
      {proactiveMessage && (
        <div className="absolute bottom-full right-0 mb-3 max-w-[240px] px-3 py-2 rounded-xl bg-slate-800/95 border border-purple-500/30 backdrop-blur-sm text-xs text-slate-200 shadow-lg animate-fade-in-up">
          <p className="line-clamp-2">{proactiveMessage}</p>
          <div className="absolute bottom-0 right-5 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800 border-r border-b border-purple-500/30" />
        </div>
      )}

      <button
        onClick={openPanel}
        className="group relative flex items-center justify-center w-14 h-14 md:w-[56px] md:h-[56px] rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg shadow-purple-600/30 hover:shadow-purple-500/50 hover:scale-110 transition-all duration-300"
        title="柯德 · AI助手"
      >
        {/* 外扩发光环 */}
        <span className="absolute inset-0 rounded-full border-2 border-purple-400/40 coder-ball-ring" />
        {/* 呼吸动画 */}
        <span className="absolute inset-0 rounded-full bg-purple-400/15 animate-pulse" />
        {/* 柯德头像 */}
        <CoderAvatar size={42} animated={false} className="relative z-10" />
        {/* 通知红点 */}
        {hasNotification && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-slate-900 animate-pulse" />
        )}
      </button>

      {/* Tooltip */}
      <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
        柯德 · AI助手
      </span>
    </div>
  );

  // ============================================================
  // 渲染：欢迎界面（首次体验）
  // ============================================================

  const renderWelcome = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <CoderAvatar size={120} animated mood="excited" className="mb-4" />
      <h2 className="text-lg font-bold text-white mb-1">你好！我是柯德</h2>
      <p className="text-sm text-slate-400 mb-6 text-center">你的编程学习伙伴，选择一种我的性格吧：</p>

      <div className="w-full space-y-3">
        {PERSONALITY_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => selectPersonality(opt.key)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700/60 bg-slate-800/50 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-200 text-left group"
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">{opt.name}</p>
              <p className="text-xs text-slate-400 truncate">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ============================================================
  // 渲染：设置面板
  // ============================================================

  const renderSettings = () => (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      {/* 返回按钮 */}
      <button
        onClick={() => setView('chat')}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        返回对话
      </button>

      {/* 性格选择 */}
      <div>
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">性格风格</h4>
        <div className="space-y-2">
          {PERSONALITY_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => selectPersonality(opt.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                profile?.personality === opt.key
                  ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30'
                  : 'border-slate-700/60 bg-slate-800/50 hover:border-purple-500/30'
              }`}
            >
              <span className="text-xl">{opt.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{opt.name}</p>
                <p className="text-xs text-slate-400">{opt.desc}</p>
              </div>
              {profile?.personality === opt.key && (
                <span className="text-xs text-purple-400 font-medium">当前</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 模式切换（教师/管理员可见） */}
      {canSwitchMode && (
        <div>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">工作模式</h4>
          <div className="flex gap-2">
            {(['companion', 'assistant'] as CoderMode[])
              .concat(userRole === 'ADMIN' ? ['admin' as CoderMode] : [])
              .map(mode => (
                <button
                  key={mode}
                  onClick={() => switchMode(mode)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    currentMode === mode
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 清除对话 */}
      <div>
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">对话管理</h4>
        <ClearChatButton onClear={clearChat} />
      </div>

      {/* 关于柯德 */}
      <div className="pt-2 border-t border-slate-700/60">
        <p className="text-xs text-slate-500 text-center">
          柯德 · 你的智能编程伙伴
        </p>
        <p className="text-[10px] text-slate-600 text-center mt-1">
          基于 AI 驱动的个性化学习辅助系统
        </p>
      </div>
    </div>
  );

  // ============================================================
  // 渲染：消息区域
  // ============================================================

  const renderMessages = () => (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
      {/* 空状态引导 */}
      {messages.length === 0 && !isTyping && (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-sm text-slate-300 mb-1">有什么我能帮到你的？</p>
          <p className="text-xs text-slate-500">试试下方的快捷操作，或直接输入你的问题</p>
        </div>
      )}

      {/* 消息列表 */}
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
        >
          {/* 柯德头像 */}
          {msg.role === 'assistant' && (
            <CoderAvatar size={24} animated={false} className="mr-2 mt-0.5" />
          )}

          <div className="relative max-w-[80%]">
            <div
              className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-purple-600/80 text-white rounded-br-sm'
                  : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-code:text-purple-300 prose-code:bg-slate-700/50 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}
            </div>

            {/* Hover 显示时间戳 */}
            <span className={`absolute -bottom-4 text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ${
              msg.role === 'user' ? 'right-0' : 'left-0'
            }`}>
              {formatTimestamp(msg.timestamp)}
            </span>
          </div>
        </div>
      ))}

      {/* 打字指示器 */}
      {isTyping && (
        <div className="flex justify-start">
          <CoderAvatar size={24} animated={false} mood="thinking" className="mr-2" />
          <div className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700/50 rounded-bl-sm">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );

  // ============================================================
  // 渲染：快捷操作栏
  // ============================================================

  const renderQuickActions = () => {
    const actions = QUICK_ACTIONS[currentMode];
    return (
      <div className="px-3 py-2 border-t border-slate-700/40 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 min-w-max">
          {actions.map(action => (
            <button
              key={action.label}
              onClick={() => handleSend(action.prompt)}
              disabled={isTyping}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-200 whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================
  // 渲染：输入区域
  // ============================================================

  const renderInput = () => (
    <div className="px-3 py-3 border-t border-slate-700/60">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题..."
          rows={1}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none overflow-hidden transition-colors"
          disabled={isTyping}
          style={{ minHeight: '36px', maxHeight: '72px' }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className="shrink-0 p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-all duration-200 disabled:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ============================================================
  // 渲染：聊天面板
  // ============================================================

  const renderPanel = () => (
    <div className="fixed bottom-5 right-5 z-50 w-[400px] h-[600px] max-md:inset-0 max-md:w-full max-md:h-full max-md:bottom-0 max-md:right-0 flex flex-col rounded-2xl max-md:rounded-none border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 animate-slide-up">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <CoderAvatar size={32} animated={false} mood={isTyping ? 'thinking' : 'happy'} />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white">柯德</h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {MODE_LABELS[currentMode]}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400">在线</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* 设置按钮 */}
          <button
            onClick={() => setView(view === 'settings' ? 'chat' : 'settings')}
            className={`p-1.5 rounded-lg transition-colors ${
              view === 'settings'
                ? 'bg-purple-500/20 text-purple-300'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
          {/* 最小化 */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="最小化"
          >
            <Minus className="w-4 h-4" />
          </button>
          {/* 关闭 */}
          <button
            onClick={() => { setIsOpen(false); setView('chat'); }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {view === 'welcome' && renderWelcome()}
      {view === 'settings' && renderSettings()}
      {view === 'chat' && (
        <>
          {renderMessages()}
          {renderQuickActions()}
          {renderInput()}
        </>
      )}
    </div>
  );

  // ============================================================
  // 最终渲染
  // ============================================================

  return (
    <>
      {!isOpen && renderFloatingBall()}
      {isOpen && renderPanel()}
    </>
  );
}

// ============================================================
// 子组件：清除对话按钮（带确认）
// ============================================================

function ClearChatButton({ onClear }: { onClear: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = () => {
    if (confirming) {
      onClear();
      setConfirming(false);
    } else {
      setConfirming(true);
      // 3秒后自动取消确认状态
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
        confirming
          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 hover:border-slate-600'
      }`}
    >
      <Trash2 className="w-3.5 h-3.5" />
      {confirming ? '确认清除？' : '清除对话记录'}
    </button>
  );
}
