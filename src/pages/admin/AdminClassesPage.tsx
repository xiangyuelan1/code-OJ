import { useState, useEffect } from 'react';
import { classAPI, usersAPI, problemsAPI } from '../../services/api';
import {
  Users, Plus, Trash2, Edit3, UserPlus, X, Save, GraduationCap,
  BarChart3, ClipboardList, UserCircle, Calendar, CheckCircle2,
  XCircle, Clock, AlertTriangle, ChevronRight, ArrowLeft, Copy, RefreshCw,
  Swords, FileText, Trophy, Play, Ban, Send,
} from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';
type DetailTab = 'members' | 'analytics' | 'homework' | 'pk' | 'exam';

interface ClassForm {
  name: string;
  description: string;
  grade: string;
}

interface HomeworkForm {
  title: string;
  description: string;
  problemIds: string[];
  dueDate: string;
}

interface BattleForm {
  targetClassId: string;
  problemIds: string[];
}

interface ExamForm {
  title: string;
  description: string;
  duration: number;
  startTime: string;
  endTime: string;
  problemIds: string[];
}

const EMPTY_FORM: ClassForm = { name: '', description: '', grade: '' };
const EMPTY_HOMEWORK_FORM: HomeworkForm = { title: '', description: '', problemIds: [], dueDate: '' };
const EMPTY_BATTLE_FORM: BattleForm = { targetClassId: '', problemIds: [] };
const EMPTY_EXAM_FORM: ExamForm = { title: '', description: '', duration: 60, startTime: '', endTime: '', problemIds: [] };

export function AdminClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [form, setForm] = useState<ClassForm>(EMPTY_FORM);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('STUDENT');

  const [activeTab, setActiveTab] = useState<DetailTab>('members');
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [homeworkForm, setHomeworkForm] = useState<HomeworkForm>(EMPTY_HOMEWORK_FORM);
  const [problemList, setProblemList] = useState<any[]>([]);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [homeworkProgress, setHomeworkProgress] = useState<any>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [memberDetail, setMemberDetail] = useState<any>(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [battleList, setBattleList] = useState<any[]>([]);
  const [battleLoading, setBattleLoading] = useState(false);
  const [showBattleForm, setShowBattleForm] = useState(false);
  const [battleForm, setBattleForm] = useState<BattleForm>(EMPTY_BATTLE_FORM);
  const [examList, setExamList] = useState<any[]>([]);
  const [examLoading, setExamLoading] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);
  const [examForm, setExamForm] = useState<ExamForm>(EMPTY_EXAM_FORM);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [examDetail, setExamDetail] = useState<any>(null);
  const [examDetailLoading, setExamDetailLoading] = useState(false);
  const [problemSearch, setProblemSearch] = useState('');
  const [problemDifficultyFilter, setProblemDifficultyFilter] = useState('ALL');
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await classAPI.getAll();
      if (res.success) {
        setClasses(res.data || []);
      }
    } catch (error) {
      console.error('获取班级列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (classId: string) => {
    setMembersLoading(true);
    try {
      const res = await classAPI.getMembers(classId);
      if (res.success) {
        setMembers(res.data || []);
      }
    } catch (error) {
      console.error('获取成员列表失败', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    if (allUsers.length > 0) return;
    try {
      const res = await usersAPI.getAll();
      if (res.success) {
        setAllUsers(res.data || []);
      }
    } catch (error) {
      console.error('获取用户列表失败', error);
    }
  };

  const fetchJoinRequests = async (classId: string) => {
    setJoinRequestsLoading(true);
    try {
      const res = await classAPI.getJoinRequests(classId);
      if (res.success) {
        setJoinRequests(res.data || []);
      }
    } catch (error) {
      console.error('获取加入申请失败', error);
    } finally {
      setJoinRequestsLoading(false);
    }
  };

  const fetchAnalytics = async (classId: string) => {
    setAnalyticsLoading(true);
    try {
      const res = await classAPI.getAnalytics(classId);
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (error) {
      console.error('获取学情分析失败', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchHomework = async (classId: string) => {
    setHomeworkLoading(true);
    try {
      const res = await classAPI.getHomework(classId);
      if (res.success) {
        setHomeworkList(res.data || []);
      }
    } catch (error) {
      console.error('获取作业列表失败', error);
    } finally {
      setHomeworkLoading(false);
    }
  };

  const fetchProblems = async (force = false) => {
    if (!force && problemList.length > 0) return;
    try {
      const res = await problemsAPI.getAll();
      if (res.success) {
        setProblemList(res.data || []);
      }
    } catch (error) {
      console.error('获取题目列表失败', error);
    }
  };

  const fetchHomeworkProgress = async (homeworkId: string) => {
    setProgressLoading(true);
    try {
      const res = await classAPI.getHomeworkProgress(homeworkId);
      if (res.success) {
        setHomeworkProgress(res.data);
      }
    } catch (error) {
      console.error('获取作业进度失败', error);
    } finally {
      setProgressLoading(false);
    }
  };

  const fetchMemberDetail = async (classId: string, userId: string) => {
    setMemberDetailLoading(true);
    try {
      const res = await classAPI.getMemberDetail(classId, userId);
      if (res.success) {
        setMemberDetail(res.data);
      }
    } catch (error) {
      console.error('获取成员详情失败', error);
    } finally {
      setMemberDetailLoading(false);
    }
  };

  const fetchBattles = async (classId: string) => {
    setBattleLoading(true);
    try {
      const res = await classAPI.getClassBattles(classId);
      if (res.success) {
        setBattleList(res.data || []);
      }
    } catch (error) {
      console.error('获取班级PK列表失败', error);
    } finally {
      setBattleLoading(false);
    }
  };

  const fetchExams = async (classId: string) => {
    setExamLoading(true);
    try {
      const res = await classAPI.getClassExams(classId);
      if (res.success) {
        setExamList(res.data || []);
      }
    } catch (error) {
      console.error('获取班级考试列表失败', error);
    } finally {
      setExamLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      alert('请填写班级名称');
      return;
    }
    try {
      const res = await classAPI.create({
        name: form.name,
        description: form.description || undefined,
        grade: form.grade || undefined,
      });
      if (res.success) {
        setForm(EMPTY_FORM);
        setView('list');
        fetchClasses();
      }
    } catch (error: any) {
      alert(error.error?.message || '创建班级失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedClass || !form.name.trim()) {
      alert('请填写班级名称');
      return;
    }
    try {
      const res = await classAPI.update(selectedClass.id, {
        name: form.name,
        description: form.description || undefined,
        grade: form.grade || undefined,
      });
      if (res.success) {
        setForm(EMPTY_FORM);
        setSelectedClass(null);
        setView('list');
        fetchClasses();
      }
    } catch (error: any) {
      alert(error.error?.message || '更新班级失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此班级吗？班级内所有成员关系将被移除。')) return;
    try {
      await classAPI.delete(id);
      if (selectedClass?.id === id) {
        setSelectedClass(null);
        setMembers([]);
      }
      fetchClasses();
    } catch (error: any) {
      alert(error.error?.message || '删除班级失败');
    }
  };

  const handleGenerateCode = async (classId: string) => {
    try {
      const res = await classAPI.generateClassCode(classId);
      if (res.success) {
        alert(`班级码已生成: ${res.data.classCode}`);
        fetchClasses();
      }
    } catch (error: any) {
      alert(error.error?.message || '生成班级码失败');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleAddMember = async () => {
    if (!selectedClass || !selectedUserId) {
      alert('请选择要添加的用户');
      return;
    }
    try {
      const res = await classAPI.addMember(selectedClass.id, selectedUserId, selectedRole);
      if (res.success) {
        setSelectedUserId('');
        fetchMembers(selectedClass.id);
      }
    } catch (error: any) {
      alert(error.error?.message || '添加成员失败');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedClass) return;
    if (!confirm('确定要移除此成员吗？')) return;
    try {
      const res = await classAPI.removeMember(selectedClass.id, userId);
      if (res.success) {
        fetchMembers(selectedClass.id);
      }
    } catch (error: any) {
      alert(error.error?.message || '移除成员失败');
    }
  };

  const handleReviewJoinRequest = async (requestId: string, approved: boolean) => {
    try {
      const res = await classAPI.reviewJoinRequest(requestId, approved);
      if (res.success) {
        if (selectedClass) {
          fetchJoinRequests(selectedClass.id);
          fetchMembers(selectedClass.id);
        }
      }
    } catch (error: any) {
      alert(error.error?.message || (approved ? '审批通过失败' : '拒绝申请失败'));
    }
  };

  const handleCreateHomework = async () => {
    if (!selectedClass || !homeworkForm.title.trim()) {
      alert('请填写作业标题');
      return;
    }
    if (homeworkForm.problemIds.length === 0) {
      alert('请至少选择一道题目');
      return;
    }
    try {
      const res = await classAPI.createHomework(selectedClass.id, {
        title: homeworkForm.title,
        description: homeworkForm.description || undefined,
        problemIds: homeworkForm.problemIds,
        dueDate: homeworkForm.dueDate || undefined,
      });
      if (res.success) {
        setShowHomeworkForm(false);
        setHomeworkForm(EMPTY_HOMEWORK_FORM);
        fetchHomework(selectedClass.id);
      }
    } catch (error: any) {
      alert(error.error?.message || '创建作业失败');
    }
  };

  const handleCreateBattle = async () => {
    if (!selectedClass || !battleForm.targetClassId) {
      alert('请选择挑战目标班级');
      return;
    }
    if (battleForm.problemIds.length === 0) {
      alert('请至少选择一道题目');
      return;
    }
    try {
      const res = await classAPI.createClassBattle({
        challengerClassId: selectedClass.id,
        targetClassId: battleForm.targetClassId,
        problemIds: battleForm.problemIds,
      });
      if (res.success) {
        setShowBattleForm(false);
        setBattleForm(EMPTY_BATTLE_FORM);
        fetchBattles(selectedClass.id);
      }
    } catch (error: any) {
      alert(error.error?.message || '发起PK失败');
    }
  };

  const handleAcceptBattle = async (battleId: string) => {
    if (!selectedClass) return;
    try {
      const res = await classAPI.acceptClassBattle(battleId);
      if (res.success) {
        fetchBattles(selectedClass.id);
      }
    } catch (error: any) {
      alert(error.error?.message || '接受挑战失败');
    }
  };

  const handleCreateExam = async () => {
    if (!selectedClass || !examForm.title.trim()) {
      alert('请填写考试标题');
      return;
    }
    if (examForm.problemIds.length === 0) {
      alert('请至少选择一道题目');
      return;
    }
    try {
      const res = await classAPI.createClassExam(selectedClass.id, {
        title: examForm.title,
        description: examForm.description || undefined,
        duration: examForm.duration,
        startTime: examForm.startTime || undefined,
        endTime: examForm.endTime || undefined,
        problemIds: examForm.problemIds,
      });
      if (res.success) {
        setShowExamForm(false);
        setExamForm(EMPTY_EXAM_FORM);
        fetchExams(selectedClass.id);
      }
    } catch (error: any) {
      alert(error.error?.message || '创建考试失败');
    }
  };

  const openExamDetail = async (exam: any) => {
    setSelectedExam(exam);
    setExamDetail(null);
    if (exam.id) {
      setExamDetailLoading(true);
      try {
        const res = await classAPI.getClassExams(selectedClass!.id);
        if (res.success) {
          const found = (res.data || []).find((e: any) => e.id === exam.id);
          if (found) setExamDetail(found);
        }
      } catch (error) {
        console.error('获取考试详情失败', error);
      } finally {
        setExamDetailLoading(false);
      }
    }
  };

  const openDetail = async (cls: any) => {
    setSelectedClass(cls);
    setView('detail');
    setActiveTab('members');
    setAnalytics(null);
    setHomeworkList([]);
    setSelectedHomework(null);
    setMemberDetail(null);
    setSelectedMemberId(null);
    setBattleList([]);
    setShowBattleForm(false);
    setBattleForm(EMPTY_BATTLE_FORM);
    setExamList([]);
    setShowExamForm(false);
    setExamForm(EMPTY_EXAM_FORM);
    setSelectedExam(null);
    setExamDetail(null);
    setJoinRequests([]);
    fetchMembers(cls.id);
    fetchJoinRequests(cls.id);
    fetchAllUsers();
  };

  const openEdit = (cls: any) => {
    setSelectedClass(cls);
    setForm({
      name: cls.name || '',
      description: cls.description || '',
      grade: cls.grade || '',
    });
    setView('edit');
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSelectedClass(null);
    setView('create');
  };

  const backToList = () => {
    setView('list');
    setSelectedClass(null);
    setMembers([]);
    setForm(EMPTY_FORM);
  };

  const handleTabChange = (tab: DetailTab) => {
    setActiveTab(tab);
    if (!selectedClass) return;
    if (tab === 'analytics' && !analytics) {
      fetchAnalytics(selectedClass.id);
    }
    if (tab === 'homework' && homeworkList.length === 0) {
      fetchHomework(selectedClass.id);
      fetchProblems();
    }
    if (tab === 'pk') {
      fetchBattles(selectedClass.id);
      fetchProblems();
    }
    if (tab === 'exam') {
      fetchExams(selectedClass.id);
      fetchProblems();
    }
  };

  const openHomeworkProgress = (homework: any) => {
    setSelectedHomework(homework);
    if (selectedClass) {
      fetchHomeworkProgress(homework.id);
    }
  };

  const openMemberDetail = (userId: string) => {
    setSelectedMemberId(userId);
    setMemberDetail(null);
    if (selectedClass) {
      fetchMemberDetail(selectedClass.id, userId);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'TEACHER': return '教师';
      case 'STUDENT': return '学生';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'TEACHER': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-green-500/20 text-green-400';
    }
  };

  const getAvailableUsers = () => {
    const memberIds = new Set(members.map((m: any) => m.userId || m.user?.id));
    return allUsers.filter((u: any) => !memberIds.has(u.id));
  };

  const toggleProblemSelection = (problemId: string) => {
    setHomeworkForm((prev) => ({
      ...prev,
      problemIds: prev.problemIds.includes(problemId)
        ? prev.problemIds.filter((id) => id !== problemId)
        : [...prev.problemIds, problemId],
    }));
  };

  const getFilteredProblems = () => {
    return problemList.filter((problem: any) => {
      const matchesSearch = problem.title.toLowerCase().includes(problemSearch.toLowerCase());
      const matchesDifficulty = problemDifficultyFilter === 'ALL' || problem.difficulty === problemDifficultyFilter;
      return matchesSearch && matchesDifficulty;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (view === 'create' || view === 'edit') {
    return (
      <div>
        <button
          onClick={backToList}
          className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <X className="h-5 w-5 mr-2" />
          返回列表
        </button>

        <h1 className="text-3xl font-bold text-white mb-8">
          {view === 'create' ? '创建班级' : '编辑班级'}
        </h1>

        <div className="bg-slate-800 rounded-xl p-6 shadow-xl max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">班级名称</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="请输入班级名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">班级描述</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                rows={3}
                placeholder="班级描述（可选）"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">年级</label>
              <input
                type="text"
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="如：高一、2024级（可选）"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={backToList}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={view === 'create' ? handleCreate : handleUpdate}
              className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <Save className="h-5 w-5 mr-2" />
              {view === 'create' ? '创建班级' : '保存修改'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedClass) {
    const availableUsers = getAvailableUsers();

    return (
      <div>
        <button
          onClick={backToList}
          className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          返回列表
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">{selectedClass.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
              {selectedClass.grade && (
                <span className="flex items-center">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  {selectedClass.grade}
                </span>
              )}
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {members.length} 名成员
              </span>
            </div>
            {selectedClass.description && (
              <p className="text-slate-400 mt-2 text-sm">{selectedClass.description}</p>
            )}
          </div>
          <button
            onClick={() => openEdit(selectedClass)}
            className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            编辑班级
          </button>
        </div>

        <div className="flex border-b border-slate-700 mb-6">
          {([
            { key: 'members' as DetailTab, label: '成员列表', icon: Users },
            { key: 'analytics' as DetailTab, label: '学情分析', icon: BarChart3 },
            { key: 'homework' as DetailTab, label: '作业管理', icon: ClipboardList },
            { key: 'pk' as DetailTab, label: '班级PK', icon: Swords },
            { key: 'exam' as DetailTab, label: '班级考试', icon: FileText },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'members' && (
          <div>
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">加入申请</h2>
              {joinRequestsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent"></div>
                </div>
              ) : joinRequests.filter((r: any) => r.status === 'PENDING').length === 0 ? (
                <p className="text-slate-400 text-sm">暂无待审核的加入申请</p>
              ) : (
                <div className="space-y-3">
                  {joinRequests.filter((r: any) => r.status === 'PENDING').map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{req.user?.username || '未知用户'}</div>
                        <div className="text-slate-400 text-sm">{req.user?.email || ''}</div>
                        {req.message && (
                          <div className="text-slate-300 text-sm mt-1 italic">"{req.message}"</div>
                        )}
                        <div className="text-slate-500 text-xs mt-1">{new Date(req.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReviewJoinRequest(req.id, true)}
                          className="flex items-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          通过
                        </button>
                        <button
                          onClick={() => handleReviewJoinRequest(req.id, false)}
                          className="flex items-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                        >
                          <XCircle className="h-4 w-4" />
                          拒绝
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedMemberId && memberDetail ? (
              <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <UserCircle className="h-5 w-5 text-cyan-400" />
                    成员详情 - {memberDetail.username || memberDetail.user?.username}
                  </h2>
                  <button
                    onClick={() => { setSelectedMemberId(null); setMemberDetail(null); }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {memberDetailLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-700 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-cyan-400">{memberDetail.totalSubmissions ?? 0}</div>
                        <div className="text-sm text-slate-400">总提交</div>
                      </div>
                      <div className="bg-slate-700 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">{memberDetail.accepted ?? 0}</div>
                        <div className="text-sm text-slate-400">通过</div>
                      </div>
                      <div className="bg-slate-700 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          {memberDetail.totalSubmissions ? Math.round((memberDetail.accepted / memberDetail.totalSubmissions) * 100) : 0}%
                        </div>
                        <div className="text-sm text-slate-400">通过率</div>
                      </div>
                      <div className="bg-slate-700 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">{memberDetail.score ?? 0}</div>
                        <div className="text-sm text-slate-400">积分</div>
                      </div>
                    </div>

                    {memberDetail.weakAreas && memberDetail.weakAreas.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          薄弱领域
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {memberDetail.weakAreas.map((area: any, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                              {typeof area === 'string' ? area : area.name || area.tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {memberDetail.submissions && memberDetail.submissions.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">最近提交</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-700">
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">题目</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">状态</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">时间</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                              {memberDetail.submissions.slice(0, 10).map((sub: any) => (
                                <tr key={sub.id} className="hover:bg-slate-750">
                                  <td className="px-4 py-3 text-white text-sm">{sub.problem?.title || sub.problemId}</td>
                                  <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      sub.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {sub.status === 'ACCEPTED' ? '通过' : '未通过'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-400 text-sm">
                                    {new Date(sub.createdAt).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">成员列表</h2>
              </div>

              {membersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
                </div>
              ) : members.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">暂无成员</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-700">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户名</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">邮箱</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">角色</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">加入时间</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {members.map((member: any) => {
                        const user = member.user || member;
                        return (
                          <tr key={member.id || user.id} className="hover:bg-slate-750 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-white font-medium">{user.username}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-sm">{user.email}</td>
                            <td className="px-6 py-4">
                              <span className={`text-xs px-2 py-1 rounded ${getRoleColor(member.role)}`}>
                                {getRoleName(member.role)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-sm">
                              {member.joinedAt
                                ? new Date(member.joinedAt).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openMemberDetail(user.id)}
                                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                  title="查看详情"
                                >
                                  <UserCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(user.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="移除成员"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            {analyticsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
              </div>
            ) : analytics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className="h-5 w-5 text-cyan-400" />
                      <span className="text-slate-400 text-sm">班级平均通过率</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {analytics.averageAcceptanceRate != null
                        ? `${Math.round(analytics.averageAcceptanceRate)}%`
                        : '暂无数据'}
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <ClipboardList className="h-5 w-5 text-green-400" />
                      <span className="text-slate-400 text-sm">总提交数</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{analytics.totalSubmissions ?? 0}</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-400" />
                      <span className="text-slate-400 text-sm">总通过数</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{analytics.totalAccepted ?? 0}</div>
                  </div>
                </div>

                {analytics.weakAreas && analytics.weakAreas.length > 0 && (
                  <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      薄弱领域汇总
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {analytics.weakAreas.map((area: any, idx: number) => (
                        <span key={idx} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm">
                          {typeof area === 'string' ? area : area.name || area.tag}
                          {typeof area === 'object' && area.rate != null && ` (${Math.round(area.rate)}%)`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analytics.memberStats && analytics.memberStats.length > 0 && (
                  <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
                    <div className="px-6 py-4 border-b border-slate-700">
                      <h2 className="text-xl font-semibold text-white">成员学情统计</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-700">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户名</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">提交数</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">通过数</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">通过率</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">最近活动</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {analytics.memberStats.map((stat: any) => (
                            <tr key={stat.userId} className="hover:bg-slate-750 transition-colors">
                              <td className="px-6 py-4 text-white font-medium">{stat.username}</td>
                              <td className="px-6 py-4 text-slate-300">{stat.submissions ?? 0}</td>
                              <td className="px-6 py-4 text-green-400">{stat.accepted ?? 0}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-slate-700 rounded-full h-2">
                                    <div
                                      className="bg-cyan-500 h-2 rounded-full"
                                      style={{ width: `${Math.min(stat.rate ?? 0, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-slate-300">{Math.round(stat.rate ?? 0)}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-400 text-sm">
                                {stat.recentActivity
                                  ? new Date(stat.recentActivity).toLocaleDateString()
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl p-12 text-center">
                <BarChart3 className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">暂无学情数据</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'homework' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">作业管理</h2>
              <button
                onClick={() => { setShowHomeworkForm(true); fetchProblems(true); }}
                className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                创建作业
              </button>
            </div>

            {showHomeworkForm && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">创建新作业</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">作业标题</label>
                    <input
                      type="text"
                      value={homeworkForm.title}
                      onChange={(e) => setHomeworkForm({ ...homeworkForm, title: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="请输入作业标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">作业描述</label>
                    <textarea
                      value={homeworkForm.description}
                      onChange={(e) => setHomeworkForm({ ...homeworkForm, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      rows={3}
                      placeholder="作业描述（可选）"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">截止日期</label>
                    <input
                      type="datetime-local"
                      value={homeworkForm.dueDate}
                      onChange={(e) => setHomeworkForm({ ...homeworkForm, dueDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">选择题目</label>
                    <div className="space-y-3 mb-3">
                      <input
                        type="text"
                        placeholder="搜索题目..."
                        value={problemSearch}
                        onChange={(e) => setProblemSearch(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <div className="flex gap-2">
                        {[
                          { value: 'ALL', label: '全部' },
                          { value: 'EASY', label: '简单' },
                          { value: 'MEDIUM', label: '中等' },
                          { value: 'HARD', label: '困难' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setProblemDifficultyFilter(opt.value)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              problemDifficultyFilter === opt.value
                                ? 'bg-cyan-500 text-white'
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto bg-slate-700 rounded-lg p-3 space-y-2">
                      {problemList.length === 0 ? (
                        <p className="text-slate-400 text-sm">加载题目中...</p>
                      ) : getFilteredProblems().length === 0 ? (
                        <p className="text-slate-400 text-sm">没有找到匹配的题目</p>
                      ) : (
                        getFilteredProblems().map((problem: any) => (
                          <label key={problem.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-600 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={homeworkForm.problemIds.includes(problem.id)}
                              onChange={() => toggleProblemSelection(problem.id)}
                              className="rounded border-slate-500 text-cyan-500 focus:ring-cyan-500"
                            />
                            <span className="text-white text-sm">{problem.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ml-auto ${
                              problem.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400'
                              : problem.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                            }`}>
                              {problem.difficulty === 'EASY' ? '简单' : problem.difficulty === 'MEDIUM' ? '中等' : '困难'}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {homeworkForm.problemIds.length > 0 && (
                      <p className="text-sm text-cyan-400 mt-2">已选择 {homeworkForm.problemIds.length} 道题目</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => { setShowHomeworkForm(false); setHomeworkForm(EMPTY_HOMEWORK_FORM); }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateHomework}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                  >
                    创建
                  </button>
                </div>
              </div>
            )}

            {selectedHomework && homeworkProgress ? (
              <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-cyan-400" />
                    {selectedHomework.title} - 完成进度
                  </h3>
                  <button
                    onClick={() => { setSelectedHomework(null); setHomeworkProgress(null); }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {progressLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-700">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">学生</th>
                          {(selectedHomework.problems || []).map((p: any) => (
                            <th key={p.id || p.problemId} className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                              {p.title || p.problemId}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {(homeworkProgress.members || []).map((member: any) => (
                          <tr key={member.userId} className="hover:bg-slate-750">
                            <td className="px-4 py-3 text-white font-medium">{member.username}</td>
                            {(selectedHomework.problems || []).map((p: any) => {
                              const completed = (member.completedProblems || []).includes(p.id || p.problemId);
                              return (
                                <td key={p.id || p.problemId} className="px-4 py-3">
                                  {completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-400" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            {homeworkLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
              </div>
            ) : homeworkList.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-12 text-center">
                <ClipboardList className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">暂无作业</p>
              </div>
            ) : (
              <div className="space-y-4">
                {homeworkList.map((hw: any) => {
                  const isOverdue = hw.dueDate && new Date(hw.dueDate) < new Date();
                  return (
                    <div key={hw.id} className="bg-slate-800 rounded-xl p-6 shadow-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">{hw.title}</h3>
                          {hw.description && (
                            <p className="text-slate-400 text-sm mt-1">{hw.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <span className="flex items-center text-slate-400">
                              <Calendar className="h-4 w-4 mr-1" />
                              截止: {hw.dueDate ? new Date(hw.dueDate).toLocaleString() : '无期限'}
                            </span>
                            <span className="flex items-center text-slate-400">
                              <ClipboardList className="h-4 w-4 mr-1" />
                              {hw.problemCount ?? hw.problems?.length ?? 0} 道题
                            </span>
                            <span className={`flex items-center text-sm ${
                              isOverdue ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {isOverdue ? (
                                <><XCircle className="h-4 w-4 mr-1" />已截止</>
                              ) : (
                                <><Clock className="h-4 w-4 mr-1" />进行中</>
                              )}
                            </span>
                            {hw.completionRate != null && (
                              <span className="text-cyan-400">
                                完成率: {Math.round(hw.completionRate)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => openHomeworkProgress(hw)}
                          className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                          查看进度
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pk' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">班级PK</h2>
              <button
                onClick={() => { setShowBattleForm(true); fetchProblems(true); }}
                className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                <Swords className="h-4 w-4 mr-2" />
                发起PK
              </button>
            </div>

            {showBattleForm && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">发起班级PK</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">挑战目标班级</label>
                    <select
                      value={battleForm.targetClassId}
                      onChange={(e) => setBattleForm({ ...battleForm, targetClassId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">-- 选择目标班级 --</option>
                      {classes.filter((c) => c.id !== selectedClass?.id).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">选择题目</label>
                    <div className="space-y-3 mb-3">
                      <input
                        type="text"
                        placeholder="搜索题目..."
                        value={problemSearch}
                        onChange={(e) => setProblemSearch(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <div className="flex gap-2">
                        {[
                          { value: 'ALL', label: '全部' },
                          { value: 'EASY', label: '简单' },
                          { value: 'MEDIUM', label: '中等' },
                          { value: 'HARD', label: '困难' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setProblemDifficultyFilter(opt.value)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              problemDifficultyFilter === opt.value
                                ? 'bg-cyan-500 text-white'
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto bg-slate-700 rounded-lg p-3 space-y-2">
                      {problemList.length === 0 ? (
                        <p className="text-slate-400 text-sm">加载题目中...</p>
                      ) : getFilteredProblems().length === 0 ? (
                        <p className="text-slate-400 text-sm">没有找到匹配的题目</p>
                      ) : (
                        getFilteredProblems().map((problem: any) => (
                          <label key={problem.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-600 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={battleForm.problemIds.includes(problem.id)}
                              onChange={() => setBattleForm((prev) => ({
                                ...prev,
                                problemIds: prev.problemIds.includes(problem.id)
                                  ? prev.problemIds.filter((id) => id !== problem.id)
                                  : [...prev.problemIds, problem.id],
                              }))}
                              className="rounded border-slate-500 text-cyan-500 focus:ring-cyan-500"
                            />
                            <span className="text-white text-sm">{problem.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ml-auto ${
                              problem.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400'
                              : problem.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                            }`}>
                              {problem.difficulty === 'EASY' ? '简单' : problem.difficulty === 'MEDIUM' ? '中等' : '困难'}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {battleForm.problemIds.length > 0 && (
                      <p className="text-sm text-cyan-400 mt-2">已选择 {battleForm.problemIds.length} 道题目</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => { setShowBattleForm(false); setBattleForm(EMPTY_BATTLE_FORM); }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateBattle}
                    className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    发起挑战
                  </button>
                </div>
              </div>
            )}

            {battleLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
              </div>
            ) : battleList.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-12 text-center">
                <Swords className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">暂无PK记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {battleList.map((battle: any) => {
                  const isChallenger = battle.challengerClassId === selectedClass?.id;
                  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
                    PENDING: { label: '等待中', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
                    ACTIVE: { label: '进行中', color: 'bg-green-500/20 text-green-400', icon: Play },
                    COMPLETED: { label: '已完成', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle2 },
                    CANCELLED: { label: '已取消', color: 'bg-slate-500/20 text-slate-400', icon: Ban },
                  };
                  const status = statusConfig[battle.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;
                  return (
                    <div key={battle.id} className="bg-slate-800 rounded-xl p-6 shadow-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Trophy className="h-5 w-5 text-cyan-400" />
                            <h3 className="text-lg font-semibold text-white">
                              {isChallenger
                                ? `挑战 ${battle.targetClass?.name || '对方班级'}`
                                : `被 ${battle.challengerClass?.name || '对方班级'} 挑战`}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${status.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 mt-3 text-sm">
                            <span className="flex items-center text-slate-400">
                              <Swords className="h-4 w-4 mr-1" />
                              {isChallenger ? '我方' : '挑战方'}: {battle.challengerScore ?? 0} 分
                            </span>
                            <span className="flex items-center text-slate-400">
                              <Swords className="h-4 w-4 mr-1" />
                              {isChallenger ? '对方' : '我方'}: {battle.targetScore ?? 0} 分
                            </span>
                            <span className="flex items-center text-slate-400">
                              <ClipboardList className="h-4 w-4 mr-1" />
                              {(battle.problems || []).length} 道题
                            </span>
                          </div>
                          {battle.status === 'ACTIVE' && battle.problems && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-slate-300 mb-2">PK题目</h4>
                              <div className="flex flex-wrap gap-2">
                                {battle.problems.map((p: any, idx: number) => (
                                  <span key={p.id || idx} className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm">
                                    {p.title || `题目${idx + 1}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {!isChallenger && battle.status === 'PENDING' && (
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleAcceptBattle(battle.id)}
                              className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              接受挑战
                            </button>
                            <button
                              onClick={async () => {
                                if (!selectedClass || !confirm('确定要拒绝此挑战吗？')) return;
                                try {
                                  const res = await classAPI.completeClassBattle(battle.id);
                                  if (res.success) fetchBattles(selectedClass.id);
                                } catch (error: any) {
                                  alert(error.error?.message || '拒绝挑战失败');
                                }
                              }}
                              className="flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                            >
                              <X className="h-4 w-4 mr-2" />
                              拒绝
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'exam' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">班级考试</h2>
              <button
                onClick={() => { setShowExamForm(true); fetchProblems(true); }}
                className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                创建考试
              </button>
            </div>

            {showExamForm && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">创建班级考试</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">考试标题</label>
                    <input
                      type="text"
                      value={examForm.title}
                      onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="请输入考试标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">考试描述</label>
                    <textarea
                      value={examForm.description}
                      onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      rows={3}
                      placeholder="考试描述（可选）"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">考试时长（分钟）</label>
                      <input
                        type="number"
                        value={examForm.duration}
                        onChange={(e) => setExamForm({ ...examForm, duration: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">开始时间</label>
                      <input
                        type="datetime-local"
                        value={examForm.startTime}
                        onChange={(e) => setExamForm({ ...examForm, startTime: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">结束时间</label>
                      <input
                        type="datetime-local"
                        value={examForm.endTime}
                        onChange={(e) => setExamForm({ ...examForm, endTime: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">选择题目</label>
                    <div className="space-y-3 mb-3">
                      <input
                        type="text"
                        placeholder="搜索题目..."
                        value={problemSearch}
                        onChange={(e) => setProblemSearch(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <div className="flex gap-2">
                        {[
                          { value: 'ALL', label: '全部' },
                          { value: 'EASY', label: '简单' },
                          { value: 'MEDIUM', label: '中等' },
                          { value: 'HARD', label: '困难' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setProblemDifficultyFilter(opt.value)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              problemDifficultyFilter === opt.value
                                ? 'bg-cyan-500 text-white'
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto bg-slate-700 rounded-lg p-3 space-y-2">
                      {problemList.length === 0 ? (
                        <p className="text-slate-400 text-sm">加载题目中...</p>
                      ) : getFilteredProblems().length === 0 ? (
                        <p className="text-slate-400 text-sm">没有找到匹配的题目</p>
                      ) : (
                        getFilteredProblems().map((problem: any) => (
                          <label key={problem.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-600 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={examForm.problemIds.includes(problem.id)}
                              onChange={() => setExamForm((prev) => ({
                                ...prev,
                                problemIds: prev.problemIds.includes(problem.id)
                                  ? prev.problemIds.filter((id) => id !== problem.id)
                                  : [...prev.problemIds, problem.id],
                              }))}
                              className="rounded border-slate-500 text-cyan-500 focus:ring-cyan-500"
                            />
                            <span className="text-white text-sm">{problem.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ml-auto ${
                              problem.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400'
                              : problem.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                            }`}>
                              {problem.difficulty === 'EASY' ? '简单' : problem.difficulty === 'MEDIUM' ? '中等' : '困难'}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {examForm.problemIds.length > 0 && (
                      <p className="text-sm text-cyan-400 mt-2">已选择 {examForm.problemIds.length} 道题目</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => { setShowExamForm(false); setExamForm(EMPTY_EXAM_FORM); }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateExam}
                    className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    创建考试
                  </button>
                </div>
              </div>
            )}

            {selectedExam && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-400" />
                    {selectedExam.title} - 考试详情
                  </h3>
                  <button
                    onClick={() => { setSelectedExam(null); setExamDetail(null); }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {examDetailLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-700 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-cyan-400">{selectedExam.duration ?? 0}</div>
                        <div className="text-sm text-slate-400">时长(分钟)</div>
                      </div>
                      <div className="bg-slate-700 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">{(selectedExam.problems || []).length}</div>
                        <div className="text-sm text-slate-400">题目数</div>
                      </div>
                      <div className="bg-slate-700 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-400">{(selectedExam.participants || []).length}</div>
                        <div className="text-sm text-slate-400">参与人数</div>
                      </div>
                      <div className="bg-slate-700 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {selectedExam.averageScore != null ? Math.round(selectedExam.averageScore) : '-'}
                        </div>
                        <div className="text-sm text-slate-400">平均分</div>
                      </div>
                    </div>
                    {selectedExam.description && (
                      <p className="text-slate-400 text-sm">{selectedExam.description}</p>
                    )}
                    {examDetail?.results && examDetail.results.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-700">
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">学生</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">得分</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">提交时间</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {examDetail.results.map((r: any, idx: number) => (
                              <tr key={r.userId || idx} className="hover:bg-slate-750">
                                <td className="px-4 py-3 text-white">{r.username || r.userId}</td>
                                <td className="px-4 py-3 text-cyan-400 font-medium">{r.score ?? '-'}</td>
                                <td className="px-4 py-3 text-slate-400 text-sm">
                                  {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {examLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
              </div>
            ) : examList.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-12 text-center">
                <FileText className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">暂无考试</p>
              </div>
            ) : (
              <div className="space-y-4">
                {examList.map((exam: any) => {
                  const isActive = exam.startTime && exam.endTime
                    && new Date(exam.startTime) <= new Date() && new Date(exam.endTime) >= new Date();
                  const isEnded = exam.endTime && new Date(exam.endTime) < new Date();
                  return (
                    <div key={exam.id} className="bg-slate-800 rounded-xl p-6 shadow-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">{exam.title}</h3>
                          {exam.description && (
                            <p className="text-slate-400 text-sm mt-1">{exam.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <span className="flex items-center text-slate-400">
                              <Clock className="h-4 w-4 mr-1" />
                              {exam.duration} 分钟
                            </span>
                            <span className="flex items-center text-slate-400">
                              <ClipboardList className="h-4 w-4 mr-1" />
                              {(exam.problems || []).length} 道题
                            </span>
                            {exam.startTime && (
                              <span className="flex items-center text-slate-400">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(exam.startTime).toLocaleString()}
                              </span>
                            )}
                            <span className={`flex items-center text-sm ${
                              isEnded ? 'text-red-400' : isActive ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                              {isEnded ? (
                                <><XCircle className="h-4 w-4 mr-1" />已结束</>
                              ) : isActive ? (
                                <><Play className="h-4 w-4 mr-1" />进行中</>
                              ) : (
                                <><Clock className="h-4 w-4 mr-1" />未开始</>
                              )}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => openExamDetail(exam)}
                          className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                          查看详情
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">班级管理</h1>
        <button
          onClick={openCreate}
          className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建班级
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <GraduationCap className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">暂无班级</p>
          <p className="text-slate-500 mt-2">点击"创建班级"按钮开始</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-white truncate">{cls.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                    {cls.grade && (
                      <span className="flex items-center">
                        <GraduationCap className="h-4 w-4 mr-1" />
                        {cls.grade}
                      </span>
                    )}
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {cls._count?.members ?? cls.memberCount ?? 0} 名成员
                    </span>
                  </div>
                  {cls.classCode && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500">班级码:</span>
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded font-mono text-sm">{cls.classCode}</span>
                      <button
                        onClick={() => handleCopyCode(cls.classCode)}
                        className="text-slate-400 hover:text-cyan-400 transition-colors"
                        title="复制班级码"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {copySuccess && (
                        <span className="text-green-400 text-xs ml-1">已复制</span>
                      )}
                    </div>
                  )}
                  {cls.description && (
                    <p className="text-slate-400 mt-2 text-sm line-clamp-2">{cls.description}</p>
                  )}
                  {cls.creator && (
                    <p className="text-slate-500 mt-2 text-xs">
                      创建者: {cls.creator.username || cls.creator.email}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleGenerateCode(cls.id)}
                    className="text-cyan-400 hover:text-cyan-300 p-2 transition-colors"
                    title="生成班级码"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openDetail(cls)}
                    className="text-slate-300 hover:text-white p-2 transition-colors"
                    title="查看详情"
                  >
                    <Users className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openEdit(cls)}
                    className="text-slate-400 hover:text-white p-2 transition-colors"
                    title="编辑班级"
                  >
                    <Edit3 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cls.id)}
                    className="text-red-400 hover:text-red-300 p-2 transition-colors"
                    title="删除班级"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
