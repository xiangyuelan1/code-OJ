import { useEffect, useState, useCallback } from 'react';
import { checkinAPI } from '../services/api';
import {
  CalendarCheck,
  Flame,
  Gift,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
} from 'lucide-react';

/* ── 类型定义 ── */

interface CheckInStatus {
  todayCheckedIn: boolean;
  streakDays: number;
  lastCheckInDate: string | null;
  thisWeekCheckIns: string[];
  totalCheckIns: number;
}

interface CheckInResult {
  checkDate: string;
  streakDays: number;
  pointsEarned: number;
  totalPoints: number;
}

interface HistoryRecord {
  checkDate: string;
  streakDays: number;
  pointsEarned: number;
}

/** 里程碑奖励配置，与后端 calculatePoints 保持一致 */
const MILESTONES = [
  { days: 7, bonus: 20 },
  { days: 14, bonus: 50 },
  { days: 30, bonus: 100 },
];

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/* ── 工具函数 ── */

/** 获取当前自然周（周一至周日）的日期字符串数组 */
function getWeekDates(): string[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=周日
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** 获取指定月份的天数 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 获取指定月份第一天是星期几（0=周日，调整为周一=0） */
function getFirstDayOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // 转换为周一=0
}

/* ── 浮动积分动画组件 ── */

function FloatingPoints({ points }: { points: number }) {
  return (
    <div className="points-float pointer-events-none absolute left-1/2 -translate-x-1/2 -top-8 text-lg font-bold text-cyan-300">
      +{points} 积分
    </div>
  );
}

/* ── 主页面组件 ── */

export function CheckInPage() {
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState<number | null>(null);

  // 月历导航状态
  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statusRes, historyRes] = await Promise.all([
        checkinAPI.getStatus(),
        checkinAPI.getHistory(),
      ]);
      if (statusRes.success) setStatus(statusRes.data);
      if (historyRes.success) setHistory(historyRes.data);
    } catch (err: any) {
      setError(err?.error?.message || err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** 加载指定月份的历史记录 */
  const fetchMonthHistory = useCallback(async (year: number, month: number) => {
    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const res = await checkinAPI.getHistory(monthStr);
      if (res.success) setHistory(res.data);
    } catch {
      // 月历历史加载失败不阻塞页面，保持当前数据即可
    }
  }, []);

  /** 切换月份时重新拉取历史 */
  useEffect(() => {
    fetchMonthHistory(calendarYear, calendarMonth);
  }, [calendarYear, calendarMonth, fetchMonthHistory]);

  /* ── 签到操作 ── */

  const handleCheckIn = async () => {
    if (checkingIn || status?.todayCheckedIn) return;
    setCheckingIn(true);
    try {
      const res = await checkinAPI.checkin();
      if (res.success) {
        const result: CheckInResult = res.data;
        // 显示浮动积分动画
        setFloatingPoints(result.pointsEarned);
        setTimeout(() => setFloatingPoints(null), 1500);
        // 刷新状态
        await fetchData();
      }
    } catch (err: any) {
      setError(err?.error?.message || err?.message || '签到失败');
    } finally {
      setCheckingIn(false);
    }
  };

  /* ── 月历导航 ── */

  const goToPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  /* ── 加载与错误状态 ── */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="rounded-lg bg-cyan-600 px-6 py-2 text-white transition-colors hover:bg-cyan-500"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  /* ── 计算本周日历数据 ── */

  const weekDates = getWeekDates();
  const todayStr = new Date().toISOString().slice(0, 10);
  const checkedInSet = new Set(status?.thisWeekCheckIns ?? []);

  /* ── 计算里程碑进度 ── */

  const streakDays = status?.streakDays ?? 0;
  const nextMilestone = MILESTONES.find((m) => m.days > streakDays) ?? MILESTONES[MILESTONES.length - 1];
  const milestoneProgress = Math.min(streakDays / nextMilestone.days, 1);

  /* ── 计算月历数据 ── */

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayOffset = getFirstDayOffset(calendarYear, calendarMonth);
  const historyDateSet = new Set(history.map((r) => r.checkDate));
  const isCurrentMonth =
    calendarYear === now.getFullYear() && calendarMonth === now.getMonth();

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white md:p-6">
      {/* 浮动积分动画的 CSS keyframes 通过内联 style 注入 */}
      <style>{`
        @keyframes points-rise-fade {
          0% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -60px); }
        }
        .points-float {
          animation: points-rise-fade 1.5s ease-out forwards;
        }
        @keyframes sparkle-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.4), 0 0 40px rgba(6, 182, 212, 0.2); }
          50% { box-shadow: 0 0 30px rgba(6, 182, 212, 0.6), 0 0 60px rgba(6, 182, 212, 0.35); }
        }
        @keyframes border-pulse {
          0%, 100% { border-color: rgba(6, 182, 212, 0.6); }
          50% { border-color: rgba(6, 182, 212, 1); }
        }
      `}</style>

      <div className="mx-auto max-w-lg space-y-6">
        {/* ── 页面标题 ── */}
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-7 w-7 text-cyan-400" />
          <h1 className="text-2xl font-bold text-cyan-400">每日签到</h1>
        </div>

        {/* ── 签到按钮区域 ── */}
        <div className="relative flex flex-col items-center gap-4 rounded-2xl bg-slate-800 p-8">
          {/* 浮动积分动画 */}
          {floatingPoints !== null && <FloatingPoints points={floatingPoints} />}

          {status?.todayCheckedIn ? (
            <button
              disabled
              className="flex items-center gap-2 rounded-full bg-green-600/20 px-10 py-4 text-lg font-semibold text-green-400 ring-2 ring-green-500/40"
            >
              <Check className="h-5 w-5" />
              今日已签到 ✓
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 px-10 py-4 text-lg font-semibold text-slate-900 shadow-lg transition-all hover:scale-105 hover:shadow-cyan-400/30 disabled:opacity-60"
              style={{ animation: 'sparkle-pulse 2s ease-in-out infinite' }}
            >
              <Sparkles className="h-5 w-5" />
              {checkingIn ? '签到中...' : '签到'}
            </button>
          )}

          {/* 连续签到天数 */}
          <div className="flex items-center gap-2">
            {streakDays > 3 && <Flame className="h-6 w-6 text-orange-400" />}
            <span className="text-3xl font-bold text-cyan-300">{streakDays}</span>
            <span className="text-slate-400">连续签到 {streakDays} 天</span>
          </div>

          <p className="text-sm text-slate-500">
            累计签到 {status?.totalCheckIns ?? 0} 天
          </p>
        </div>

        {/* ── 本周日历 ── */}
        <div className="rounded-2xl bg-slate-800 p-6">
          <h2 className="mb-4 text-sm font-medium text-slate-400">本周签到</h2>
          <div className="flex justify-between">
            {weekDates.map((date, i) => {
              const isChecked = checkedInSet.has(date);
              const isToday = date === todayStr;
              const isFuture = date > todayStr;
              const isPastUnchecked = !isChecked && !isToday && !isFuture;

              return (
                <div key={date} className="flex flex-col items-center gap-2">
                  {/* 星期标签 */}
                  <span className="text-xs text-slate-500">{WEEKDAY_LABELS[i]}</span>

                  {/* 日期圆圈 */}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm ${
                      isChecked
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                        : isToday
                          ? 'border-cyan-400 text-cyan-400'
                          : isFuture
                            ? 'border-dashed border-slate-600 text-slate-600'
                            : isPastUnchecked
                              ? 'border-slate-700 bg-slate-700/50 text-slate-600'
                              : 'border-slate-600 text-slate-500'
                    }`}
                    style={
                      isToday && !isChecked
                        ? { animation: 'border-pulse 1.5s ease-in-out infinite' }
                        : undefined
                    }
                  >
                    {isChecked ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      new Date(date + 'T00:00:00').getDate()
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 里程碑奖励 ── */}
        <div className="rounded-2xl bg-slate-800 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-400" />
            <h2 className="text-sm font-medium text-slate-400">连续签到奖励</h2>
          </div>

          {/* 里程碑列表 */}
          <div className="mb-4 flex justify-between">
            {MILESTONES.map((m) => {
              const achieved = streakDays >= m.days;
              return (
                <div
                  key={m.days}
                  className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-center ${
                    achieved
                      ? 'bg-yellow-500/10 ring-1 ring-yellow-500/30'
                      : 'bg-slate-700/50'
                  }`}
                >
                  <span className={`text-xs ${achieved ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {m.days}天
                  </span>
                  <span className={`text-sm font-bold ${achieved ? 'text-yellow-300' : 'text-slate-400'}`}>
                    +{m.bonus}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 进度条 */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-500">
                距离 {nextMilestone.days} 天奖励
              </span>
              <span className="text-cyan-400">
                {streakDays}/{nextMilestone.days}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${milestoneProgress * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── 月度日历 ── */}
        <div className="rounded-2xl bg-slate-800 p-6">
          {/* 月份导航 */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={goToPrevMonth}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-medium text-slate-300">
              {calendarYear} 年 {calendarMonth + 1} 月
            </h2>
            <button
              onClick={goToNextMonth}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* 星期表头 */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="py-1 text-center text-xs text-slate-500"
              >
                {label}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-1">
            {/* 月初空白占位 */}
            {Array.from({ length: firstDayOffset }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* 日期格子 */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isChecked = historyDateSet.has(dateStr);
              const isToday = isCurrentMonth && day === now.getDate();

              return (
                <div
                  key={day}
                  className={`relative flex h-9 items-center justify-center rounded-lg text-sm ${
                    isToday
                      ? 'font-bold text-cyan-400 ring-1 ring-cyan-500/50'
                      : 'text-slate-400'
                  }`}
                >
                  {day}
                  {/* 已签到绿点 */}
                  {isChecked && (
                    <span className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-green-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 签到提示 ── */}
        <div className="flex items-start gap-2 rounded-xl bg-slate-800/50 p-4 text-xs text-slate-500">
          <Star className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
          <p>
            每天签到可获得积分奖励，连续签到天数越多，积分越高！
            达到 7 天、14 天、30 天里程碑时还有额外奖励哦～
          </p>
        </div>
      </div>
    </div>
  );
}
