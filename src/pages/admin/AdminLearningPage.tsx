import { useState, useEffect, useCallback } from 'react';
import {
  learningAdminAPI,
  problemsAPI,
  type StarMapRegion,
} from '../../services/api';
import {
  Globe, Plus, Trash2, Edit3, ChevronRight,
  Loader2, Save, X, Search, Bug, Briefcase,
} from 'lucide-react';

type TabKey = 'starpath' | 'interview' | 'bughunter';

interface PlanetItem {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  tags: string;
  problemIds: string;
  order: number;
}

interface InterviewTemplateItem {
  id: string;
  role: string;
  difficulty: string;
  question: string;
  expectedTopics: string;
  hints: string;
  correctAnswer: string;
}

interface BugScenarioItem {
  id: string;
  topic: string;
  difficulty: string;
  buggyCode: string;
  correctCode: string;
  hints: string;
  bugExplanations: string;
  language: string;
}

export function AdminLearningPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('starpath');
  const [loading, setLoading] = useState(true);

  /* 星途管理状态 */
  const [regions, setRegions] = useState<StarMapRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [planets, setPlanets] = useState<PlanetItem[]>([]);
  const [editingRegion, setEditingRegion] = useState<any>(null);
  const [editingPlanet, setEditingPlanet] = useState<any>(null);

  /* 面试题库状态 */
  const [interviewTemplates, setInterviewTemplates] = useState<InterviewTemplateItem[]>([]);
  const [editingInterview, setEditingInterview] = useState<any>(null);

  /* Bug场景库状态 */
  const [bugScenarios, setBugScenarios] = useState<BugScenarioItem[]>([]);
  const [editingBug, setEditingBug] = useState<any>(null);

  /* 题目搜索 */
  const [problemSearch, setProblemSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'starpath', label: '星途管理', icon: <Globe className="h-4 w-4" /> },
    { key: 'interview', label: '面试题库', icon: <Briefcase className="h-4 w-4" /> },
    { key: 'bughunter', label: 'Bug场景库', icon: <Bug className="h-4 w-4" /> },
  ];

  const fetchRegions = useCallback(async () => {
    try {
      const res = await learningAdminAPI.getStats();
      if (res.success && res.data) {
        /* 从 starpath API 获取完整星域列表 */
        const { starpathAPI } = await import('../../services/api');
        const mapRes = await starpathAPI.getMap();
        if (mapRes.success && mapRes.data) {
          setRegions(mapRes.data.regions);
        }
      }
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlanets = useCallback(async (regionId: string) => {
    try {
      const { starpathAPI } = await import('../../services/api');
      const res = await starpathAPI.getRegion(regionId);
      if (res.success && res.data) {
        setPlanets(res.data.planets.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          difficulty: p.difficulty,
          tags: JSON.stringify(p.tags || []),
          problemIds: '[]',
          order: 0,
        })));
      }
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  }, []);

  const fetchInterviewTemplates = useCallback(async () => {
    try {
      const res = await learningAdminAPI.getInterviewTemplates();
      if (res.success && res.data) {
        setInterviewTemplates(res.data);
      }
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  }, []);

  const fetchBugScenarios = useCallback(async () => {
    try {
      const res = await learningAdminAPI.getBugScenarios();
      if (res.success && res.data) {
        setBugScenarios(res.data);
      }
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  }, []);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  useEffect(() => {
    if (activeTab === 'interview') fetchInterviewTemplates();
    if (activeTab === 'bughunter') fetchBugScenarios();
  }, [activeTab, fetchInterviewTemplates, fetchBugScenarios]);

  useEffect(() => {
    if (selectedRegionId) fetchPlanets(selectedRegionId);
  }, [selectedRegionId, fetchPlanets]);

  const handleSearchProblems = async (query: string) => {
    setProblemSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await problemsAPI.getAll({ search: query });
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  /* ── 星途管理 ── */
  const handleSaveRegion = async () => {
    if (!editingRegion?.name) return;
    try {
      await learningAdminAPI.manageRegion(editingRegion);
      setEditingRegion(null);
      fetchRegions();
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  const handleDeleteRegion = async (id: string) => {
    if (!confirm('确定删除此星域？其下所有星球也会被删除。')) return;
    try {
      await learningAdminAPI.deleteRegion(id);
      if (selectedRegionId === id) {
        setSelectedRegionId(null);
        setPlanets([]);
      }
      fetchRegions();
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  const handleSavePlanet = async () => {
    if (!editingPlanet?.name || !editingPlanet?.regionId) return;
    try {
      await learningAdminAPI.managePlanet(editingPlanet);
      setEditingPlanet(null);
      if (selectedRegionId) fetchPlanets(selectedRegionId);
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  const handleDeletePlanet = async (id: string) => {
    if (!confirm('确定删除此星球？')) return;
    try {
      await learningAdminAPI.deletePlanet(id);
      if (selectedRegionId) fetchPlanets(selectedRegionId);
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  /* ── 面试题库 ── */
  const handleSaveInterview = async () => {
    if (!editingInterview?.question) return;
    try {
      await learningAdminAPI.createInterviewTemplate({
        ...editingInterview,
        expectedTopics: typeof editingInterview.expectedTopics === 'string'
          ? editingInterview.expectedTopics.split(',').map((s: string) => s.trim()).filter(Boolean)
          : editingInterview.expectedTopics,
        hints: typeof editingInterview.hints === 'string'
          ? editingInterview.hints.split('\n').filter((s: string) => s.trim())
          : editingInterview.hints,
      });
      setEditingInterview(null);
      fetchInterviewTemplates();
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  const handleDeleteInterview = async (id: string) => {
    if (!confirm('确定删除此面试题？')) return;
    try {
      await learningAdminAPI.deleteInterviewTemplate(id);
      fetchInterviewTemplates();
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  /* ── Bug场景库 ── */
  const handleSaveBug = async () => {
    if (!editingBug?.buggyCode) return;
    try {
      await learningAdminAPI.createBugScenario({
        ...editingBug,
        hints: typeof editingBug.hints === 'string'
          ? editingBug.hints.split('\n').filter((s: string) => s.trim())
          : editingBug.hints,
        bugExplanations: typeof editingBug.bugExplanations === 'string'
          ? editingBug.bugExplanations.split('\n').filter((s: string) => s.trim())
          : editingBug.bugExplanations,
      });
      setEditingBug(null);
      fetchBugScenarios();
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  const handleDeleteBug = async (id: string) => {
    if (!confirm('确定删除此Bug场景？')) return;
    try {
      await learningAdminAPI.deleteBugScenario(id);
      fetchBugScenarios();
    } catch (error: any) {
      console.error('操作失败', error);
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">学习模块管理</h1>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 星途管理 */}
      {activeTab === 'starpath' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 星域列表 */}
          <div className="lg:col-span-1 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">星域列表</h2>
              <button
                onClick={() => setEditingRegion({ name: '', description: '', icon: '⭐', color: '#4FC3F7' })}
                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30"
              >
                <Plus className="h-4 w-4" /> 添加星域
              </button>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {regions.map(region => (
                <div
                  key={region.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedRegionId === region.id
                      ? 'bg-slate-700 border border-cyan-500/30'
                      : 'bg-slate-900/50 hover:bg-slate-700/50 border border-transparent'
                  }`}
                  onClick={() => setSelectedRegionId(region.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{region.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{region.name}</div>
                      <div className="text-xs text-slate-400">{region.totalPlanets} 个星球</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingRegion({ id: region.id, name: region.name, description: region.description, icon: region.icon, color: region.color }); }}
                      className="p-1 text-slate-400 hover:text-cyan-400"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRegion(region.id); }}
                      className="p-1 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {regions.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">暂无星域</p>
              )}
            </div>
          </div>

          {/* 星球列表 */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl p-4 border border-slate-700">
            {selectedRegionId ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    星球列表
                    <ChevronRight className="inline h-4 w-4 mx-2 text-slate-500" />
                    <span className="text-cyan-400">{regions.find(r => r.id === selectedRegionId)?.name}</span>
                  </h2>
                  <button
                    onClick={() => setEditingPlanet({ regionId: selectedRegionId, name: '', description: '', difficulty: 'MEDIUM', tags: [] })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30"
                  >
                    <Plus className="h-4 w-4" /> 添加星球
                  </button>
                </div>
                <div className="space-y-2">
                  {planets.map(planet => (
                    <div key={planet.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-white">{planet.name}</div>
                        <div className="text-xs text-slate-400">
                          难度: {planet.difficulty} | {planet.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingPlanet({ id: planet.id, regionId: selectedRegionId, name: planet.name, description: planet.description, difficulty: planet.difficulty })}
                          className="p-1 text-slate-400 hover:text-cyan-400"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlanet(planet.id)}
                          className="p-1 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                请选择一个星域查看星球
              </div>
            )}
          </div>
        </div>
      )}

      {/* 面试题库 */}
      {activeTab === 'interview' && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">面试题模板</h2>
            <button
              onClick={() => setEditingInterview({ role: 'frontend', difficulty: 'easy', question: '', expectedTopics: '', hints: '', correctAnswer: '' })}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30"
            >
              <Plus className="h-4 w-4" /> 添加面试题
            </button>
          </div>
          <div className="space-y-3">
            {interviewTemplates.map(tpl => (
              <div key={tpl.id} className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">{tpl.role}</span>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">{tpl.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingInterview({
                        id: tpl.id, role: tpl.role, difficulty: tpl.difficulty,
                        question: tpl.question,
                        expectedTopics: Array.isArray(tpl.expectedTopics) ? tpl.expectedTopics.join(', ') : tpl.expectedTopics,
                        hints: Array.isArray(tpl.hints) ? tpl.hints.join('\n') : tpl.hints,
                        correctAnswer: tpl.correctAnswer,
                      })}
                      className="p-1 text-slate-400 hover:text-cyan-400"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInterview(tpl.id)}
                      className="p-1 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-300 line-clamp-3">{tpl.question}</p>
              </div>
            ))}
            {interviewTemplates.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">暂无面试题模板</p>
            )}
          </div>
        </div>
      )}

      {/* Bug场景库 */}
      {activeTab === 'bughunter' && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Bug场景库</h2>
            <button
              onClick={() => setEditingBug({ topic: '数组', difficulty: 'easy', buggyCode: '', correctCode: '', hints: '', bugExplanations: '', language: 'python' })}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30"
            >
              <Plus className="h-4 w-4" /> 添加Bug场景
            </button>
          </div>
          <div className="space-y-3">
            {bugScenarios.map(scenario => (
              <div key={scenario.id} className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">{scenario.topic}</span>
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">{scenario.difficulty}</span>
                    <span className="px-2 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">{scenario.language}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingBug({
                        id: scenario.id, topic: scenario.topic, difficulty: scenario.difficulty,
                        buggyCode: scenario.buggyCode, correctCode: scenario.correctCode,
                        hints: Array.isArray(scenario.hints) ? scenario.hints.join('\n') : scenario.hints,
                        bugExplanations: Array.isArray(scenario.bugExplanations) ? scenario.bugExplanations.join('\n') : scenario.bugExplanations,
                        language: scenario.language,
                      })}
                      className="p-1 text-slate-400 hover:text-cyan-400"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBug(scenario.id)}
                      className="p-1 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <pre className="text-xs text-slate-400 bg-slate-950 p-2 rounded overflow-x-auto max-h-32">
                  {scenario.buggyCode.substring(0, 200)}{scenario.buggyCode.length > 200 ? '...' : ''}
                </pre>
              </div>
            ))}
            {bugScenarios.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">暂无Bug场景</p>
            )}
          </div>
        </div>
      )}

      {/* ── 编辑模态框：星域 ── */}
      {editingRegion && (
        <Modal title={editingRegion.id ? '编辑星域' : '添加星域'} onClose={() => setEditingRegion(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">名称</label>
              <input
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                value={editingRegion.name}
                onChange={e => setEditingRegion({ ...editingRegion, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">描述</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                rows={3}
                value={editingRegion.description}
                onChange={e => setEditingRegion({ ...editingRegion, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">图标</label>
                <input
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingRegion.icon}
                  onChange={e => setEditingRegion({ ...editingRegion, icon: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">颜色</label>
                <input
                  type="color"
                  className="w-full h-10 bg-slate-900 border border-slate-600 rounded-lg"
                  value={editingRegion.color}
                  onChange={e => setEditingRegion({ ...editingRegion, color: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingRegion(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
              <button onClick={handleSaveRegion} className="flex items-center gap-1 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600">
                <Save className="h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 编辑模态框：星球 ── */}
      {editingPlanet && (
        <Modal title={editingPlanet.id ? '编辑星球' : '添加星球'} onClose={() => setEditingPlanet(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">名称</label>
              <input
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                value={editingPlanet.name}
                onChange={e => setEditingPlanet({ ...editingPlanet, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">描述</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                rows={2}
                value={editingPlanet.description}
                onChange={e => setEditingPlanet({ ...editingPlanet, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">难度</label>
              <select
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                value={editingPlanet.difficulty}
                onChange={e => setEditingPlanet({ ...editingPlanet, difficulty: e.target.value })}
              >
                <option value="EASY">简单</option>
                <option value="MEDIUM">中等</option>
                <option value="HARD">困难</option>
              </select>
            </div>

            {/* 题目搜索与分配 */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">搜索题目并分配</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm"
                  placeholder="搜索题目..."
                  value={problemSearch}
                  onChange={e => handleSearchProblems(e.target.value)}
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto bg-slate-950 rounded-lg border border-slate-700">
                  {searchResults.map((p: any) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 border-b border-slate-800 last:border-0"
                      onClick={() => {
                        const current = editingPlanet.problemIds || [];
                        if (!current.includes(p.id)) {
                          setEditingPlanet({ ...editingPlanet, problemIds: [...current, p.id] });
                        }
                        setSearchResults([]);
                        setProblemSearch('');
                      }}
                    >
                      {p.title} <span className="text-slate-500">({p.difficulty})</span>
                    </button>
                  ))}
                </div>
              )}
              {(editingPlanet.problemIds || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(editingPlanet.problemIds || []).map((pid: string) => (
                    <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                      {pid.substring(0, 8)}...
                      <button onClick={() => setEditingPlanet({
                        ...editingPlanet,
                        problemIds: editingPlanet.problemIds.filter((id: string) => id !== pid),
                      })}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingPlanet(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
              <button onClick={handleSavePlanet} className="flex items-center gap-1 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600">
                <Save className="h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 编辑模态框：面试题 ── */}
      {editingInterview && (
        <Modal title={editingInterview.id ? '编辑面试题' : '添加面试题'} onClose={() => setEditingInterview(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">岗位</label>
                <select
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingInterview.role}
                  onChange={e => setEditingInterview({ ...editingInterview, role: e.target.value })}
                >
                  <option value="frontend">前端开发</option>
                  <option value="backend">后端开发</option>
                  <option value="fullstack">全栈开发</option>
                  <option value="algorithm">算法工程师</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">难度</label>
                <select
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingInterview.difficulty}
                  onChange={e => setEditingInterview({ ...editingInterview, difficulty: e.target.value })}
                >
                  <option value="easy">初级</option>
                  <option value="medium">中级</option>
                  <option value="hard">高级</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">题目描述</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                rows={6}
                value={editingInterview.question}
                onChange={e => setEditingInterview({ ...editingInterview, question: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">考察知识点（逗号分隔）</label>
              <input
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                value={editingInterview.expectedTopics}
                onChange={e => setEditingInterview({ ...editingInterview, expectedTopics: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">提示（每行一个）</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                rows={3}
                value={editingInterview.hints}
                onChange={e => setEditingInterview({ ...editingInterview, hints: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingInterview(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
              <button onClick={handleSaveInterview} className="flex items-center gap-1 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600">
                <Save className="h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 编辑模态框：Bug场景 ── */}
      {editingBug && (
        <Modal title={editingBug.id ? '编辑Bug场景' : '添加Bug场景'} onClose={() => setEditingBug(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">主题</label>
                <select
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingBug.topic}
                  onChange={e => setEditingBug({ ...editingBug, topic: e.target.value })}
                >
                  <option value="数组">数组</option>
                  <option value="字符串">字符串</option>
                  <option value="链表">链表</option>
                  <option value="树">树</option>
                  <option value="图">图</option>
                  <option value="动态规划">动态规划</option>
                  <option value="排序">排序</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">难度</label>
                <select
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingBug.difficulty}
                  onChange={e => setEditingBug({ ...editingBug, difficulty: e.target.value })}
                >
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">语言</label>
                <select
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingBug.language}
                  onChange={e => setEditingBug({ ...editingBug, language: e.target.value })}
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">有Bug的代码</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono"
                rows={8}
                value={editingBug.buggyCode}
                onChange={e => setEditingBug({ ...editingBug, buggyCode: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">正确代码</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono"
                rows={8}
                value={editingBug.correctCode}
                onChange={e => setEditingBug({ ...editingBug, correctCode: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">提示（每行一个）</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                rows={3}
                value={editingBug.hints}
                onChange={e => setEditingBug({ ...editingBug, hints: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Bug解释（每行一个）</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                rows={3}
                value={editingBug.bugExplanations}
                onChange={e => setEditingBug({ ...editingBug, bugExplanations: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingBug(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
              <button onClick={handleSaveBug} className="flex items-center gap-1 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600">
                <Save className="h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── 通用模态框组件 ── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
