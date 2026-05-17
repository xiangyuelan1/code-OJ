import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { knowledgeTreeAPI } from '../services/api';
import { TreePine, ChevronRight, ChevronDown, Code, CheckCircle, PenTool, BookOpen } from 'lucide-react';

export function ProblemCategoriesPage() {
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [nodeProblems, setNodeProblems] = useState<any[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    try {
      setLoading(true);
      const res = await knowledgeTreeAPI.getTree();
      if (res.success) {
        setTree(res.data || []);
        const expandSet = new Set<string>();
        (res.data || []).forEach((node: any) => expandSet.add(node.id));
        setExpandedNodes(expandSet);
      }
    } catch (error) {
      console.error('加载知识树失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNode = async (nodeId: string) => {
    setSelectedNode(nodeId);
    setLoadingProblems(true);
    try {
      const res = await knowledgeTreeAPI.getNodeProblems(nodeId);
      if (res.success) {
        setNodeProblems(res.data || []);
      }
    } catch (error) {
      console.error('加载题目失败', error);
    } finally {
      setLoadingProblems(false);
    }
  };

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PROGRAMMING': return <Code className="h-4 w-4 text-cyan-400" />;
      case 'CHOICE': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'FILL_BLANK': return <PenTool className="h-4 w-4 text-purple-400" />;
      default: return <Code className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'PROGRAMMING': return '编程题';
      case 'CHOICE': return '选择题';
      case 'FILL_BLANK': return '填空题';
      default: return type;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'text-green-400 bg-green-500/10';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10';
      case 'HARD': return 'text-red-400 bg-red-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  const getDifficultyName = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return '简单';
      case 'MEDIUM': return '中等';
      case 'HARD': return '困难';
      default: return difficulty;
    }
  };

  const renderTreeNode = (node: any, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode === node.id;
    const problemCount = node.problemCount || 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'hover:bg-slate-700 text-slate-300'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => {
            handleSelectNode(node.id);
            if (hasChildren) toggleExpand(node.id);
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}
          <TreePine className={`h-4 w-4 flex-shrink-0 ${depth === 0 ? 'text-cyan-400' : 'text-slate-500'}`} />
          <span className="flex-1 truncate text-sm font-medium">{node.name}</span>
          <span className="text-xs text-slate-500">{problemCount}题</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child: any) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-cyan-400" />
          题单分类
        </h1>
        <p className="text-slate-400 mt-2">按知识体系浏览题目，两层分类结构：一级分类 → 二级知识点</p>
      </div>

      {tree.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <TreePine className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">暂无分类题单</p>
          <p className="text-slate-500 mt-2">管理员可在后台创建知识树分类</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-slate-800 rounded-xl p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-3 px-3">知识体系</h2>
            <div className="space-y-1">
              {tree.map(node => renderTreeNode(node))}
            </div>
          </div>

          <div className="lg:col-span-3">
            {selectedNode ? (
              <>
                <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    {tree.find(n => n.id === selectedNode)?.name ||
                      tree.flatMap(n => n.children || []).find(c => c.id === selectedNode)?.name ||
                      '题目列表'}
                  </h2>
                </div>

                {loadingProblems ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
                  </div>
                ) : nodeProblems.length === 0 ? (
                  <div className="bg-slate-800 rounded-xl p-12 text-center">
                    <p className="text-slate-400">该分类下暂无题目</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {nodeProblems.map((problem: any) => (
                      <Link
                        key={problem.id}
                        to={`/problem/${problem.id}`}
                        className="block bg-slate-800 hover:bg-slate-750 rounded-xl p-4 shadow-xl transition-colors hover:ring-1 hover:ring-cyan-500/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(problem.type)}
                            <h3 className="text-white font-medium">{problem.title}</h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">{getTypeName(problem.type)}</span>
                            <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(problem.difficulty)}`}>
                              {getDifficultyName(problem.difficulty)}
                            </span>
                          </div>
                        </div>
                        {problem.tags && (
                          <div className="flex gap-2 mt-2">
                            {(Array.isArray(problem.tags) ? problem.tags : JSON.parse(problem.tags || '[]')).slice(0, 4).map((tag: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-800 rounded-xl p-12 text-center">
                <TreePine className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">选择左侧分类查看题目</p>
                <p className="text-slate-500 mt-2">点击一级分类展开二级知识点</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
