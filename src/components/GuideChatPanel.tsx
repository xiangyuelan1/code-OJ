import { useState, useCallback } from 'react';
import { starpathAPI, type GuideChatResult } from '../services/api';
import { Sparkles, Star, Send, X } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'guide';
  content: string;
}

interface GuideChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    planetId?: string;
    regionId?: string;
  };
  subtitle?: string;
  variant?: 'overlay' | 'sidebar';
}

/**
 * 共享 AI 星际向导聊天面板
 * - overlay 模式：从右侧滑入的全屏遮罩面板（用于 StarPath、StarRegion）
 * - sidebar 模式：固定在右侧的侧边栏（用于 StarChallenge）
 */
export function GuideChatPanel({
  isOpen,
  onClose,
  context,
  subtitle,
  variant = 'overlay',
}: GuideChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = useCallback(async (messageText?: string) => {
    const msg = (messageText ?? input).trim();
    if (!msg || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const res = await starpathAPI.guideChat({
        planetId: context?.planetId,
        regionId: context?.regionId,
        message: msg,
      });
      if (res.success && res.data) {
        const data = res.data as GuideChatResult;
        const guideContent = data.response || '让我想想...';
        setMessages((prev) => [...prev, { role: 'guide', content: guideContent }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'guide', content: '抱歉，我暂时无法回应，请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, context]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickSuggestions = [
    '我该学什么？',
    '我的薄弱点是什么？',
    '推荐一个挑战',
  ];

  if (!isOpen) return null;

  /* 侧边栏模式：固定在右侧，无遮罩 */
  if (variant === 'sidebar') {
    return (
      <div className="fixed top-0 right-0 z-20 h-full w-96 starfield-bg star-nebula border-l border-white/10 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <Star className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">AI 星际向导</h3>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm mb-4">有什么问题吗？</p>
              <div className="flex flex-col gap-2">
                {quickSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-violet-500/15 hover:border-violet-400/30 hover:text-white transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'guide' && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center mt-1">
                  <Star className="h-3.5 w-3.5 text-violet-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-500/20 border border-violet-400/20 text-violet-100 rounded-tr-md'
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-md'
                }`}
              >
                {msg.content}
                {msg.role === 'guide' && loading && idx === messages.length - 1 && (
                  <span className="typing-cursor" />
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== 'guide' && (
            <div className="flex gap-2.5">
              <div className="shrink-0 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center mt-1">
                <Star className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl rounded-tl-md bg-white/5 border border-white/10 text-slate-400 text-sm">
                <span className="typing-cursor">思考中</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-violet-400/40 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="向星际向导提问..."
              className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 遮罩模式：从右侧滑入的全屏遮罩面板 */
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md h-full animate-slide-in-right flex flex-col starfield-bg star-nebula">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <Star className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">AI 星际向导</h3>
              <p className="text-xs text-slate-400">{subtitle || '你的编程学习伙伴'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full bg-violet-500/15 border border-violet-400/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-violet-400" />
              </div>
              <p className="text-slate-400 text-sm mb-6">你好！我是你的星际向导 ✨</p>
              <div className="flex flex-col gap-2">
                {quickSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-violet-500/15 hover:border-violet-400/30 hover:text-white transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'guide' && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center mt-1">
                  <Star className="h-3.5 w-3.5 text-violet-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-500/20 border border-violet-400/20 text-violet-100 rounded-tr-md'
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-md'
                }`}
              >
                {msg.content}
                {msg.role === 'guide' && loading && idx === messages.length - 1 && (
                  <span className="typing-cursor" />
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== 'guide' && (
            <div className="flex gap-2.5">
              <div className="shrink-0 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center mt-1">
                <Star className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl rounded-tl-md bg-white/5 border border-white/10 text-slate-400 text-sm">
                <span className="typing-cursor">思考中</span>
              </div>
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="px-5 py-2 flex gap-2 overflow-x-auto border-t border-white/5">
            {quickSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:bg-violet-500/15 hover:text-white transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-violet-400/40 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="向星际向导提问..."
              className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
