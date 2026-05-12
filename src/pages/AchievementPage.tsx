import { useEffect, useState } from 'react';
import { achievementAPI } from '../services/api';
import { Trophy, Target, CheckCircle2, Circle, TrendingUp, Award, Star } from 'lucide-react';

export function AchievementPage() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [myAchievements, setMyAchievements] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'earned'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [allRes, myRes, statsRes] = await Promise.all([
        achievementAPI.getAll(),
        achievementAPI.getMine(),
        achievementAPI.getStats()
      ]);

      if (allRes.success) setAchievements(allRes.data);
      if (myRes.success) setMyAchievements(myRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      console.error('获取成就数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">加载中...</div>
      </div>
    );
  }

  const earnedIds = new Set(myAchievements.map((ua: any) => ua.achievement?.id));

  const displayAchievements = activeTab === 'all' 
    ? achievements 
    : achievements.filter((a: any) => earnedIds.has(a.id));

  const progressData = myAchievements.map((ua: any) => ({
    ...ua.achievement,
    earnedAt: ua.earnedAt
  }));

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400">🏆 成就中心</h1>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 rounded-lg p-6 text-center">
              <Trophy className="h-10 w-10 mx-auto mb-2 text-yellow-400" />
              <div className="text-3xl font-bold text-yellow-400">{stats.points}</div>
              <div className="text-sm text-slate-400">总积分</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 text-center">
              <Award className="h-10 w-10 mx-auto mb-2 text-purple-400" />
              <div className="text-3xl font-bold text-purple-400">{stats.problemsCompleted}</div>
              <div className="text-sm text-slate-400">完成题目</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 text-center">
              <TrendingUp className="h-10 w-10 mx-auto mb-2 text-green-400" />
              <div className="text-3xl font-bold text-green-400">{stats.matchesWon}</div>
              <div className="text-sm text-slate-400">对战胜利</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 text-center">
              <Star className="h-10 w-10 mx-auto mb-2 text-cyan-400" />
              <div className="text-3xl font-bold text-cyan-400">{stats.achievementsEarned}</div>
              <div className="text-sm text-slate-400">已获成就</div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <Target className="inline-block h-4 w-4 mr-2" />
            全部成就 ({achievements.length})
          </button>
          <button
            onClick={() => setActiveTab('earned')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'earned'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <Trophy className="inline-block h-4 w-4 mr-2" />
            已获得 ({myAchievements.length})
          </button>
        </div>

        {displayAchievements.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-lg">
              {activeTab === 'all' ? '暂无成就' : '尚未获得任何成就，继续努力！'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayAchievements.map((achievement: any) => {
              const isEarned = earnedIds.has(achievement.id);
              const userAchievement = progressData.find((pa: any) => pa.id === achievement.id);
              
              return (
                <div
                  key={achievement.id}
                  className={`relative rounded-lg p-6 transition-all ${
                    isEarned
                      ? 'bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-600'
                      : 'bg-slate-800 border-2 border-slate-700'
                  }`}
                >
                  {isEarned && (
                    <div className="absolute -top-3 -right-3 bg-yellow-500 text-black rounded-full w-8 h-8 flex items-center justify-center">
                      ✓
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className={`text-4xl ${isEarned ? '' : 'grayscale opacity-50'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold mb-1 ${isEarned ? 'text-yellow-400' : 'text-slate-400'}`}>
                        {achievement.name}
                      </h3>
                      <p className="text-sm text-slate-400 mb-2">
                        {achievement.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isEarned ? 'text-green-400' : 'text-slate-500'}`}>
                          +{achievement.points} 积分
                        </span>
                        {isEarned && userAchievement?.earnedAt && (
                          <span className="text-xs text-slate-500">
                            {new Date(userAchievement.earnedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isEarned && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>进度</span>
                        <span>0%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-600 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
