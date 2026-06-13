import { useState, useEffect, useCallback } from 'react';
import {
  learningAdminAPI,
  problemsAPI,
  minigameAPI,
  companionAPI,
  type StarMapRegion,
} from '../../services/api';
import {
  Globe, Plus, Trash2, Edit3, ChevronRight,
  Loader2, Save, X, Search, Bug, Briefcase,
  Gamepad2, Sparkles, ToggleLeft, ToggleRight, PawPrint, Settings2,
} from 'lucide-react';

type TabKey = 'modules' | 'starpath' | 'interview' | 'bughunter' | 'minigame' | 'companion';

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

/** 模块配置项类型 */
interface LearningModuleItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  enabled: boolean;
  order: number;
  category?: string;
}

export function AdminLearningPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('modules');
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

  /* 小游戏管理状态 */
  type MiniGameTab = 'code_quiz' | 'daily_quiz' | 'flash_card' | 'typing_challenge';
  const [miniGameTab, setMiniGameTab] = useState<MiniGameTab>('code_quiz');
  const [miniGameItems, setMiniGameItems] = useState<any[]>([]);
  const [miniGameLoading, setMiniGameLoading] = useState(false);
  const [editingMiniGame, setEditingMiniGame] = useState<any>(null);
  const [aiGenerateDialog, setAiGenerateDialog] = useState(false);
  const [aiGenerateForm, setAiGenerateForm] = useState({ topic: '', count: 5, difficulty: 'MEDIUM' });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedItems, setAiGeneratedItems] = useState<any[]>([]);
  const [aiSelectedItems, setAiSelectedItems] = useState<Set<number>>(new Set());

  /* 模块配置状态 */
  const [moduleList, setModuleList] = useState<LearningModuleItem[]>([]);
  const [moduleSaving, setModuleSaving] = useState(false);

  /* 太空伙伴管理状态 */
  const [companions, setCompanions] = useState<any[]>([]);
  const [companionLoading, setCompanionLoading] = useState(false);
  const [companionRarityFilter, setCompanionRarityFilter] = useState('ALL');
  const [editingCompanion, setEditingCompanion] = useState<any>(null);
  const [companionAiDialog, setCompanionAiDialog] = useState(false);
  const [companionAiForm, setCompanionAiForm] = useState({ count: 3, rarity: 'COMMON', theme: '' });
  const [companionAiGenerating, setCompanionAiGenerating] = useState(false);
  const [companionAiResults, setCompanionAiResults] = useState<any[]>([]);
  const [companionAiSelected, setCompanionAiSelected] = useState<Set<number>>(new Set());

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'modules', label: '模块配置', icon: <Settings2 className="h-4 w-4" /> },
    { key: 'starpath', label: '星途管理', icon: <Globe className="h-4 w-4" /> },
    { key: 'interview', label: '面试题库', icon: <Briefcase className="h-4 w-4" /> },
    { key: 'bughunter', label: 'Bug场景库', icon: <Bug className="h-4 w-4" /> },
    { key: 'minigame', label: '小游戏管理', icon: <Gamepad2 className="h-4 w-4" /> },
    { key: 'companion', label: '太空伙伴', icon: <PawPrint className="h-4 w-4" /> },
  ];

  const fetchModules = useCallback(async () => {
    try {
      const res = await learningAdminAPI.getModules();
      if (res.success && res.data) {
        setModuleList(res.data);
      }
    } catch (error: any) {
      console.error('获取模块配置失败', error);
    }
  }, []);

  const handleToggleModule = async (key: string, currentEnabled: boolean) => {
    // 乐观更新
    setModuleList(prev => prev.map(m => m.key === key ? { ...m, enabled: !currentEnabled } : m));
    setModuleSaving(true);
    try {
      const updated = moduleList.map(m => m.key === key ? { ...m, enabled: !currentEnabled } : m);
      await learningAdminAPI.updateModules(updated);
    } catch (error: any) {
      // 回滚
      setModuleList(prev => prev.map(m => m.key === key ? { ...m, enabled: currentEnabled } : m));
      alert(error.error?.message || error.message || '操作失败');
    } finally {
      setModuleSaving(false);
    }
  };

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
    fetchModules();
  }, [fetchRegions, fetchModules]);

  const fetchMiniGameContent = useCallback(async (gameType: MiniGameTab) => {
    setMiniGameLoading(true);
    try {
      const res = await minigameAPI.getAdminContent({ gameType });
      if (res.success && res.data) {
        setMiniGameItems(res.data.items || []);
      }
    } catch (error: any) {
      console.error('获取小游戏内容失败', error);
    } finally {
      setMiniGameLoading(false);
    }
  }, []);

  const fetchCompanions = useCallback(async (rarity?: string) => {
    setCompanionLoading(true);
    try {
      const res = await companionAPI.getAdminList({ rarity: rarity || companionRarityFilter });
      if (res.success && res.data) {
        setCompanions(res.data);
      }
    } catch (error: any) {
      console.error('获取太空伙伴失败', error);
    } finally {
      setCompanionLoading(false);
    }
  }, [companionRarityFilter]);

  useEffect(() => {
    if (activeTab === 'interview') fetchInterviewTemplates();
    if (activeTab === 'bughunter') fetchBugScenarios();
    if (activeTab === 'minigame') fetchMiniGameContent(miniGameTab);
    if (activeTab === 'companion') fetchCompanions();
  }, [activeTab, fetchInterviewTemplates, fetchBugScenarios, miniGameTab, fetchMiniGameContent, fetchCompanions]);

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

  /* ── 小游戏管理操作 ── */
  const handleSaveMiniGame = async () => {
    if (!editingMiniGame?.title) return;
    try {
      const data = {
        gameType: miniGameTab,
        title: editingMiniGame.title,
        content: editingMiniGame.content,
        difficulty: editingMiniGame.difficulty || 'MEDIUM',
        tags: editingMiniGame.tags || [],
        isActive: editingMiniGame.isActive !== false,
        sortOrder: editingMiniGame.sortOrder || 0,
      };
      if (editingMiniGame.id) {
        await minigameAPI.updateContent(editingMiniGame.id, data);
      } else {
        await minigameAPI.createContent(data);
      }
      setEditingMiniGame(null);
      fetchMiniGameContent(miniGameTab);
    } catch (error: any) {
      alert(error.error?.message || error.message || '保存失败');
    }
  };

  const handleDeleteMiniGame = async (id: string) => {
    if (!confirm('确定删除此内容？')) return;
    try {
      await minigameAPI.deleteContent(id);
      fetchMiniGameContent(miniGameTab);
    } catch (error: any) {
      alert(error.error?.message || error.message || '删除失败');
    }
  };

  const handleToggleMiniGame = async (id: string, currentActive: boolean) => {
    try {
      await minigameAPI.updateContent(id, { isActive: !currentActive });
      fetchMiniGameContent(miniGameTab);
    } catch (error: any) {
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  const handleAiGenerate = async () => {
    if (!aiGenerateForm.topic) { alert('请输入主题'); return; }
    setAiGenerating(true);
    setAiGeneratedItems([]);
    setAiSelectedItems(new Set());
    try {
      const res = await minigameAPI.aiGenerate({
        gameType: miniGameTab,
        count: aiGenerateForm.count,
        difficulty: aiGenerateForm.difficulty,
        topic: aiGenerateForm.topic,
      });
      if (res.success && res.data) {
        setAiGeneratedItems(res.data);
        // 默认全选
        setAiSelectedItems(new Set(res.data.map((_: any, i: number) => i)));
      }
    } catch (error: any) {
      alert(error.error?.message || error.message || 'AI 生成失败');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAiGenerated = async () => {
    const toSave = aiGeneratedItems.filter((_, i) => aiSelectedItems.has(i));
    if (toSave.length === 0) { alert('请至少选择一项'); return; }
    try {
      for (const item of toSave) {
        await minigameAPI.createContent({
          gameType: miniGameTab,
          title: item.title,
          content: item.content,
          difficulty: aiGenerateForm.difficulty,
          tags: [],
        });
      }
      setAiGenerateDialog(false);
      setAiGeneratedItems([]);
      fetchMiniGameContent(miniGameTab);
    } catch (error: any) {
      alert(error.error?.message || error.message || '保存失败');
    }
  };

  /* ── 太空伙伴操作 ── */
  const handleSaveCompanion = async () => {
    if (!editingCompanion?.name) return;
    try {
      const data = {
        name: editingCompanion.name,
        description: editingCompanion.description || '',
        rarity: editingCompanion.rarity || 'COMMON',
        personality: editingCompanion.personality || '',
        appearance: editingCompanion.appearance || '',
        stats: editingCompanion.stats || {},
        skills: editingCompanion.skills || [],
        unlockCondition: editingCompanion.unlockCondition || '',
        unlockType: editingCompanion.unlockType || 'level',
        unlockValue: Number(editingCompanion.unlockValue) || 1,
        isActive: editingCompanion.isActive ?? false,
        isDefault: editingCompanion.isDefault ?? false,
        sortOrder: Number(editingCompanion.sortOrder) || 0,
      };
      if (editingCompanion.id) {
        await companionAPI.update(editingCompanion.id, data);
      } else {
        await companionAPI.create(data);
      }
      setEditingCompanion(null);
      fetchCompanions();
    } catch (error: any) {
      alert(error.error?.message || error.message || '保存失败');
    }
  };

  const handleDeleteCompanion = async (id: string) => {
    if (!confirm('确定删除此太空伙伴？')) return;
    try {
      await companionAPI.delete(id);
      fetchCompanions();
    } catch (error: any) {
      alert(error.error?.message || error.message || '删除失败');
    }
  };

  const handleTogglePublishCompanion = async (id: string) => {
    try {
      await companionAPI.togglePublish(id);
      fetchCompanions();
    } catch (error: any) {
      alert(error.error?.message || error.message || '操作失败');
    }
  };

  const handleCompanionAiGenerate = async () => {
    if (!companionAiForm.theme) { alert('请输入主题'); return; }
    setCompanionAiGenerating(true);
    setCompanionAiResults([]);
    setCompanionAiSelected(new Set());
    try {
      const res = await companionAPI.aiGenerate({
        count: companionAiForm.count,
        rarity: companionAiForm.rarity,
        theme: companionAiForm.theme,
      });
      if (res.success && res.data) {
        setCompanionAiResults(res.data);
        setCompanionAiSelected(new Set(res.data.map((_: any, i: number) => i)));
      }
    } catch (error: any) {
      alert(error.error?.message || error.message || 'AI 生成失败');
    } finally {
      setCompanionAiGenerating(false);
    }
  };

  const handleSaveCompanionAiResults = async () => {
    const toSave = companionAiResults.filter((_, i) => companionAiSelected.has(i));
    if (toSave.length === 0) { alert('请至少选择一项'); return; }
    try {
      for (const item of toSave) {
        await companionAPI.create({
          name: item.name,
          description: item.description,
          rarity: item.rarity,
          personality: item.personality,
          appearance: item.appearance,
          stats: item.stats,
          skills: item.skills,
          unlockCondition: item.unlockCondition,
          unlockType: item.unlockType,
          unlockValue: item.unlockValue,
          isActive: false,
        });
      }
      setCompanionAiDialog(false);
      setCompanionAiResults([]);
      fetchCompanions();
    } catch (error: any) {
      alert(error.error?.message || error.message || '保存失败');
    }
  };

  // 获取小游戏类型对应的空表单
  const getEmptyMiniGameForm = () => {
    switch (miniGameTab) {
      case 'code_quiz':
        return { title: '', content: { code: '', lang: 'JavaScript', options: ['', '', '', ''], answer: 0 }, difficulty: 'MEDIUM', isActive: true };
      case 'daily_quiz':
        return { title: '', content: { question: '', options: ['', '', '', ''], answer: 0 }, difficulty: 'MEDIUM', isActive: true };
      case 'flash_card':
        return { title: '', content: { front: '', back: '' }, difficulty: 'MEDIUM', isActive: true };
      case 'typing_challenge':
        return { title: '', content: { code: '' }, difficulty: 'MEDIUM', isActive: true };
    }
  };

  const miniGameTabs: { key: MiniGameTab; label: string }[] = [
    { key: 'code_quiz', label: '代码猜谜' },
    { key: 'daily_quiz', label: '每日选择' },
    { key: 'flash_card', label: '知识闪卡' },
    { key: 'typing_challenge', label: '打字挑战' },
  ];

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

      {/* 模块配置 */}
      {activeTab === 'modules' && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">学习模块可见性配置</h2>
            <span className="text-xs text-slate-400">
              {moduleSaving ? '保存中...' : '切换开关即时生效，控制前端学习中心模块的显示/隐藏'}
            </span>
          </div>

          {/* 主模块 */}
          <h3 className="text-sm font-medium text-slate-300 mb-3">核心模块</h3>
          <div className="space-y-2 mb-6">
            {moduleList.filter(m => !m.category).map(mod => (
              <div key={mod.key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-white">{mod.name}</div>
                  <div className="text-xs text-slate-400">{mod.description} {mod.route && <span className="text-slate-500">→ {mod.route}</span>}</div>
                </div>
                <button
                  onClick={() => handleToggleModule(mod.key, mod.enabled)}
                  className="p-1 text-slate-400 hover:text-cyan-400"
                  title={mod.enabled ? '点击隐藏' : '点击显示'}
                >
                  {mod.enabled ? <ToggleRight className="h-6 w-6 text-green-400" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>
            ))}
          </div>

          {/* 小游戏模块 */}
          <h3 className="text-sm font-medium text-slate-300 mb-3">小游戏模块</h3>
          <div className="space-y-2">
            {moduleList.filter(m => m.category === 'minigame').map(mod => (
              <div key={mod.key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-white">{mod.name}</div>
                  <div className="text-xs text-slate-400">{mod.description}</div>
                </div>
                <button
                  onClick={() => handleToggleModule(mod.key, mod.enabled)}
                  className="p-1 text-slate-400 hover:text-cyan-400"
                  title={mod.enabled ? '点击隐藏' : '点击显示'}
                >
                  {mod.enabled ? <ToggleRight className="h-6 w-6 text-green-400" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>
            ))}
          </div>

          {moduleList.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">加载中...</p>
          )}
        </div>
      )}

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

      {/* 小游戏管理 */}
      {activeTab === 'minigame' && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          {/* 子类型 Tab */}
          <div className="flex items-center gap-2 mb-4">
            {miniGameTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setMiniGameTab(tab.key)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  miniGameTab === tab.key
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setAiGenerateDialog(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30"
              >
                <Sparkles className="h-4 w-4" /> AI批量生成
              </button>
              <button
                onClick={() => setEditingMiniGame(getEmptyMiniGameForm())}
                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30"
              >
                <Plus className="h-4 w-4" /> 添加内容
              </button>
            </div>
          </div>

          {/* 内容列表 */}
          {miniGameLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
          ) : miniGameItems.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">暂无内容，点击「添加内容」或「AI批量生成」创建</p>
          ) : (
            <div className="space-y-2">
              {miniGameItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{item.title}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                        item.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
                        item.difficulty === 'HARD' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>{item.difficulty === 'EASY' ? '简单' : item.difficulty === 'HARD' ? '困难' : '中等'}</span>
                      {!item.isActive && <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-600 text-slate-400">已禁用</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {miniGameTab === 'code_quiz' && item.content?.code}
                      {miniGameTab === 'daily_quiz' && item.content?.question}
                      {miniGameTab === 'flash_card' && item.content?.front}
                      {miniGameTab === 'typing_challenge' && item.content?.code}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleToggleMiniGame(item.id, item.isActive)}
                      className="p-1 text-slate-400 hover:text-cyan-400"
                      title={item.isActive ? '点击禁用' : '点击启用'}
                    >
                      {item.isActive ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => setEditingMiniGame({ ...item })}
                      className="p-1 text-slate-400 hover:text-cyan-400"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMiniGame(item.id)}
                      className="p-1 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 太空伙伴管理 */}
      {activeTab === 'companion' && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          {/* 工具栏 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">太空伙伴库</h2>
              <select
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm"
                value={companionRarityFilter}
                onChange={e => { setCompanionRarityFilter(e.target.value); fetchCompanions(e.target.value); }}
              >
                <option value="ALL">全部稀有度</option>
                <option value="COMMON">普通</option>
                <option value="RARE">稀有</option>
                <option value="EPIC">史诗</option>
                <option value="LEGENDARY">传说</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompanionAiDialog(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30"
              >
                <Sparkles className="h-4 w-4" /> AI生成伙伴
              </button>
              <button
                onClick={() => setEditingCompanion({
                  name: '', description: '', rarity: 'COMMON', personality: '', appearance: '',
                  stats: { intelligence: 50, creativity: 50, persistence: 50, speed: 50, luck: 50 },
                  skills: [], unlockCondition: '', unlockType: 'level', unlockValue: 1,
                  isActive: false, isDefault: false, sortOrder: 0,
                })}
                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30"
              >
                <Plus className="h-4 w-4" /> 创建伙伴
              </button>
            </div>
          </div>

          {/* 伙伴列表 */}
          {companionLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
          ) : companions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">暂无太空伙伴，点击「创建伙伴」或「AI生成伙伴」添加</p>
          ) : (
            <div className="space-y-2">
              {companions.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{c.name}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                        c.rarity === 'LEGENDARY' ? 'bg-yellow-500/20 text-yellow-400' :
                        c.rarity === 'EPIC' ? 'bg-purple-500/20 text-purple-400' :
                        c.rarity === 'RARE' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-600/50 text-slate-300'
                      }`}>
                        {c.rarity === 'LEGENDARY' ? '传说' : c.rarity === 'EPIC' ? '史诗' : c.rarity === 'RARE' ? '稀有' : '普通'}
                      </span>
                      {c.isDefault && <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-500/20 text-green-400">默认</span>}
                      {!c.isActive && <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-600 text-slate-400">未上架</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.description}</div>
                    {/* 属性条预览 */}
                    <div className="flex items-center gap-3 mt-1">
                      {['intelligence', 'creativity', 'persistence', 'speed', 'luck'].map(key => (
                        <div key={key} className="flex items-center gap-1" title={
                          key === 'intelligence' ? '智力' : key === 'creativity' ? '创造力' :
                          key === 'persistence' ? '毅力' : key === 'speed' ? '速度' : '幸运'
                        }>
                          <span className="text-[10px] text-slate-500">
                            {key === 'intelligence' ? '智' : key === 'creativity' ? '创' :
                             key === 'persistence' ? '毅' : key === 'speed' ? '速' : '运'}
                          </span>
                          <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-400 rounded-full"
                              style={{ width: `${c.stats?.[key] || 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">{c.stats?.[key] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleTogglePublishCompanion(c.id)}
                      className="p-1 text-slate-400 hover:text-cyan-400"
                      title={c.isActive ? '点击下架' : '点击上架'}
                    >
                      {c.isActive ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => setEditingCompanion({ ...c })}
                      className="p-1 text-slate-400 hover:text-cyan-400"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCompanion(c.id)}
                      className="p-1 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 太空伙伴编辑模态框 ── */}
      {editingCompanion && (
        <Modal title={editingCompanion.id ? '编辑太空伙伴' : '创建太空伙伴'} onClose={() => setEditingCompanion(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">名称</label>
                <input
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingCompanion.name}
                  onChange={e => setEditingCompanion({ ...editingCompanion, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">稀有度</label>
                <select
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingCompanion.rarity}
                  onChange={e => setEditingCompanion({ ...editingCompanion, rarity: e.target.value })}
                >
                  <option value="COMMON">普通</option>
                  <option value="RARE">稀有</option>
                  <option value="EPIC">史诗</option>
                  <option value="LEGENDARY">传说</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">描述</label>
              <input
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                value={editingCompanion.description}
                onChange={e => setEditingCompanion({ ...editingCompanion, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">性格描述</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                rows={2}
                value={editingCompanion.personality}
                onChange={e => setEditingCompanion({ ...editingCompanion, personality: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">外观描述</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                rows={2}
                value={editingCompanion.appearance}
                onChange={e => setEditingCompanion({ ...editingCompanion, appearance: e.target.value })}
              />
            </div>
            {/* 属性编辑 */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">属性值（1-100）</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { key: 'intelligence', label: '智力' },
                  { key: 'creativity', label: '创造力' },
                  { key: 'persistence', label: '毅力' },
                  { key: 'speed', label: '速度' },
                  { key: 'luck', label: '幸运' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-[10px] text-slate-500 mb-0.5">{label}</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center"
                      value={editingCompanion.stats?.[key] || 50}
                      onChange={e => setEditingCompanion({
                        ...editingCompanion,
                        stats: { ...editingCompanion.stats, [key]: Number(e.target.value) },
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* 技能编辑 */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">技能</label>
              {(editingCompanion.skills || []).map((skill: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 mb-1">
                  <input
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                    placeholder="技能名"
                    value={skill.name || ''}
                    onChange={e => {
                      const skills = [...(editingCompanion.skills || [])];
                      skills[idx] = { ...skills[idx], name: e.target.value };
                      setEditingCompanion({ ...editingCompanion, skills });
                    }}
                  />
                  <input
                    className="flex-[2] bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                    placeholder="效果描述"
                    value={skill.effect || ''}
                    onChange={e => {
                      const skills = [...(editingCompanion.skills || [])];
                      skills[idx] = { ...skills[idx], effect: e.target.value };
                      setEditingCompanion({ ...editingCompanion, skills });
                    }}
                  />
                  <button
                    onClick={() => {
                      const skills = (editingCompanion.skills || []).filter((_: any, i: number) => i !== idx);
                      setEditingCompanion({ ...editingCompanion, skills });
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditingCompanion({ ...editingCompanion, skills: [...(editingCompanion.skills || []), { name: '', effect: '' }] })}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                + 添加技能
              </button>
            </div>
            {/* 解锁条件 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">解锁类型</label>
                <select
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingCompanion.unlockType}
                  onChange={e => setEditingCompanion({ ...editingCompanion, unlockType: e.target.value })}
                >
                  <option value="level">等级</option>
                  <option value="achievement">成就</option>
                  <option value="streak">连续签到</option>
                  <option value="purchase">购买</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">解锁数值</label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingCompanion.unlockValue}
                  onChange={e => setEditingCompanion({ ...editingCompanion, unlockValue: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">排序</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  value={editingCompanion.sortOrder}
                  onChange={e => setEditingCompanion({ ...editingCompanion, sortOrder: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">解锁条件描述</label>
              <input
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="例: 达到5级"
                value={editingCompanion.unlockCondition}
                onChange={e => setEditingCompanion({ ...editingCompanion, unlockCondition: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={editingCompanion.isDefault || false}
                  onChange={e => setEditingCompanion({ ...editingCompanion, isDefault: e.target.checked })}
                />
                默认免费伙伴
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={editingCompanion.isActive || false}
                  onChange={e => setEditingCompanion({ ...editingCompanion, isActive: e.target.checked })}
                />
                立即上架
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingCompanion(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
              <button onClick={handleSaveCompanion} className="flex items-center gap-1 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600">
                <Save className="h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── AI 生成伙伴对话框 ── */}
      {companionAiDialog && (
        <Modal title="AI 批量生成太空伙伴" onClose={() => { setCompanionAiDialog(false); setCompanionAiResults([]); }}>
          <div className="space-y-4">
            {companionAiResults.length === 0 ? (
              <>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">主题</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="例如: 星际机械、魔法精灵、赛博朋克..."
                    value={companionAiForm.theme}
                    onChange={e => setCompanionAiForm({ ...companionAiForm, theme: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">数量</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      value={companionAiForm.count}
                      onChange={e => setCompanionAiForm({ ...companionAiForm, count: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">稀有度</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      value={companionAiForm.rarity}
                      onChange={e => setCompanionAiForm({ ...companionAiForm, rarity: e.target.value })}
                    >
                      <option value="COMMON">普通</option>
                      <option value="RARE">稀有</option>
                      <option value="EPIC">史诗</option>
                      <option value="LEGENDARY">传说</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setCompanionAiDialog(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                  <button
                    onClick={handleCompanionAiGenerate}
                    disabled={companionAiGenerating}
                    className="flex items-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
                  >
                    {companionAiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {companionAiGenerating ? '生成中...' : '开始生成'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-400">已生成 {companionAiResults.length} 个太空伙伴，选择后保存：</p>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {companionAiResults.map((item, idx) => (
                    <label key={idx} className="flex items-start gap-2 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={companionAiSelected.has(idx)}
                        onChange={() => {
                          const next = new Set(companionAiSelected);
                          if (next.has(idx)) next.delete(idx); else next.add(idx);
                          setCompanionAiSelected(next);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-white font-medium">{item.name}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                            item.rarity === 'LEGENDARY' ? 'bg-yellow-500/20 text-yellow-400' :
                            item.rarity === 'EPIC' ? 'bg-purple-500/20 text-purple-400' :
                            item.rarity === 'RARE' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-600/50 text-slate-300'
                          }`}>
                            {item.rarity === 'LEGENDARY' ? '传说' : item.rarity === 'EPIC' ? '史诗' : item.rarity === 'RARE' ? '稀有' : '普通'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">{item.description}</div>
                        <div className="text-xs text-slate-500 mt-1">性格: {item.personality}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {item.stats && Object.entries(item.stats).map(([k, v]) => (
                            <span key={k} className="text-[10px] text-slate-500">
                              {k === 'intelligence' ? '智' : k === 'creativity' ? '创' :
                               k === 'persistence' ? '毅' : k === 'speed' ? '速' : '运'}:{String(v)}
                            </span>
                          ))}
                        </div>
                        {item.skills && (
                          <div className="text-[10px] text-cyan-400/70 mt-1">
                            技能: {item.skills.map((s: any) => s.name).join('、')}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setCompanionAiResults([])} className="px-4 py-2 text-slate-400 hover:text-white text-sm">重新生成</button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // 全部上架：选中全部并设 isActive
                        setCompanionAiSelected(new Set(companionAiResults.map((_, i) => i)));
                      }}
                      className="px-3 py-2 text-xs text-amber-400 hover:text-amber-300"
                    >
                      全选
                    </button>
                    <button
                      onClick={handleSaveCompanionAiResults}
                      className="flex items-center gap-1 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600"
                    >
                      <Save className="h-4 w-4" /> 采纳已选 ({companionAiSelected.size})
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ── 编辑模态框：小游戏内容 ── */}
      {editingMiniGame && (
        <Modal title={editingMiniGame.id ? '编辑内容' : '添加内容'} onClose={() => setEditingMiniGame(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">标题</label>
              <input
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                value={editingMiniGame.title}
                onChange={e => setEditingMiniGame({ ...editingMiniGame, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">难度</label>
              <select
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                value={editingMiniGame.difficulty}
                onChange={e => setEditingMiniGame({ ...editingMiniGame, difficulty: e.target.value })}
              >
                <option value="EASY">简单</option>
                <option value="MEDIUM">中等</option>
                <option value="HARD">困难</option>
              </select>
            </div>

            {/* 根据游戏类型显示不同编辑字段 */}
            {miniGameTab === 'code_quiz' && (
              <>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">代码片段</label>
                  <textarea
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono"
                    rows={3}
                    value={editingMiniGame.content?.code || ''}
                    onChange={e => setEditingMiniGame({ ...editingMiniGame, content: { ...editingMiniGame.content, code: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">语言</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    value={editingMiniGame.content?.lang || 'JavaScript'}
                    onChange={e => setEditingMiniGame({ ...editingMiniGame, content: { ...editingMiniGame.content, lang: e.target.value } })}
                  >
                    <option value="JavaScript">JavaScript</option>
                    <option value="Python">Python</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">选项（4个）</label>
                  {(editingMiniGame.content?.options || ['', '', '', '']).map((opt: string, idx: number) => (
                    <input
                      key={idx}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm mb-1"
                      placeholder={`选项 ${String.fromCharCode(65 + idx)}`}
                      value={opt}
                      onChange={e => {
                        const newOpts = [...(editingMiniGame.content?.options || ['', '', '', ''])];
                        newOpts[idx] = e.target.value;
                        setEditingMiniGame({ ...editingMiniGame, content: { ...editingMiniGame.content, options: newOpts } });
                      }}
                    />
                  ))}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">正确答案索引（0-3）</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    value={editingMiniGame.content?.answer ?? 0}
                    onChange={e => setEditingMiniGame({ ...editingMiniGame, content: { ...editingMiniGame.content, answer: Number(e.target.value) } })}
                  >
                    {[0, 1, 2, 3].map(i => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}
                  </select>
                </div>
              </>
            )}

            {miniGameTab === 'daily_quiz' && (
              <>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">题目</label>
                  <textarea
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    rows={3}
                    value={editingMiniGame.content?.question || ''}
                    onChange={e => setEditingMiniGame({ ...editingMiniGame, content: { ...editingMiniGame.content, question: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">选项（4个）</label>
                  {(editingMiniGame.content?.options || ['', '', '', '']).map((opt: string, idx: number) => (
                    <input
                      key={idx}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm mb-1"
                      placeholder={`选项 ${String.fromCharCode(65 + idx)}`}
                      value={opt}
                      onChange={e => {
                        const newOpts = [...(editingMiniGame.content?.options || ['', '', '', ''])];
                        newOpts[idx] = e.target.value;
                        setEditingMiniGame({ ...editingMiniGame, content: { ...editingMiniGame.content, options: newOpts } });
                      }}
                    />
                  ))}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">正确答案索引（0-3）</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    value={editingMiniGame.content?.answer ?? 0}
                    onChange={e => setEditingMiniGame({ ...editingMiniGame, content: { ...editingMiniGame.content, answer: Number(e.target.value) } })}
                  >
                    {[0, 1, 2, 3].map(i => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}
                  </select>
                </div>
              </>
            )}

            {miniGameTab === 'flash_card' && (
              <>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">正面（问题/概念）</label>
                  <textarea
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    rows={3}
                    value={editingMiniGame.content?.front || ''}
                    onChange={e => setEditingMiniGame({ ...editingMiniGame, content: { ...editingMiniGame.content, front: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">背面（答案/解释）</label>
                  <textarea
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    rows={4}
                    value={editingMiniGame.content?.back || ''}
                    onChange={e => setEditingMiniGame({ ...editingMiniGame, content: { ...editingMiniGame.content, back: e.target.value } })}
                  />
                </div>
              </>
            )}

            {miniGameTab === 'typing_challenge' && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">代码片段</label>
                <textarea
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono"
                  rows={3}
                  value={editingMiniGame.content?.code || ''}
                  onChange={e => setEditingMiniGame({ ...editingMiniGame, content: { ...editingMiniGame.content, code: e.target.value } })}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingMiniGame(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
              <button onClick={handleSaveMiniGame} className="flex items-center gap-1 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600">
                <Save className="h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── AI 生成对话框 ── */}
      {aiGenerateDialog && (
        <Modal title="AI 批量生成小游戏内容" onClose={() => { setAiGenerateDialog(false); setAiGeneratedItems([]); }}>
          <div className="space-y-4">
            {aiGeneratedItems.length === 0 ? (
              <>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">主题</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="例如: JavaScript 基础, 数据结构, 网络协议..."
                    value={aiGenerateForm.topic}
                    onChange={e => setAiGenerateForm({ ...aiGenerateForm, topic: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">数量</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      value={aiGenerateForm.count}
                      onChange={e => setAiGenerateForm({ ...aiGenerateForm, count: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">难度</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      value={aiGenerateForm.difficulty}
                      onChange={e => setAiGenerateForm({ ...aiGenerateForm, difficulty: e.target.value })}
                    >
                      <option value="EASY">简单</option>
                      <option value="MEDIUM">中等</option>
                      <option value="HARD">困难</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setAiGenerateDialog(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                  <button
                    onClick={handleAiGenerate}
                    disabled={aiGenerating}
                    className="flex items-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
                  >
                    {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {aiGenerating ? '生成中...' : '开始生成'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-400">已生成 {aiGeneratedItems.length} 条内容，请选择要保存的项目：</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {aiGeneratedItems.map((item, idx) => (
                    <label key={idx} className="flex items-start gap-2 p-2 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={aiSelectedItems.has(idx)}
                        onChange={() => {
                          const next = new Set(aiSelectedItems);
                          if (next.has(idx)) next.delete(idx); else next.add(idx);
                          setAiSelectedItems(next);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium">{item.title}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {JSON.stringify(item.content).substring(0, 80)}...
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setAiGeneratedItems([])} className="px-4 py-2 text-slate-400 hover:text-white text-sm">重新生成</button>
                  <button
                    onClick={handleSaveAiGenerated}
                    className="flex items-center gap-1 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600"
                  >
                    <Save className="h-4 w-4" /> 保存已选 ({aiSelectedItems.size})
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
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
