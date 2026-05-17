import { useState, useEffect, useCallback } from 'react';
import { knowledgeTreeAPI, problemsAPI } from '../../services/api';
import { Plus, Trash2, Edit3, ChevronRight, ChevronDown, FolderTree, Save, X, BookOpen, Link2, Eye, Unlink } from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  level: number;
  order: number;
  problemCount: number;
  children: TreeNode[];
}

interface EditingNode {
  id?: string;
  name: string;
  description: string;
  parentId?: string;
}

export function AdminKnowledgeTreePage() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditingNode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();
  const [stats, setStats] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeProblems, setNodeProblems] = useState<any[]>([]);
  const [allProblems, setAllProblems] = useState<any[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');

  useEffect(() => {
    loadTree();
    loadStats();
  }, []);

  const loadTree = async () => {
    try {
      setLoading(true);
      const res = await knowledgeTreeAPI.getAll();
      if (res.success) {
        setTree(res.data);
        const allIds = new Set<string>();
        const collectIds = (nodes: TreeNode[]) => {
          for (const node of nodes) {
            allIds.add(node.id);
            if (node.children?.length) collectIds(node.children);
          }
        };
        collectIds(res.data);
        setExpandedIds(allIds);
      }
    } catch (error) {
      console.error('加载知识树失败', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await knowledgeTreeAPI.getStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch {}
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!editing?.name.trim()) {
      alert('请输入节点名称');
      return;
    }
    try {
      await knowledgeTreeAPI.create({
        name: editing.name,
        description: editing.description || undefined,
        parentId: editing.parentId || undefined
      });
      setEditing(null);
      setIsCreating(false);
      setCreateParentId(undefined);
      await loadTree();
      await loadStats();
    } catch (error: any) {
      alert(error.error?.message || '创建失败');
    }
  };

  const handleUpdate = async () => {
    if (!editing?.id || !editing.name.trim()) {
      alert('请输入节点名称');
      return;
    }
    try {
      await knowledgeTreeAPI.update(editing.id, {
        name: editing.name,
        description: editing.description || undefined
      });
      setEditing(null);
      setIsCreating(false);
      await loadTree();
    } catch (error: any) {
      alert(error.error?.message || '更新失败');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除节点「${name}」及其所有子节点吗？关联的题目将解除绑定。`)) return;
    try {
      await knowledgeTreeAPI.delete(id);
      await loadTree();
      await loadStats();
    } catch (error: any) {
      alert(error.error?.message || '删除失败');
    }
  };

  const startEdit = (node: TreeNode) => {
    setEditing({
      id: node.id,
      name: node.name,
      description: node.description || '',
      parentId: node.parentId
    });
    setIsCreating(false);
  };

  const startCreate = (parentId?: string) => {
    setEditing({
      name: '',
      description: '',
      parentId
    });
    setIsCreating(true);
    setCreateParentId(parentId);
  };

  const cancelEdit = () => {
    setEditing(null);
    setIsCreating(false);
    setCreateParentId(undefined);
  };

  const viewNodeProblems = async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    try {
      const res = await knowledgeTreeAPI.getNodeProblems(nodeId);
      if (res.success) {
        setNodeProblems(res.data || []);
      }
    } catch {}
  };

  const openLinkModal = async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setShowLinkModal(true);
    setLinkSearch('');
    try {
      const res = await problemsAPI.getAll();
      if (res.success) {
        setAllProblems(res.data || []);
      }
    } catch {}
  };

  const linkProblemToNode = async (problemId: string) => {
    if (!selectedNodeId) return;
    try {
      await knowledgeTreeAPI.classifyProblem(problemId, selectedNodeId);
      await viewNodeProblems(selectedNodeId);
      await loadTree();
      await loadStats();
    } catch (error: any) {
      alert(error.error?.message || '关联失败');
    }
  };

  const unlinkProblemFromNode = async (problemId: string) => {
    if (!confirm('确定解除此题目与知识节点的关联？')) return;
    try {
      await knowledgeTreeAPI.classifyProblem(problemId, undefined as any);
      if (selectedNodeId) {
        await viewNodeProblems(selectedNodeId);
      }
      await loadTree();
      await loadStats();
    } catch (error: any) {
      alert(error.error?.message || '解除关联失败');
    }
  };

  const renderNode = useCallback((node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const isEditingThis = editing?.id === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-slate-700/50 group transition-colors ${isEditingThis ? 'bg-slate-700 ring-1 ring-cyan-500' : ''}`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {node.children?.length > 0 ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          <FolderTree className={`h-4 w-4 flex-shrink-0 ${node.level === 1 ? 'text-cyan-400' : 'text-slate-400'}`} />

          {isEditingThis ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                autoFocus
              />
              <input
                type="text"
                value={editing.description}
                onChange={e => setEditing({ ...editing, description: e.target.value })}
                placeholder="描述（可选）"
                className="w-40 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                onClick={handleUpdate}
                className="p-1 text-green-400 hover:text-green-300"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={cancelEdit}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <span className="text-white text-sm font-medium flex-1">{node.name}</span>
              {node.description && (
                <span className="text-slate-500 text-xs truncate max-w-[200px]">{node.description}</span>
              )}
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <BookOpen className="h-3 w-3" />
                {node.problemCount}
              </span>
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={() => viewNodeProblems(node.id)}
                  className="p-1 text-green-400 hover:text-green-300"
                  title="查看题目"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => openLinkModal(node.id)}
                  className="p-1 text-yellow-400 hover:text-yellow-300"
                  title="关联题目"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
                {node.level === 1 && (
                  <button
                    onClick={() => startCreate(node.id)}
                    className="p-1 text-cyan-400 hover:text-cyan-300"
                    title="添加子节点"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => startEdit(node)}
                  className="p-1 text-blue-400 hover:text-blue-300"
                  title="编辑"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(node.id, node.name)}
                  className="p-1 text-red-400 hover:text-red-300"
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {isExpanded && node.children?.length > 0 && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}

        {isCreating && createParentId === node.id && (
          <div
            className="flex items-center gap-2 py-2 px-3 bg-slate-700/30 rounded-lg"
            style={{ paddingLeft: `${(depth + 1) * 24 + 12}px` }}
          >
            <FolderTree className="h-4 w-4 text-cyan-400 flex-shrink-0" />
            <input
              type="text"
              value={editing?.name || ''}
              onChange={e => editing && setEditing({ ...editing, name: e.target.value })}
              placeholder="新节点名称"
              className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') cancelEdit(); }}
            />
            <input
              type="text"
              value={editing?.description || ''}
              onChange={e => editing && setEditing({ ...editing, description: e.target.value })}
              placeholder="描述（可选）"
              className="w-40 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              onClick={handleCreate}
              className="p-1 text-green-400 hover:text-green-300"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={cancelEdit}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  }, [expandedIds, editing, isCreating, createParentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">知识树管理</h1>
          <p className="text-slate-400 mt-2">管理题目分类的知识树结构</p>
        </div>
        <button
          onClick={() => startCreate()}
          className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          添加根节点
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{stats.totalNodes}</div>
            <div className="text-slate-400 text-sm">总节点数</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-cyan-400">{stats.level1Nodes}</div>
            <div className="text-slate-400 text-sm">一级分类</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{stats.level2Nodes}</div>
            <div className="text-slate-400 text-sm">二级分类</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{stats.problemsWithTree}</div>
            <div className="text-slate-400 text-sm">已分类题目</div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
        {isCreating && !createParentId && (
          <div className="flex items-center gap-2 py-2 px-3 mb-4 bg-slate-700/30 rounded-lg">
            <FolderTree className="h-4 w-4 text-cyan-400" />
            <input
              type="text"
              value={editing?.name || ''}
              onChange={e => editing && setEditing({ ...editing, name: e.target.value })}
              placeholder="新根节点名称"
              className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') cancelEdit(); }}
            />
            <input
              type="text"
              value={editing?.description || ''}
              onChange={e => editing && setEditing({ ...editing, description: e.target.value })}
              placeholder="描述（可选）"
              className="w-40 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button onClick={handleCreate} className="p-1 text-green-400 hover:text-green-300">
              <Save className="h-4 w-4" />
            </button>
            <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {tree.length === 0 ? (
          <div className="text-center py-12">
            <FolderTree className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">暂无知识树节点</p>
            <p className="text-slate-500 text-sm mt-1">点击"添加根节点"开始创建知识树</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {tree.map(node => renderNode(node))}
          </div>
        )}
      </div>

      {selectedNodeId && nodeProblems.length > 0 && (
        <div className="mt-6 bg-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">节点题目</h2>
            <button
              onClick={() => { setSelectedNodeId(null); setNodeProblems([]); }}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-2">
            {nodeProblems.map((problem: any) => (
              <div key={problem.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex-1">
                  <span className="text-white font-medium">{problem.title}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                    problem.type === 'PROGRAMMING' ? 'bg-blue-500/20 text-blue-400' :
                    problem.type === 'CHOICE' ? 'bg-green-500/20 text-green-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {problem.type === 'PROGRAMMING' ? '编程' : problem.type === 'CHOICE' ? '选择' : '填空'}
                  </span>
                  <span className={`ml-1 text-xs px-2 py-0.5 rounded ${
                    problem.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
                    problem.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {problem.difficulty === 'EASY' ? '简单' : problem.difficulty === 'MEDIUM' ? '中等' : '困难'}
                  </span>
                </div>
                <button
                  onClick={() => unlinkProblemFromNode(problem.id)}
                  className="p-1 text-red-400 hover:text-red-300"
                  title="解除关联"
                >
                  <Unlink className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">关联题目到节点</h2>
              <button
                onClick={() => { setShowLinkModal(false); setSelectedNodeId(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              type="text"
              value={linkSearch}
              onChange={e => setLinkSearch(e.target.value)}
              placeholder="搜索题目..."
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
            />
            <div className="flex-1 overflow-y-auto space-y-2">
              {allProblems
                .filter((p: any) => !linkSearch || p.title.toLowerCase().includes(linkSearch.toLowerCase()))
                .filter((p: any) => p.knowledgeTreeId !== selectedNodeId)
                .map((problem: any) => (
                  <div key={problem.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex-1">
                      <span className="text-white">{problem.title}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                        problem.type === 'PROGRAMMING' ? 'bg-blue-500/20 text-blue-400' :
                        problem.type === 'CHOICE' ? 'bg-green-500/20 text-green-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {problem.type === 'PROGRAMMING' ? '编程' : problem.type === 'CHOICE' ? '选择' : '填空'}
                      </span>
                      {problem.knowledgeTreeId && (
                        <span className="ml-1 text-xs text-slate-500">已关联其他节点</span>
                      )}
                    </div>
                    <button
                      onClick={() => linkProblemToNode(problem.id)}
                      className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 text-sm"
                    >
                      关联
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
