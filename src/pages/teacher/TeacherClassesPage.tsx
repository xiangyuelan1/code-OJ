import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { classAPI, problemsAPI, usersAPI, knowledgeTreeAPI } from '../../services/api';
import {
  Plus, Users, BookOpen, ClipboardList, FileText, X, ChevronRight,
  CheckCircle2, XCircle, Clock, Save, Search, Loader2, GraduationCap,
  Calendar, ArrowLeft, Copy, RefreshCw, UserPlus,
  ChevronDown, TreePine, Trash2, BookMarked, FolderOpen,
} from 'lucide-react';

type ViewMode = 'list' | 'create' | 'detail';
type DetailTab = 'members' | 'homework' | 'exam' | 'course';
type ProblemSelectorTab = 'search' | 'tree';

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

interface ExamForm {
  title: string;
  description: string;
  duration: number;
  startTime: string;
  endTime: string;
  problemIds: string[];
}

interface Course {
  id: string;
  name: string;
  description: string;
  stages: Stage[];
}

interface Stage {
  id: string;
  name: string;
  order: number;
  sessions: Session[];
}

interface Session {
  id: string;
  name: string;
  order: number;
  problemIds: string[];
  materialText: string;
  examId: string | null;
}

const EMPTY_CLASS_FORM: ClassForm = { name: '', description: '', grade: '' };
const EMPTY_HOMEWORK_FORM: HomeworkForm = { title: '', description: '', problemIds: [], dueDate: '' };
const EMPTY_EXAM_FORM: ExamForm = { title: '', description: '', duration: 60, startTime: '', endTime: '', problemIds: [] };

/** 课程体系嵌套更新的辅助函数，避免深层 map 嵌套降低可读性 */
const updateCourseInList = (
  list: Course[], courseId: string, updater: (c: Course) => Course
): Course[] => list.map(c => (c.id === courseId ? updater(c) : c));

const updateStageInCourse = (
  course: Course, stageId: string, updater: (s: Stage) => Stage
): Course => ({
  ...course,
  stages: course.stages.map(s => (s.id === stageId ? updater(s) : s)),
});

const updateSessionInStage = (
  stage: Stage, sessionId: string, updater: (sess: Session) => Session
): Stage => ({
  ...stage,
  sessions: stage.sessions.map(sess => (sess.id === sessionId ? updater(sess) : sess)),
});

export function TeacherClassesPage() {
  const { user } = useAuthStore();

  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');
  const [selectedClass, setSelectedClass] = useState<any>(null);

  const [form, setForm] = useState<ClassForm>(EMPTY_CLASS_FORM);

  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('STUDENT');

  const [activeTab, setActiveTab] = useState<DetailTab>('members');

  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [homeworkForm, setHomeworkForm] = useState<HomeworkForm>(EMPTY_HOMEWORK_FORM);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [homeworkProgress, setHomeworkProgress] = useState<any>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  const [examList, setExamList] = useState<any[]>([]);
  const [examLoading, setExamLoading] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);
  const [examForm, setExamForm] = useState<ExamForm>(EMPTY_EXAM_FORM);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [examDetail, setExamDetail] = useState<any>(null);
  const [examDetailLoading, setExamDetailLoading] = useState(false);

  const [problemList, setProblemList] = useState<any[]>([]);
  const [problemSearch, setProblemSearch] = useState('');
  const [problemDifficultyFilter, setProblemDifficultyFilter] = useState('ALL');

  /* ---- 知识树选题相关状态 ---- */
  const [problemSelectorTab, setProblemSelectorTab] = useState<ProblemSelectorTab>('search');
  const [knowledgeTree, setKnowledgeTree] = useState<any[]>([]);
  const [knowledgeTreeLoading, setKnowledgeTreeLoading] = useState(false);
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Set<string>>(new Set());
  const [selectedTreeNode, setSelectedTreeNode] = useState<string | null>(null);
  const [treeNodeProblems, setTreeNodeProblems] = useState<any[]>([]);
  const [treeNodeProblemsLoading, setTreeNodeProblemsLoading] = useState(false);

  /* ---- 课程体系相关状态 ---- */
  const [courses, setCourses] = useState<Course[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ name: '', description: '' });
  const [showStageForm, setShowStageForm] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState({ name: '' });
  const [showSessionForm, setShowSessionForm] = useState<{ courseId: string; stageId: string } | null>(null);
  const [sessionForm, setSessionForm] = useState({ name: '', materialText: '' });
  const [editingSessionProblems, setEditingSessionProblems] = useState<{
    courseId: string; stageId: string; sessionId: string;
  } | null>(null);
  const [editingSessionMaterial, setEditingSessionMaterial] = useState<{
    courseId: string; stageId: string; sessionId: string;
  } | null>(null);
  const [materialEditText, setMaterialEditText] = useState('');

  useEffect(() => { fetchClasses(); }, []);

  /* ==================== 数据获取 ==================== */

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await classAPI.getAll();
      if (res.success) {
        const allClasses = res.data || [];
        const teacherClasses = allClasses.filter(
          (cls: any) => cls.createdBy === user?.id || cls.creator?.id === user?.id
        );
        setClasses(teacherClasses);
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
      if (res.success) { setMembers(res.data || []); }
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
      if (res.success) { setAllUsers(res.data || []); }
    } catch (error) {
      console.error('获取用户列表失败', error);
    }
  };

  const fetchHomework = async (classId: string) => {
    setHomeworkLoading(true);
    try {
      const res = await classAPI.getHomework(classId);
      if (res.success) { setHomeworkList(res.data || []); }
    } catch (error) {
      console.error('获取作业列表失败', error);
    } finally {
      setHomeworkLoading(false);
    }
  };

  const fetchExams = async (classId: string) => {
    setExamLoading(true);
    try {
      const res = await classAPI.getClassExams(classId);
      if (res.success) { setExamList(res.data || []); }
    } catch (error) {
      console.error('获取班级考试列表失败', error);
    } finally {
      setExamLoading(false);
    }
  };

  const fetchProblems = async (force = false) => {
    if (!force && problemList.length > 0) return;
    try {
      const res = await problemsAPI.getAll();
      if (res.success) { setProblemList(res.data || []); }
    } catch (error) {
      console.error('获取题目列表失败', error);
    }
  };

  const fetchHomeworkProgress = async (homeworkId: string) => {
    setProgressLoading(true);
    try {
      const res = await classAPI.getHomeworkProgress(homeworkId);
      if (res.success) { setHomeworkProgress(res.data); }
    } catch (error) {
      console.error('获取作业进度失败', error);
    } finally {
      setProgressLoading(false);
    }
  };

  /** 获取知识树全量数据，仅在用户切换到知识树 Tab 时调用 */
  const fetchKnowledgeTree = useCallback(async () => {
    if (knowledgeTree.length > 0) return;
    setKnowledgeTreeLoading(true);
    try {
      const res = await knowledgeTreeAPI.getTree();
      if (res.success) { setKnowledgeTree(res.data || []); }
    } catch (error) {
      console.error('获取知识树失败', error);
    } finally {
      setKnowledgeTreeLoading(false);
    }
  }, [knowledgeTree.length]);

  /** 点击知识树节点：展开/折叠 + 加载该节点下的题目 */
  const handleTreeNodeClick = async (node: any) => {
    setExpandedTreeNodes(prev => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
    setSelectedTreeNode(node.id);
    setTreeNodeProblemsLoading(true);
    try {
      const res = await knowledgeTreeAPI.getNodeProblems(node.id);
      if (res.success) {
        setTreeNodeProblems(res.data || []);
      } else {
        setTreeNodeProblems([]);
      }
    } catch (error) {
      console.error('获取节点题目失败', error);
      setTreeNodeProblems([]);
    } finally {
      setTreeNodeProblemsLoading(false);
    }
  };

  /* ==================== 班级操作 ==================== */

  const handleCreate = async () => {
    if (!form.name.trim()) { alert('请填写班级名称'); return; }
    try {
      const res = await classAPI.create({
        name: form.name,
        description: form.description || undefined,
        grade: form.grade || undefined,
      });
      if (res.success) {
        setForm(EMPTY_CLASS_FORM);
        setView('list');
        fetchClasses();
      }
    } catch (error: any) {
      alert(error.error?.message || '创建班级失败');
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      alert('班级码已复制到剪贴板');
    }).catch(() => {
      prompt('请手动复制班级码:', code);
    });
  };

  const handleAddMember = async () => {
    if (!selectedClass || !selectedUserId) { alert('请选择要添加的用户'); return; }
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
      if (res.success) { fetchMembers(selectedClass.id); }
    } catch (error: any) {
      alert(error.error?.message || '移除成员失败');
    }
  };

  const handleCreateHomework = async () => {
    if (!selectedClass || !homeworkForm.title.trim()) { alert('请填写作业标题'); return; }
    if (homeworkForm.problemIds.length === 0) { alert('请至少选择一道题目'); return; }
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

  const handleCreateExam = async () => {
    if (!selectedClass || !examForm.title.trim()) { alert('请填写考试标题'); return; }
    if (examForm.problemIds.length === 0) { alert('请至少选择一道题目'); return; }
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

  const openDetail = async (cls: any) => {
    setSelectedClass(cls);
    setView('detail');
    setActiveTab('members');
    setHomeworkList([]);
    setSelectedHomework(null);
    setExamList([]);
    setShowExamForm(false);
    setExamForm(EMPTY_EXAM_FORM);
    setSelectedExam(null);
    setExamDetail(null);
    setProblemSelectorTab('search');
    setKnowledgeTree([]);
    setExpandedTreeNodes(new Set());
    setSelectedTreeNode(null);
    setTreeNodeProblems([]);
    setCourses([]);
    setExpandedCourses(new Set());
    setExpandedStages(new Set());
    setShowCourseForm(false);
    setShowStageForm(null);
    setShowSessionForm(null);
    setEditingSessionProblems(null);
    setEditingSessionMaterial(null);
    fetchMembers(cls.id);
    fetchAllUsers();
  };

  const openCreate = () => {
    setForm(EMPTY_CLASS_FORM);
    setSelectedClass(null);
    setView('create');
  };

  const backToList = () => {
    setView('list');
    setSelectedClass(null);
    setMembers([]);
    setForm(EMPTY_CLASS_FORM);
  };

  const handleTabChange = (tab: DetailTab) => {
    setActiveTab(tab);
    if (!selectedClass) return;
    if (tab === 'homework' && homeworkList.length === 0) {
      fetchHomework(selectedClass.id);
      fetchProblems();
    }
    if (tab === 'exam') {
      fetchExams(selectedClass.id);
      fetchProblems();
    }
    if (tab === 'course') {
      loadCourses(selectedClass.id);
      fetchProblems();
    }
  };

  const openHomeworkProgress = (homework: any) => {
    setSelectedHomework(homework);
    if (selectedClass) { fetchHomeworkProgress(homework.id); }
  };

  const openExamDetail = async (exam: any) => {
    setSelectedExam(exam);
    setExamDetail(null);
    if (exam.id && selectedClass) {
      setExamDetailLoading(true);
      try {
        const res = await classAPI.getClassExams(selectedClass.id);
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

  const toggleHomeworkProblem = (problemId: string) => {
    setHomeworkForm(prev => ({
      ...prev,
      problemIds: prev.problemIds.includes(problemId)
        ? prev.problemIds.filter(id => id !== problemId)
        : [...prev.problemIds, problemId],
    }));
  };

  const toggleExamProblem = (problemId: string) => {
    setExamForm(prev => ({
      ...prev,
      problemIds: prev.problemIds.includes(problemId)
        ? prev.problemIds.filter(id => id !== problemId)
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

  /* ==================== 课程体系 CRUD ==================== */

  const loadCourses = (classId: string) => {
    try {
      const stored = localStorage.getItem(`oj_courses_${classId}`);
      setCourses(stored ? JSON.parse(stored) : []);
    } catch {
      setCourses([]);
    }
  };

  const saveCourses = (classId: string, updated: Course[]) => {
    localStorage.setItem(`oj_courses_${classId}`, JSON.stringify(updated));
    setCourses(updated);
  };

  const addCourse = () => {
    if (!selectedClass || !courseForm.name.trim()) return;
    const newCourse: Course = {
      id: `course_${Date.now()}`,
      name: courseForm.name,
      description: courseForm.description,
      stages: [],
    };
    const updated = [...courses, newCourse];
    saveCourses(selectedClass.id, updated);
    setCourseForm({ name: '', description: '' });
    setShowCourseForm(false);
    setExpandedCourses(prev => new Set([...prev, newCourse.id]));
  };

  const deleteCourse = (courseId: string) => {
    if (!selectedClass || !confirm('确定要删除此课程吗？所有阶段和讲次将一并删除。')) return;
    const updated = courses.filter(c => c.id !== courseId);
    saveCourses(selectedClass.id, updated);
  };

  const addStage = (courseId: string) => {
    if (!selectedClass || !stageForm.name.trim()) return;
    const updated = updateCourseInList(courses, courseId, course => ({
      ...course,
      stages: [...course.stages, {
        id: `stage_${Date.now()}`,
        name: stageForm.name,
        order: course.stages.length + 1,
        sessions: [],
      }],
    }));
    saveCourses(selectedClass.id, updated);
    setStageForm({ name: '' });
    setShowStageForm(null);
  };

  const deleteStage = (courseId: string, stageId: string) => {
    if (!selectedClass || !confirm('确定要删除此阶段吗？所有讲次将一并删除。')) return;
    const updated = updateCourseInList(courses, courseId, course => ({
      ...course,
      stages: course.stages.filter(s => s.id !== stageId),
    }));
    saveCourses(selectedClass.id, updated);
  };

  const addSession = (courseId: string, stageId: string) => {
    if (!selectedClass || !sessionForm.name.trim()) return;
    const updated = updateCourseInList(courses, courseId, course =>
      updateStageInCourse(course, stageId, stage => ({
        ...stage,
        sessions: [...stage.sessions, {
          id: `session_${Date.now()}`,
          name: sessionForm.name,
          order: stage.sessions.length + 1,
          problemIds: [],
          materialText: sessionForm.materialText,
          examId: null,
        }],
      }))
    );
    saveCourses(selectedClass.id, updated);
    setSessionForm({ name: '', materialText: '' });
    setShowSessionForm(null);
  };

  const deleteSession = (courseId: string, stageId: string, sessionId: string) => {
    if (!selectedClass || !confirm('确定要删除此讲次吗？')) return;
    const updated = updateCourseInList(courses, courseId, course =>
      updateStageInCourse(course, stageId, stage => ({
        ...stage,
        sessions: stage.sessions.filter(sess => sess.id !== sessionId),
      }))
    );
    saveCourses(selectedClass.id, updated);
  };

  /** 课程讲次中切换题目选中状态 */
  const toggleCourseSessionProblem = (courseId: string, stageId: string, sessionId: string, problemId: string) => {
    if (!selectedClass) return;
    const updated = updateCourseInList(courses, courseId, course =>
      updateStageInCourse(course, stageId, stage =>
        updateSessionInStage(stage, sessionId, sess => ({
          ...sess,
          problemIds: sess.problemIds.includes(problemId)
            ? sess.problemIds.filter(id => id !== problemId)
            : [...sess.problemIds, problemId],
        }))
      )
    );
    saveCourses(selectedClass.id, updated);
  };

  /** 更新讲次资料文本 */
  const saveSessionMaterial = (courseId: string, stageId: string, sessionId: string) => {
    if (!selectedClass) return;
    const updated = updateCourseInList(courses, courseId, course =>
      updateStageInCourse(course, stageId, stage =>
        updateSessionInStage(stage, sessionId, sess => ({
          ...sess,
          materialText: materialEditText,
        }))
      )
    );
    saveCourses(selectedClass.id, updated);
    setEditingSessionMaterial(null);
  };

  /** 更新讲次关联考试 */
  const updateSessionExam = (courseId: string, stageId: string, sessionId: string, examId: string | null) => {
    if (!selectedClass) return;
    const updated = updateCourseInList(courses, courseId, course =>
      updateStageInCourse(course, stageId, stage =>
        updateSessionInStage(stage, sessionId, sess => ({
          ...sess,
          examId,
        }))
      )
    );
    saveCourses(selectedClass.id, updated);
  };

  /* ==================== 通用辅助 ==================== */

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

  const getDifficultyLabel = (d: string) =>
    d === 'EASY' ? '简单' : d === 'MEDIUM' ? '中等' : '困难';

  const getDifficultyColor = (d: string) =>
    d === 'EASY' ? 'bg-green-500/20 text-green-400'
    : d === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400'
    : 'bg-red-500/20 text-red-400';

  /* ==================== 知识树递归渲染 ==================== */

  const renderTreeNodes = (nodes: any[], depth: number) => (
    <>
      {nodes.map(node => (
        <div key={node.id}>
          <div
            className={`flex items-center gap-1.5 py-1.5 px-2 hover:bg-slate-600 rounded cursor-pointer transition-colors ${
              selectedTreeNode === node.id ? 'bg-slate-600/80 text-cyan-400' : 'text-slate-300'
            }`}
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
            onClick={() => handleTreeNodeClick(node)}
          >
            {node.children && node.children.length > 0 ? (
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                expandedTreeNodes.has(node.id) ? '' : '-rotate-90'
              }`} />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span className="text-sm truncate flex-1">{node.name}</span>
            <span className="text-xs text-slate-500 shrink-0">{node.problemCount ?? 0}题</span>
          </div>
          {node.children && node.children.length > 0 && expandedTreeNodes.has(node.id) &&
            renderTreeNodes(node.children, depth + 1)}
        </div>
      ))}
    </>
  );

  /* ==================== 题目选择器（搜索 + 知识树双Tab） ==================== */

  const renderProblemSelector = (
    selectedIds: string[],
    onToggle: (id: string) => void
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">选择题目</label>

      {/* Tab 切换栏 */}
      <div className="flex border-b border-slate-600 mb-3">
        <button
          onClick={() => setProblemSelectorTab('search')}
          className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            problemSelectorTab === 'search'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Search className="h-4 w-4 mr-1.5" />
          搜索选题
        </button>
        <button
          onClick={() => { setProblemSelectorTab('tree'); fetchKnowledgeTree(); }}
          className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            problemSelectorTab === 'tree'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <TreePine className="h-4 w-4 mr-1.5" />
          知识树选题
        </button>
      </div>

      {/* 搜索模式 */}
      {problemSelectorTab === 'search' && (
        <div>
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
              ].map(opt => (
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
                    checked={selectedIds.includes(problem.id)}
                    onChange={() => onToggle(problem.id)}
                    className="rounded border-slate-500 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-white text-sm">{problem.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ml-auto ${getDifficultyColor(problem.difficulty)}`}>
                    {getDifficultyLabel(problem.difficulty)}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* 知识树模式 */}
      {problemSelectorTab === 'tree' && (
        <div className="flex gap-4">
          {/* 左侧：知识树 */}
          <div className="w-1/2 max-h-72 overflow-y-auto bg-slate-700 rounded-lg p-2">
            {knowledgeTreeLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
              </div>
            ) : knowledgeTree.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">暂无知识树数据</p>
            ) : (
              renderTreeNodes(knowledgeTree, 0)
            )}
          </div>
          {/* 右侧：选中节点的题目列表 */}
          <div className="w-1/2 max-h-72 overflow-y-auto bg-slate-700 rounded-lg p-3 space-y-2">
            {!selectedTreeNode ? (
              <p className="text-slate-400 text-sm text-center py-4">点击左侧知识节点查看题目</p>
            ) : treeNodeProblemsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
              </div>
            ) : treeNodeProblems.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">该节点暂无关联题目</p>
            ) : (
              treeNodeProblems.map((problem: any) => (
                <label key={problem.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-600 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(problem.id)}
                    onChange={() => onToggle(problem.id)}
                    className="rounded border-slate-500 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-white text-sm">{problem.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ml-auto ${getDifficultyColor(problem.difficulty)}`}>
                    {getDifficultyLabel(problem.difficulty)}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <p className="text-sm text-cyan-400 mt-2">已选择 {selectedIds.length} 道题目</p>
      )}
    </div>
  );

  /* ==================== 课程体系 Tab 内容 ==================== */

  const renderCourseTab = () => {
    const findProblemTitle = (pid: string) => {
      const p = problemList.find((pp: any) => pp.id === pid);
      return p ? p.title : pid;
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">课程体系</h2>
          <button
            onClick={() => setShowCourseForm(true)}
            className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            新建课程
          </button>
        </div>

        {/* 新建课程表单 */}
        {showCourseForm && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">新建课程</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">课程名称</label>
                <input
                  type="text"
                  value={courseForm.name}
                  onChange={e => setCourseForm({ ...courseForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="如：数据结构基础"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">课程描述</label>
                <textarea
                  value={courseForm.description}
                  onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  rows={2}
                  placeholder="课程描述（可选）"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => { setShowCourseForm(false); setCourseForm({ name: '', description: '' }); }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={addCourse}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        )}

        {/* 课程列表 */}
        {courses.length === 0 && !showCourseForm ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <BookMarked className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">暂无课程</p>
            <p className="text-slate-500 mt-1 text-sm">点击"新建课程"按钮开始构建课程体系</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map(course => (
              <div key={course.id} className="bg-slate-800 rounded-xl shadow-xl overflow-hidden">
                {/* 课程头部 */}
                <div
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-750 transition-colors"
                  onClick={() => setExpandedCourses(prev => {
                    const next = new Set(prev);
                    if (next.has(course.id)) next.delete(course.id);
                    else next.add(course.id);
                    return next;
                  })}
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
                      expandedCourses.has(course.id) ? '' : '-rotate-90'
                    }`} />
                    <BookOpen className="h-5 w-5 text-cyan-400" />
                    <span className="text-lg font-semibold text-white">{course.name}</span>
                    {course.description && (
                      <span className="text-sm text-slate-400 ml-2">— {course.description}</span>
                    )}
                    <span className="text-xs text-slate-500 ml-2">
                      {course.stages.length} 个阶段
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteCourse(course.id); }}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="删除课程"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* 展开的课程内容：阶段列表 */}
                {expandedCourses.has(course.id) && (
                  <div className="border-t border-slate-700 px-6 py-4 space-y-3">
                    {course.stages.map(stage => (
                      <div key={stage.id} className="bg-slate-750 rounded-lg overflow-hidden">
                        {/* 阶段头部 */}
                        <div
                          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-700 transition-colors"
                          onClick={() => setExpandedStages(prev => {
                            const next = new Set(prev);
                            if (next.has(stage.id)) next.delete(stage.id);
                            else next.add(stage.id);
                            return next;
                          })}
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                              expandedStages.has(stage.id) ? '' : '-rotate-90'
                            }`} />
                            <FolderOpen className="h-4 w-4 text-yellow-400" />
                            <span className="font-medium text-slate-200">
                              阶段 {stage.order}：{stage.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {stage.sessions.length} 个讲次
                            </span>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteStage(course.id, stage.id); }}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                            title="删除阶段"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* 展开的阶段内容：讲次列表 */}
                        {expandedStages.has(stage.id) && (
                          <div className="border-t border-slate-700/50 px-4 py-3 space-y-2">
                            {stage.sessions.map(sess => (
                              <div key={sess.id} className="bg-slate-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <BookMarked className="h-4 w-4 text-purple-400" />
                                    <span className="font-medium text-white">
                                      讲次 {sess.order}：{sess.name}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => deleteSession(course.id, stage.id, sess.id)}
                                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                    title="删除讲次"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* 讲次信息标签 */}
                                <div className="flex items-center gap-3 text-sm mb-2">
                                  <span className="text-slate-400">
                                    题目: <span className="text-cyan-400">{sess.problemIds.length} 道</span>
                                  </span>
                                  <span className="text-slate-400">
                                    资料: {sess.materialText ? <span className="text-green-400">有</span> : <span className="text-slate-500">无</span>}
                                  </span>
                                  <span className="text-slate-400">
                                    考试: {sess.examId ? <span className="text-yellow-400">已关联</span> : <span className="text-slate-500">无</span>}
                                  </span>
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={() => {
                                      setEditingSessionProblems({
                                        courseId: course.id, stageId: stage.id, sessionId: sess.id,
                                      });
                                      setEditingSessionMaterial(null);
                                    }}
                                    className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 rounded transition-colors"
                                  >
                                    编辑题目
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingSessionMaterial({
                                        courseId: course.id, stageId: stage.id, sessionId: sess.id,
                                      });
                                      setMaterialEditText(sess.materialText);
                                      setEditingSessionProblems(null);
                                    }}
                                    className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 rounded transition-colors"
                                  >
                                    编辑资料
                                  </button>
                                  <select
                                    value={sess.examId || ''}
                                    onChange={e => updateSessionExam(
                                      course.id, stage.id, sess.id,
                                      e.target.value || null
                                    )}
                                    className="px-2 py-1 text-xs bg-slate-600 border border-slate-500 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                  >
                                    <option value="">关联考试...</option>
                                    {examList.map((ex: any) => (
                                      <option key={ex.id} value={ex.id}>{ex.title}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* 编辑题目面板 */}
                                {editingSessionProblems &&
                                  editingSessionProblems.courseId === course.id &&
                                  editingSessionProblems.stageId === stage.id &&
                                  editingSessionProblems.sessionId === sess.id && (
                                  <div className="mt-3 pt-3 border-t border-slate-600">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-slate-300">选择题目</span>
                                      <button
                                        onClick={() => setEditingSessionProblems(null)}
                                        className="text-slate-400 hover:text-white"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                    {/* 已选题目展示 */}
                                    {sess.problemIds.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-3">
                                        {sess.problemIds.map(pid => (
                                          <span
                                            key={pid}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs"
                                          >
                                            {findProblemTitle(pid)}
                                            <button
                                              onClick={() => toggleCourseSessionProblem(course.id, stage.id, sess.id, pid)}
                                              className="hover:text-red-400"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {/* 搜索添加题目 */}
                                    <div className="max-h-48 overflow-y-auto bg-slate-600 rounded-lg p-2 space-y-1">
                                      {problemList.map((problem: any) => (
                                        <label
                                          key={problem.id}
                                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-500 rounded cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={sess.problemIds.includes(problem.id)}
                                            onChange={() => toggleCourseSessionProblem(course.id, stage.id, sess.id, problem.id)}
                                            className="rounded border-slate-500 text-cyan-500 focus:ring-cyan-500"
                                          />
                                          <span className="text-white text-xs">{problem.title}</span>
                                          <span className={`text-xs px-1.5 py-0.5 rounded ml-auto ${getDifficultyColor(problem.difficulty)}`}>
                                            {getDifficultyLabel(problem.difficulty)}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* 编辑资料面板 */}
                                {editingSessionMaterial &&
                                  editingSessionMaterial.courseId === course.id &&
                                  editingSessionMaterial.stageId === stage.id &&
                                  editingSessionMaterial.sessionId === sess.id && (
                                  <div className="mt-3 pt-3 border-t border-slate-600">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-slate-300">编辑资料</span>
                                      <button
                                        onClick={() => setEditingSessionMaterial(null)}
                                        className="text-slate-400 hover:text-white"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <textarea
                                      value={materialEditText}
                                      onChange={e => setMaterialEditText(e.target.value)}
                                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                      rows={3}
                                      placeholder="输入讲次资料文本或链接..."
                                    />
                                    <button
                                      onClick={() => saveSessionMaterial(course.id, stage.id, sess.id)}
                                      className="mt-2 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors"
                                    >
                                      保存资料
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* 添加讲次表单 */}
                            {showSessionForm &&
                              showSessionForm.courseId === course.id &&
                              showSessionForm.stageId === stage.id ? (
                              <div className="bg-slate-700 rounded-lg p-4 mt-2">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="text"
                                    value={sessionForm.name}
                                    onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })}
                                    className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="讲次名称"
                                  />
                                  <button
                                    onClick={() => addSession(course.id, stage.id)}
                                    className="px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors"
                                  >
                                    添加
                                  </button>
                                  <button
                                    onClick={() => { setShowSessionForm(null); setSessionForm({ name: '', materialText: '' }); }}
                                    className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm rounded-lg transition-colors"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowSessionForm({ courseId: course.id, stageId: stage.id })}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                添加讲次
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 添加阶段表单 */}
                    {showStageForm && showStageForm === course.id ? (
                      <div className="bg-slate-750 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={stageForm.name}
                            onChange={e => setStageForm({ ...stageForm, name: e.target.value })}
                            className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="阶段名称"
                          />
                          <button
                            onClick={() => addStage(course.id)}
                            className="px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors"
                          >
                            添加
                          </button>
                          <button
                            onClick={() => { setShowStageForm(null); setStageForm({ name: '' }); }}
                            className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm rounded-lg transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowStageForm(course.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        添加阶段
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ==================== 页面渲染 ==================== */

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div>
        <button
          onClick={backToList}
          className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <X className="h-5 w-5 mr-2" />
          返回列表
        </button>

        <h1 className="text-3xl font-bold text-white mb-8">创建班级</h1>

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
              onClick={handleCreate}
              className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <Save className="h-5 w-5 mr-2" />
              创建班级
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
        </div>

        {/* Tab 栏：成员 / 作业 / 考试 / 课程体系 */}
        <div className="flex border-b border-slate-700 mb-6">
          {([
            { key: 'members' as DetailTab, label: '成员列表', icon: Users },
            { key: 'homework' as DetailTab, label: '作业管理', icon: ClipboardList },
            { key: 'exam' as DetailTab, label: '班级考试', icon: FileText },
            { key: 'course' as DetailTab, label: '课程体系', icon: BookMarked },
          ]).map(tab => (
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

        {/* ========== 成员列表 Tab ========== */}
        {activeTab === 'members' && (
          <div>
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">添加成员</h2>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">选择用户</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">-- 选择用户 --</option>
                    {availableUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email}) - {getRoleName(u.role)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">角色</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="STUDENT">学生</option>
                    <option value="TEACHER">教师</option>
                  </select>
                </div>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUserId}
                  className="flex items-center px-4 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  添加
                </button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">成员列表</h2>
              </div>

              {membersLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
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
                        const memberUser = member.user || member;
                        return (
                          <tr key={member.id || memberUser.id} className="hover:bg-slate-750 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-white font-medium">{memberUser.username}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-sm">{memberUser.email}</td>
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
                              <button
                                onClick={() => handleRemoveMember(memberUser.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="移除成员"
                              >
                                <X className="h-4 w-4" />
                              </button>
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

        {/* ========== 作业管理 Tab ========== */}
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
                  {renderProblemSelector(homeworkForm.problemIds, toggleHomeworkProblem)}
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
                    <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
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
                <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
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

        {/* ========== 班级考试 Tab ========== */}
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
                  {renderProblemSelector(examForm.problemIds, toggleExamProblem)}
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
                    <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
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
                <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
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
                                <><CheckCircle2 className="h-4 w-4 mr-1" />进行中</>
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

        {/* ========== 课程体系 Tab ========== */}
        {activeTab === 'course' && renderCourseTab()}
      </div>
    );
  }

  /* ========== 班级列表视图 ========== */
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
                    </div>
                  )}
                  {cls.description && (
                    <p className="text-slate-400 mt-2 text-sm line-clamp-2">{cls.description}</p>
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
                    <ChevronRight className="h-5 w-5" />
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
