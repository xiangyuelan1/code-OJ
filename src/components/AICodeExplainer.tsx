import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, BookOpen, Cpu, Tag } from 'lucide-react';
import { enhancedAiAPI } from '../services/api';

/* ── 类型定义 ── */

interface AICodeExplainerProps {
  /** 要解释的代码 */
  code: string;
  /** 编程语言 */
  language: string;
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 可选上下文（题目名称等） */
  context?: string;
}

interface ExplanationResult {
  explanation: string;
  keyPoints: string[];
  complexity?: string;
}

/* ── 主组件 ── */

/**
 * AI 代码解释器 - 可复用组件
 * 以侧面板/模态框形式展示 AI 对代码的逐行解释、关键知识点和复杂度分析
 */
export function AICodeExplainer({ code, language, visible, onClose, context }: AICodeExplainerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 缓存 key：避免相同代码重复请求
  const cacheKeyRef = useRef<string>('');

  useEffect(() => {
    if (!visible) return;

    const currentKey = `${code}:${language}:${context || ''}`;
    // 如果和上次请求的代码相同，不重复调用
    if (currentKey === cacheKeyRef.current && result) return;

    const fetchExplanation = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await enhancedAiAPI.explainCodeDetailed({ code, language, context });
        if (res.success && res.data) {
          setResult(res.data as ExplanationResult);
          cacheKeyRef.current = currentKey;
        } else {
          setError(res.error?.message || '获取解释失败');
        }
      } catch (err: any) {
        setError(err?.error?.message || err?.message || '请求失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  }, [visible, code, language, context]);

  // 按 Escape 关闭
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* 侧面板 */}
      <div
        ref={panelRef}
        className="relative w-full max-w-2xl h-full bg-slate-800 shadow-2xl border-l border-slate-700 overflow-y-auto animate-slide-in-right"
      >
        {/* 头部 */}
        <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">AI 代码解释</h2>
            <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
              {language}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-6">
          {/* 代码预览 */}
          <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-4 py-2 bg-slate-700/50 text-xs text-slate-400 flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              源代码
            </div>
            <pre className="p-4 text-sm text-slate-300 overflow-x-auto font-mono leading-relaxed">
              {code.split('\n').map((line, i) => (
                <div key={i} className="flex">
                  <span className="text-slate-600 select-none w-8 text-right mr-4 shrink-0">
                    {i + 1}
                  </span>
                  <span className="whitespace-pre">{line}</span>
                </div>
              ))}
            </pre>
          </div>

          {/* 加载态 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-cyan-500 border-t-transparent" />
              <span className="text-slate-400 text-sm">AI 正在分析代码...</span>
            </div>
          )}

          {/* 错误态 */}
          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 解释结果 */}
          {result && !loading && (
            <>
              {/* 逐行解释 */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-5">
                <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-cyan-400" />
                  代码解释
                </h3>
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.explanation}
                </div>
              </div>

              {/* 关键知识点 */}
              {result.keyPoints.length > 0 && (
                <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-5">
                  <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-yellow-400" />
                    关键知识点
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.keyPoints.map((point, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 复杂度分析 */}
              {result.complexity && (
                <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-5">
                  <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-purple-400" />
                    复杂度分析
                  </h3>
                  <p className="text-slate-300 text-sm font-mono">{result.complexity}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
