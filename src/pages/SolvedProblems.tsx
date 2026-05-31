import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { submissionsAPI } from '../services/api';
import { CheckCircle2, Loader2, ArrowLeft, Trophy, Code, FileText, PenTool } from 'lucide-react';

const TYPE_ICONS: Record<string, typeof Code> = { PROGRAMMING: Code, CHOICE: FileText, FILL_BLANK: PenTool };
const DIFF_COLORS: Record<string, string> = { EASY: 'text-green-400', MEDIUM: 'text-yellow-400', HARD: 'text-red-400' };
const DIFF_BG: Record<string, string> = { EASY: 'bg-green-500/15', MEDIUM: 'bg-yellow-500/15', HARD: 'bg-red-500/15' };

export function SolvedProblemsPage() {
  const [solved, setSolved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await submissionsAPI.getSolvedProblems();
      if (res.success && res.data) setSolved(res.data);
    } catch { /* 静默处理 */ } finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? solved : solved.filter((s: any) => s.problem?.type === filter);
  const easyCount = solved.filter((s: any) => s.problem?.difficulty === 'EASY').length;
  const medCount = solved.filter((s: any) => s.problem?.difficulty === 'MEDIUM').length;
  const hardCount = solved.filter((s: any) => s.problem?.difficulty === 'HARD').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            已解决题目
          </h1>
          <p className="text-sm text-slate-400 mt-1">你成功通过的题目集合</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-800">
          <div className="text-2xl font-bold text-white">{solved.length}</div>
          <div className="text-xs text-slate-400 mt-1">总计</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-green-500/20">
          <div className="text-2xl font-bold text-green-400">{easyCount}</div>
          <div className="text-xs text-slate-400 mt-1">简单</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-yellow-500/20">
          <div className="text-2xl font-bold text-yellow-400">{medCount}</div>
          <div className="text-xs text-slate-400 mt-1">中等</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-red-500/20">
          <div className="text-2xl font-bold text-red-400">{hardCount}</div>
          <div className="text-xs text-slate-400 mt-1">困难</div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'PROGRAMMING', 'CHOICE', 'FILL_BLANK'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === t ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            {t === 'all' ? '全部' : t === 'PROGRAMMING' ? '编程题' : t === 'CHOICE' ? '选择题' : '填空题'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            {solved.length === 0 ? '还没有解决任何题目，去刷题吧！' : '当前筛选条件下没有题目'}
          </p>
          <Link to="/categories" className="inline-block mt-4 px-4 py-2 rounded-lg bg-violet-500/15 text-violet-300 text-sm hover:bg-violet-500/25 transition-all">
            去刷题
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s: any, idx: number) => {
            const Icon = TYPE_ICONS[s.problem?.type] || Code;
            return (
              <Link
                key={s.problemId}
                to={`/solve/${s.problemId}`}
                className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-violet-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <span className="text-sm text-slate-500 w-8 text-right">{idx + 1}</span>
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                    {s.problem?.title || '未知题目'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${DIFF_BG[s.problem?.difficulty] || ''} ${DIFF_COLORS[s.problem?.difficulty] || ''}`}>
                      {s.problem?.difficulty === 'EASY' ? '简单' : s.problem?.difficulty === 'MEDIUM' ? '中等' : '困难'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {s.problem?.type === 'PROGRAMMING' ? '编程' : s.problem?.type === 'CHOICE' ? '选择' : '填空'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-amber-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">AC</span>
                  </div>
                  {s.score != null && <div className="text-[10px] text-slate-500 mt-0.5">{s.score}分</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
