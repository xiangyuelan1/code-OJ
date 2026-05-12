import { useEffect, useState } from 'react';
import { useKnowledgeTreeStore } from '../stores/knowledge-tree.store';
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, Upload, Brain, BookOpen, Folder, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export function KnowledgeTreePage() {
  const {
    tree,
    stats,
    selectedNode,
    nodeProblems,
    isLoading,
    isImporting,
    error,
    fetchTree,
    fetchStats,
    createNode,
    updateNode,
    deleteNode,
    importFromFile,
    selectNode,
    fetchNodeProblems,
    clearError
  } = useKnowledgeTreeStore();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [newNode, setNewNode] = useState({ name: '', description: '', parentId: null as string | null });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importType, setImportType] = useState('txt');
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchTree();
    fetchStats();
  }, [fetchTree, fetchStats]);

  useEffect(() => {
    if (selectedNode) {
      fetchNodeProblems(selectedNode.id);
    }
  }, [selectedNode, fetchNodeProblems]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleAddNode = async () => {
    await createNode(newNode);
    setNewNode({ name: '', description: '', parentId: null });
    setShowAddModal(false);
  };

  const handleEditNode = async () => {
    if (editingNode) {
      await updateNode(editingNode.id, {
        name: editingNode.name,
        description: editingNode.description
      });
      setEditingNode(null);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (confirm('确定要删除这个节点及其所有子节点吗？')) {
      await deleteNode(nodeId);
      if (selectedNode?.id === nodeId) {
        selectNode(null);
      }
    }
  };

  const handleImport = async () => {
    if (!importContent.trim()) {
      alert('请输入内容');
      return;
    }
    await importFromFile(importContent, importType);
    setImportContent('');
    setShowImportModal(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
        setImportContent(content);
        setImportType(ext === 'pdf' ? 'pdf' : 'txt');
        setUploadingFile(false);
      };
      reader.onerror = () => {
        alert('文件读取失败');
        setUploadingFile(false);
      };
      reader.readAsText(file);
    } catch {
      alert('文件处理失败');
      setUploadingFile(false);
    }
  };

  const handleAddChildNode = (parentId: string) => {
    setNewNode({ ...newNode, parentId });
    setShowAddModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 mb-2">📚 知识树管理</h1>
            {stats && (
              <div className="flex gap-6 text-sm text-slate-400">
                <span>总节点: {stats.totalNodes}</span>
                <span>一级分类: {stats.level1Nodes}</span>
                <span>二级知识点: {stats.level2Nodes}</span>
                <span>已关联题目: {stats.problemsWithTree}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Upload className="h-4 w-4" />
              AI导入
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              添加节点
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex justify-between items-center">
            <span className="text-red-400">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Folder className="h-5 w-5 text-cyan-400" />
              知识树结构
            </h2>
            
            {tree.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>暂无知识树，点击"添加节点"或"AI导入"开始</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tree.map((node) => (
                  <NodeItem
                    key={node.id}
                    node={node}
                    expandedNodes={expandedNodes}
                    selectedNodeId={selectedNode?.id}
                    onToggle={toggleNode}
                    onSelect={selectNode}
                    onEdit={setEditingNode}
                    onDelete={handleDeleteNode}
                    onAddChild={handleAddChildNode}
                    level={0}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              {selectedNode ? `${selectedNode.name} - 题目列表` : '选择节点查看题目'}
            </h2>

            {selectedNode ? (
              <div className="space-y-4">
                <div className="text-sm text-slate-400">
                  <p>描述: {selectedNode.description || '暂无描述'}</p>
                  <p>层级: {selectedNode.level === 1 ? '一级分类' : '二级知识点'}</p>
                  <p>关联题目数: {selectedNode.problemCount}</p>
                </div>

                {nodeProblems.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>暂无关联题目</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nodeProblems.map((problem) => (
                      <Link
                        key={problem.id}
                        to={`/problem/${problem.id}`}
                        className="block p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <div className="font-medium text-cyan-400">{problem.title}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          类型: {problem.type} | 难度: {problem.difficulty}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Brain className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>点击左侧节点查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} title="添加节点">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">节点名称</label>
              <input
                type="text"
                value={newNode.name}
                onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
                placeholder="请输入节点名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">描述（可选）</label>
              <textarea
                value={newNode.description}
                onChange={(e) => setNewNode({ ...newNode, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
                rows={3}
                placeholder="请输入描述"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddNode}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editingNode && (
        <Modal onClose={() => setEditingNode(null)} title="编辑节点">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">节点名称</label>
              <input
                type="text"
                value={editingNode.name}
                onChange={(e) => setEditingNode({ ...editingNode, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">描述</label>
              <textarea
                value={editingNode.description || ''}
                onChange={(e) => setEditingNode({ ...editingNode, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingNode(null)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleEditNode}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showImportModal && (
        <Modal onClose={() => setShowImportModal(false)} title="AI导入知识树">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">上传文件</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg cursor-pointer transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>{uploadingFile ? '读取中...' : '选择文件'}</span>
                  <input
                    type="file"
                    accept=".txt,.md,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                </label>
                <span className="text-slate-400 text-sm">支持 txt、md、csv 文件</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">或直接粘贴内容</label>
              <textarea
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
                rows={8}
                placeholder="请粘贴要导入的内容，AI将自动分析并生成知识树结构"
              />
            </div>
            <div className="bg-slate-700/50 p-3 rounded-lg text-sm text-slate-400">
              💡 AI将从内容中提取知识点，生成两层知识树结构（一级分类 + 二级知识点）
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || !importContent.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isImporting ? '导入中...' : '开始导入'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface NodeItemProps {
  node: any;
  expandedNodes: Set<string>;
  selectedNodeId?: string;
  onToggle: (id: string) => void;
  onSelect: (node: any) => void;
  onEdit: (node: any) => void;
  onDelete: (id: string) => void;
  onAddChild: (id: string) => void;
  level: number;
}

function NodeItem({
  node,
  expandedNodes,
  selectedNodeId,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  level
}: NodeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodeId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'bg-cyan-900/50 border border-cyan-600' : 'hover:bg-slate-700'
        }`}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="p-1 hover:bg-slate-600 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-6"></div>
        )}

        <span className="text-lg">{node.level === 1 ? '📁' : '📄'}</span>
        <div className="flex-1">
          <div className="font-medium">{node.name}</div>
          {node.description && (
            <div className="text-xs text-slate-400 mt-1">{node.description}</div>
          )}
          <div className="text-xs text-slate-500 mt-1">
            {node.problemCount} 个题目
          </div>
        </div>

        <div className="flex gap-2">
          {node.level === 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node.id);
              }}
              className="p-1.5 hover:bg-slate-600 rounded text-green-400"
              title="添加子节点"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
            className="p-1.5 hover:bg-slate-600 rounded text-blue-400"
            title="编辑"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="p-1.5 hover:bg-slate-600 rounded text-red-400"
            title="删除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child: any) => (
            <NodeItem
              key={child.id}
              node={child}
              expandedNodes={expandedNodes}
              selectedNodeId={selectedNodeId}
              onToggle={onToggle}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
