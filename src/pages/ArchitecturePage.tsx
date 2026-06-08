import { useState } from "react";
import {
  Brain,
  Sparkles,
  Target,
  Shield,
  Eye,
  RotateCcw,
  Compass,
  Users,
  Lightbulb,
  MessageSquare,
  GitBranch,
  Route,
  BarChart3,
  Mic,
  Bug,
  Wand2,
  Code,
  Star,
  Trophy,
  Gem,
  Map,
  Building2,
  Heart,
  FlaskConical,
  Rocket,
  Calendar,
  Swords,
  ChevronDown,
  ChevronUp,
  Database,
  Cpu,
  Monitor,
  Layers,
} from "lucide-react";

// ============================================================
// 类型定义
// ============================================================

interface ModuleItem {
  icon: React.ReactNode;
  name: string;
  desc: string;
  trigger: string;
  input: string;
  output: string;
}

interface GameModule {
  icon: React.ReactNode;
  name: string;
  stats: string;
  details: string;
}

// ============================================================
// Tab 1: AI 辅导学习体系
// ============================================================

const aiPrinciples = [
  { icon: <Target className="w-6 h-6" />, title: "因材施教", desc: "基于学生画像动态调整难度与内容" },
  { icon: <Lightbulb className="w-6 h-6" />, title: "渐进引导", desc: "不直接给答案，分步骤引导思考" },
  { icon: <RotateCcw className="w-6 h-6" />, title: "闭环反馈", desc: "行为→分析→决策→展示→行为" },
  { icon: <Shield className="w-6 h-6" />, title: "可控边界", desc: "AI 输出受规则约束，防止越界" },
];

const aiModules: ModuleItem[] = [
  { icon: <Star className="w-5 h-5" />, name: "每日一题个性化推荐", desc: "根据薄弱点智能推题", trigger: "每日首次登录", input: "用户画像+历史记录", output: "个性化题目列表" },
  { icon: <Lightbulb className="w-5 h-5" />, name: "渐进式解题提示", desc: "分层提示引导独立思考", trigger: "用户请求提示", input: "题目+已有代码+错误信息", output: "分层提示（方向→思路→伪代码）" },
  { icon: <MessageSquare className="w-5 h-5" />, name: "AI 学伴对话", desc: "苏格拉底式问答辅导", trigger: "用户主动提问", input: "上下文+用户问题+知识水平", output: "引导性回答" },
  { icon: <GitBranch className="w-5 h-5" />, name: "知识树自动归类", desc: "题目自动关联知识节点", trigger: "新题入库时", input: "题目内容+标签", output: "知识点映射" },
  { icon: <Route className="w-5 h-5" />, name: "AI 学习路径", desc: "动态规划个人学习路线", trigger: "完成阶段评估后", input: "能力画像+目标", output: "路径规划+里程碑" },
  { icon: <BarChart3 className="w-5 h-5" />, name: "能力画像分析", desc: "多维度评估编程能力", trigger: "每次提交后更新", input: "提交记录+正确率+时间", output: "雷达图数据" },
  { icon: <Mic className="w-5 h-5" />, name: "AI 面试模拟", desc: "模拟真实技术面试场景", trigger: "用户主动选择", input: "目标岗位+能力水平", output: "面试对话+评分反馈" },
  { icon: <Bug className="w-5 h-5" />, name: "AI Bug 猎手", desc: "引导定位和修复代码缺陷", trigger: "用户提交含 Bug 代码", input: "错误代码+测试结果", output: "定位提示+修复建议" },
  { icon: <Wand2 className="w-5 h-5" />, name: "AI 题目生成", desc: "按知识点自动生成题目", trigger: "管理员/系统触发", input: "知识点+难度+题型", output: "完整题目+测试用例" },
  { icon: <Code className="w-5 h-5" />, name: "代码解释/诊断/优化", desc: "代码的多角度 AI 分析", trigger: "用户选中代码触发", input: "代码片段+语言", output: "解释/问题诊断/优化建议" },
];

// 数据流各层定义
const dataFlowLayers = [
  { label: "学生端", sub: "行为产生", color: "from-cyan-500 to-cyan-600", icon: <Monitor className="w-5 h-5" /> },
  { label: "行为收集层", sub: "数据存储", color: "from-blue-500 to-blue-600", icon: <Database className="w-5 h-5" /> },
  { label: "分析计算层", sub: "画像 / 规则", color: "from-purple-500 to-purple-600", icon: <Cpu className="w-5 h-5" /> },
  { label: "AI 决策层", sub: "调用 LLM", color: "from-pink-500 to-pink-600", icon: <Brain className="w-5 h-5" /> },
  { label: "应用层", sub: "前端展示", color: "from-amber-500 to-amber-600", icon: <Layers className="w-5 h-5" /> },
];

function AITab() {
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  return (
    <div className="space-y-12">
      {/* 设计理念 */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-cyan-400" />
          设计理念
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {aiPrinciples.map((p, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 hover:border-cyan-500/50 transition-colors">
              <div className="text-cyan-400 mb-3">{p.icon}</div>
              <h3 className="text-white font-semibold mb-1">{p.title}</h3>
              <p className="text-slate-400 text-sm">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 数据流架构图 */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-purple-400" />
          数据流架构
        </h2>
        <div className="relative flex flex-col items-center gap-2">
          {dataFlowLayers.map((layer, i) => (
            <div key={i} className="w-full max-w-2xl">
              {/* 层节点 */}
              <div className={`relative bg-gradient-to-r ${layer.color} rounded-lg p-4 flex items-center gap-3 shadow-lg`}>
                <div className="bg-white/20 rounded-lg p-2">{layer.icon}</div>
                <div>
                  <div className="text-white font-semibold">{layer.label}</div>
                  <div className="text-white/70 text-sm">{layer.sub}</div>
                </div>
              </div>
              {/* 箭头连线 */}
              {i < dataFlowLayers.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-4 bg-slate-600" />
                    <svg width="12" height="8" viewBox="0 0 12 8" className="text-slate-500">
                      <path d="M6 8L0 0h12L6 8z" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 模块网格 */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Brain className="w-6 h-6 text-pink-400" />
          AI 模块
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aiModules.map((m, i) => (
            <div
              key={i}
              className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all cursor-pointer"
              onClick={() => setExpandedModule(expandedModule === i ? null : i)}
            >
              <div className="p-4 flex items-start gap-3">
                <div className="text-purple-400 mt-0.5 shrink-0">{m.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium text-sm">{m.name}</h3>
                    {expandedModule === i ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-1">{m.desc}</p>
                </div>
              </div>
              {/* 展开详情 */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  expandedModule === i ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-4 pb-4 pt-2 border-t border-slate-700 space-y-2 text-xs">
                  <div><span className="text-cyan-400 font-medium">触发场景：</span><span className="text-slate-300">{m.trigger}</span></div>
                  <div><span className="text-blue-400 font-medium">数据输入：</span><span className="text-slate-300">{m.input}</span></div>
                  <div><span className="text-green-400 font-medium">输出：</span><span className="text-slate-300">{m.output}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Tab 2: 游戏性学习体系
// ============================================================

const gamePrinciples = [
  { icon: <Eye className="w-6 h-6" />, title: "成长可见", desc: "所有进步都有可量化的视觉呈现" },
  { icon: <RotateCcw className="w-6 h-6" />, title: "正反馈循环", desc: "做题→奖励→强化→更多做题" },
  { icon: <Compass className="w-6 h-6" />, title: "自由探索", desc: "多条路径可达目标，不强制线性" },
  { icon: <Users className="w-6 h-6" />, title: "社交驱动", desc: "排行榜、组队、竞赛激发动力" },
];

const gameModules: GameModule[] = [
  { icon: <Star className="w-5 h-5" />, name: "积分与等级", stats: "7级体系 · 积分倍率1.0-2.0x", details: "青铜→白银→黄金→铂金→钻石→大师→传奇。每级解锁专属特权，高等级享受积分加成。" },
  { icon: <Map className="w-5 h-5" />, name: "编程星途", stats: "星图→星域→星球→挑战", details: "以宇宙为主题的知识地图。每个星球对应一组题目，完成星球点亮星域，解锁新区域。" },
  { icon: <Building2 className="w-5 h-5" />, name: "星球建设", stats: "5种建筑 · 3级升级 · 基地画布", details: "用积分建造个人星球基地。建筑提供被动加成（经验+10%、材料掉落+15%等），可自由布局。" },
  { icon: <Heart className="w-5 h-5" />, name: "太空宠物", stats: "5种宠物 · 4个进化阶段 · 心情系统", details: "宠物蛋→幼年→成年→究极。每天互动保持心情，心情影响加成效果。宠物可携带探险。" },
  { icon: <FlaskConical className="w-5 h-5" />, name: "材料合成", stats: "12种材料 · 5稀有度 · 7个配方", details: "做题掉落基础材料，按配方合成高级材料。稀有材料用于宠物进化和建筑升级。" },
  { icon: <Rocket className="w-5 h-5" />, name: "星际探险", stats: "5种任务 · 30min-8h", details: "派遣宠物执行探险任务。根据时长和难度获得材料、积分、稀有物品奖励。" },
  { icon: <Calendar className="w-5 h-5" />, name: "签到与宝箱", stats: "连续天数奖励 · 里程碑", details: "每日签到获得基础奖励，连续签到叠加倍率。7/14/30天里程碑解锁稀有宝箱。" },
  { icon: <Swords className="w-5 h-5" />, name: "社交竞赛", stats: "排位/友谊/团队 · 12个成就", details: "实时匹配对手，限时解题对决。赛季排名发放奖励，达成成就解锁称号和装饰。" },
];

// 系统关联节点位置（用于 SVG 连线图）
const relationNodes = [
  { id: "solve", label: "做题系统", x: 50, y: 15 },
  { id: "score", label: "积分系统", x: 25, y: 40 },
  { id: "level", label: "等级系统", x: 10, y: 65 },
  { id: "material", label: "材料系统", x: 50, y: 45 },
  { id: "craft", label: "合成系统", x: 75, y: 45 },
  { id: "building", label: "建筑系统", x: 90, y: 65 },
  { id: "pet", label: "宠物系统", x: 35, y: 70 },
  { id: "explore", label: "探险系统", x: 60, y: 70 },
  { id: "boost", label: "学习加成", x: 50, y: 92 },
];

const relationEdges = [
  { from: "solve", to: "score" },
  { from: "score", to: "level" },
  { from: "solve", to: "material" },
  { from: "material", to: "craft" },
  { from: "craft", to: "building" },
  { from: "pet", to: "explore" },
  { from: "explore", to: "pet" },
  { from: "level", to: "boost" },
  { from: "building", to: "boost" },
  { from: "pet", to: "boost" },
  { from: "explore", to: "boost" },
  { from: "score", to: "boost" },
];

function GameTab() {
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  return (
    <div className="space-y-12">
      {/* 设计理念 */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-400" />
          设计理念
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {gamePrinciples.map((p, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 hover:border-amber-500/50 transition-colors">
              <div className="text-amber-400 mb-3">{p.icon}</div>
              <h3 className="text-white font-semibold mb-1">{p.title}</h3>
              <p className="text-slate-400 text-sm">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 核心循环图 */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-green-400" />
          正反馈核心循环
        </h2>
        <div className="flex justify-center">
          <div className="relative w-80 h-80">
            {/* 循环节点 - 圆形布局 */}
            {[
              { label: "做题", angle: -90, color: "bg-cyan-500" },
              { label: "积分+材料", angle: -18, color: "bg-blue-500" },
              { label: "升级/合成", angle: 54, color: "bg-purple-500" },
              { label: "解锁加成", angle: 126, color: "bg-amber-500" },
              { label: "动力提升", angle: 198, color: "bg-green-500" },
            ].map((node, i) => {
              const rad = (node.angle * Math.PI) / 180;
              const r = 120;
              const cx = 160 + r * Math.cos(rad);
              const cy = 160 + r * Math.sin(rad);
              return (
                <div
                  key={i}
                  className={`absolute ${node.color} rounded-full w-20 h-20 flex items-center justify-center text-white text-xs font-bold shadow-lg`}
                  style={{ left: cx - 40, top: cy - 40 }}
                >
                  {node.label}
                </div>
              );
            })}
            {/* 中心旋转动画 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 animate-spin-slow" />
            </div>
            {/* SVG 箭头连线 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 320">
              {[
                { from: -90, to: -18 },
                { from: -18, to: 54 },
                { from: 54, to: 126 },
                { from: 126, to: 198 },
                { from: 198, to: -90 },
              ].map((edge, i) => {
                const r = 120;
                const cx = 160, cy = 160;
                const midAngle = ((edge.from + edge.to) / 2) * Math.PI / 180;
                const fromRad = (edge.from * Math.PI) / 180;
                const toRad = (edge.to * Math.PI) / 180;
                const x1 = cx + (r + 10) * Math.cos(fromRad + 0.15);
                const y1 = cy + (r + 10) * Math.sin(fromRad + 0.15);
                const x2 = cx + (r + 10) * Math.cos(toRad - 0.15);
                const y2 = cy + (r + 10) * Math.sin(toRad - 0.15);
                const mx = cx + (r + 30) * Math.cos(midAngle);
                const my = cy + (r + 30) * Math.sin(midAngle);
                return (
                  <path
                    key={i}
                    d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
                    fill="none"
                    stroke="rgba(148,163,184,0.4)"
                    strokeWidth="1.5"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="rgba(148,163,184,0.6)" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* 系统模块网格 */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          游戏化模块
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {gameModules.map((m, i) => (
            <div
              key={i}
              className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all cursor-pointer"
              onClick={() => setExpandedModule(expandedModule === i ? null : i)}
            >
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-amber-400">{m.icon}</div>
                  <h3 className="text-white font-medium text-sm">{m.name}</h3>
                </div>
                <p className="text-slate-400 text-xs mb-2">{m.stats}</p>
                <div className="flex justify-end">
                  {expandedModule === i ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  expandedModule === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-4 pb-4 pt-2 border-t border-slate-700 text-xs text-slate-300">
                  {m.details}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 系统关联图 */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Gem className="w-6 h-6 text-indigo-400" />
          系统关联
        </h2>
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-6 overflow-hidden">
          <div className="relative w-full" style={{ paddingBottom: "60%" }}>
            {/* SVG 连线 */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {relationEdges.map((edge, i) => {
                const from = relationNodes.find(n => n.id === edge.from)!;
                const to = relationNodes.find(n => n.id === edge.to)!;
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="rgba(99,102,241,0.4)"
                    strokeWidth="0.4"
                    strokeDasharray={edge.from === "pet" && edge.to === "explore" ? "" : ""}
                  />
                );
              })}
              {/* 箭头方向指示 - 小圆点在终点 */}
              {relationEdges.map((edge, i) => {
                const to = relationNodes.find(n => n.id === edge.to)!;
                const from = relationNodes.find(n => n.id === edge.from)!;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const px = to.x - (dx / len) * 5;
                const py = to.y - (dy / len) * 5;
                return <circle key={i} cx={px} cy={py} r="0.8" fill="rgba(99,102,241,0.7)" />;
              })}
            </svg>
            {/* 节点标签 */}
            {relationNodes.map((node) => (
              <div
                key={node.id}
                className={`absolute text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap -translate-x-1/2 -translate-y-1/2 ${
                  node.id === "boost"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : node.id === "solve"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                }`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                {node.label}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// 主页面
// ============================================================

export function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState<"ai" | "game">("ai");

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 页头 */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">系统架构</h1>
          {/* Tab 切换 */}
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "ai"
                  ? "bg-cyan-500 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI 辅导学习体系
              </span>
            </button>
            <button
              onClick={() => setActiveTab("game")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "game"
                  ? "bg-amber-500 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                游戏性学习体系
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "ai" ? <AITab /> : <GameTab />}
      </main>

      {/* 自定义动画 */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}
