# OJ在线评测系统 - 功能升级设计方案

**文档版本**: v1.0  
**创建日期**: 2026-05-09  
**项目**: OJ在线评测系统功能扩展

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构设计](#2-系统架构设计)
3. [数据模型设计](#3-数据模型设计)
4. [核心功能模块设计](#4-核心功能模块设计)
5. [API设计](#5-api设计)
6. [实时通信设计](#6-实时通信设计)
7. [前端页面结构](#7-前端页面结构)
8. [AI功能集成](#8-ai功能集成)
9. [安全设计](#9-安全设计)
10. [实现优先级](#10-实现优先级)

---

## 1. 项目概述

### 1.1 需求背景

为现有OJ在线评测系统增加以下核心功能：

1. **题目管理增强** - 支持选择题、填空题上传和答案配置
2. **题解内嵌** - 题解作为题目的子信息，无需单独创建
3. **实时在线状态** - 查看同时在线人数
4. **匹配对战系统** - 1v1实时对战、排行榜挑战、组队竞赛
5. **积分系统** - 难度加权积分、等级系统、对战积分
6. **知识树管理** - AI解析文件生成知识树、题目自动归类
7. **AI自动化** - AI生成测试样例、AI生成题解
8. **考试系统** - 作业模式、限时考试、自动监考、考试分析
9. **实时评测** - 在线提交、实时判题、自动积分

### 1.2 设计原则

- **模块化** - 高度解耦，便于独立开发和测试
- **可扩展** - 预留插件接口，支持功能扩展
- **实时性** - WebSocket支持即时通信
- **AI驱动** - 智能化题目生成、归类、分析
- **用户体验** - 流畅的交互体验，即时反馈

---

## 2. 系统架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (React + TS)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│  │ 主页/题库 │ │ 做题页面 │ │ 管理后台 │ │ 对战大厅 │ │ 考试页 │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘ │
└────────┼───────────┼───────────┼───────────┼───────────┼──────┘
         │           │           │           │           │
         └───────────┴─────┬─────┴───────────┴───────────┘
                          │ WebSocket + REST API
         ┌────────────────┴────────────────┐
         │          API 网关层               │
         │   (认证 / 鉴权 / 限流 / 路由)     │
         └────────────────┬────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
┌───┴────┐          ┌────┴─────┐          ┌───┴────┐
│ 用户模块│          │ 题目模块  │          │ 考试模块│
└───┬────┘          └────┬─────┘          └───┬────┘
    │                     │                    │
┌───┴────┐          ┌────┴─────┐          ┌───┴────┐
│ 积分模块│          │ 知识树模块│          │对战模块 │
└───┬────┘          └────┬─────┘          └───┬────┘
    │                     │                    │
┌───┴─────────────────────┴────────────────────┴───┐
│                    AI 服务层                      │
│   (知识树生成 / 题目归类 / 测试样例生成 / 题解生成)│
└─────────────────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │           数据存储层               │
         │  SQLite │ Redis(Sessions) │ 文件存储│
         └─────────────────────────────────┘
```

### 2.2 技术栈升级

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 保持现有技术栈 |
| 状态管理 | Zustand + React Query | 增加数据获取和缓存 |
| 实时通信 | Socket.io | 实时对战、在线状态 |
| 后端 | Express.js + TypeScript | 保持现有技术栈 |
| 数据库 | SQLite → PostgreSQL | 生产环境升级 |
| 缓存 | Redis | 会话、实时数据缓存 |
| 文件存储 | 本地 → OSS | AI生成内容存储 |
| AI服务 | OpenAI API | 知识树、题目生成 |

---

## 3. 数据模型设计

### 3.1 实体关系图

```
User (用户)
├── id: UUID
├── username: String
├── email: String
├── password: String (bcrypt加密)
├── role: Enum [ADMIN, STUDENT, TEACHER]
├── avatar: String?
├── points: Int (积分)
├── level: Int (等级)
├── rank: Int (排行榜)
├── createdAt: DateTime
├── isOnline: Boolean (实时状态)
└── sessions: Session[] (在线会话)

KnowledgeTree (知识树)
├── id: UUID
├── name: String (根节点名)
├── description: String?
├── parentId: UUID? (父节点)
├── level: Int (层级 1或2)
├── order: Int (排序)
├── problems: Problem[] (关联题目)
└── children: KnowledgeTree[] (子节点)

Problem (题目) - 扩展
├── id: UUID
├── title: String
├── description: String
├── type: Enum [PROGRAMMING, CHOICE, FILL_BLANK]
├── difficulty: Enum [EASY, MEDIUM, HARD]
├── tags: String[] → 改为 knowledgeTreeId (知识树关联)
├── testCases: JSON → 扩展支持AI生成
├── timeLimit: Int
├── memoryLimit: Int
├── choices: JSON? (选择题选项)
├── correctAnswer: String? (答案)
├── fillBlanks: JSON? (填空题答案)
├── solution: JSON? (内嵌题解)
├── aiGeneratedTestCases: Boolean (AI生成标记)
├── aiGeneratedSolution: Boolean (AI生成标记)
├── createdAt: DateTime
├── updatedAt: DateTime
├── submissions: Submission[]
└── knowledgeTree: KnowledgeTree (关系)

Exam (考试)
├── id: UUID
├── title: String
├── description: String
├── type: Enum [HOMEWORK, TIMED_EXAM]
├── duration: Int (分钟)
├── startTime: DateTime (作业开始时间)
├── endTime: DateTime (截止时间)
├── enableProctoring: Boolean (监考开关)
├── questions: ExamQuestion[] (关联题目)
├── attempts: ExamAttempt[] (学生尝试)
├── createdBy: UUID (创建者)
└── createdAt: DateTime

ExamQuestion (考试题目关联)
├── id: UUID
├── examId: UUID
├── problemId: UUID
├── order: Int (题目顺序)
└── points: Int (分值)

ExamAttempt (考试记录)
├── id: UUID
├── examId: UUID
├── userId: UUID
├── startTime: DateTime (开始时间)
├── endTime: DateTime? (提交时间)
├── score: Int?
├── status: Enum [IN_PROGRESS, SUBMITTED, GRADED]
├── answers: JSON (学生答案)
├── proctoringLogs: JSON (监控日志)
└── violations: JSON (违规记录)

Match (对战)
├── id: UUID
├── type: Enum [1V1_RANKED, 1V1_FRIENDLY, GROUP_ARENA]
├── status: Enum [WAITING, IN_PROGRESS, COMPLETED, CANCELLED]
├── participants: MatchParticipant[]
├── problems: Problem[] (对战题目)
├── currentProblemIndex: Int
├── startTime: DateTime
├── endTime: DateTime?
├── winnerId: UUID?
└── rewards: JSON (积分奖励)

MatchParticipant (对战参与者)
├── id: UUID
├── matchId: UUID
├── userId: UUID
├── score: Int
├── correctCount: Int
├── totalTime: Int (总用时ms)
├── isWinner: Boolean
└── submissions: Submission[]

Session (在线会话)
├── id: UUID
├── userId: UUID
├── socketId: String
├── connectedAt: DateTime
├── lastActivity: DateTime
└── ip: String

Achievement (成就/徽章)
├── id: UUID
├── name: String
├── description: String
├── icon: String
├── criteria: JSON (达成条件)
├── points: Int (奖励积分)
└── users: UserAchievement[]

UserAchievement (用户成就)
├── id: UUID
├── userId: UUID
├── achievementId: UUID
├── earnedAt: DateTime
└── progress: JSON (当前进度)

LevelConfig (等级配置)
├── id: UUID
├── level: Int
├── name: String (称号)
├── minPoints: Int (最低积分)
├── maxPoints: Int (最高积分)
├── privileges: JSON (特权)
└── icon: String
```

### 3.2 知识树数据结构

```typescript
interface KnowledgeNode {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  level: 1 | 2;  // 只支持两层
  order: number;
  problemCount: number;
  children?: KnowledgeNode[];
}
```

---

## 4. 核心功能模块设计

### 4.1 题目管理系统

#### 4.1.1 上传与导入

**支持格式:**
- 手动创建 (Web表单)
- 批量导入 (txt, pdf)

**导入流程:**
```
用户上传文件 → AI解析 → 生成题目预览 → 用户确认 → 保存到数据库
```

**AI解析提示词:**
```
请分析以下文本内容，提取题目信息：
1. 识别题目类型（编程题、选择题、填空题）
2. 提取题目描述
3. 识别正确答案
4. 生成测试样例（如适用）

文本内容：
{file_content}
```

#### 4.1.2 题解内嵌

题解作为题目的JSON字段，不再单独创建表：

```typescript
interface ProblemSolution {
  title: string;
  content: string;  // Markdown格式
  code?: string;
  complexity?: {
    time: string;  // O(n)
    space: string; // O(n)
  };
  keyPoints?: string[];
  generatedBy: 'AI' | 'MANUAL';
  generatedAt: DateTime;
}
```

#### 4.1.3 AI生成测试样例

**流程:**
```
管理员触发AI生成 → 发送题目信息给AI → AI返回测试用例 → 用户确认 → 保存
```

**AI提示词:**
```
请为以下编程题生成5个测试用例（包括边界条件）：

题目：{problem_title}
描述：{problem_description}

请返回JSON格式：
{
  "testCases": [
    {"input": "...", "output": "...", "isSample": true},
    ...
  ]
}
```

#### 4.1.4 AI生成题解

**流程:**
```
管理员触发AI生成题解 → 发送题目信息 → AI返回题解 → 自动填充到题目
```

**AI提示词:**
```
请为以下题目生成详细的题解：

题目：{problem_title}
描述：{problem_description}

请返回JSON格式：
{
  "title": "解题思路",
  "content": "详细解题步骤...",
  "code": "参考代码（如果适用）",
  "complexity": {"time": "O(n)", "space": "O(n)"},
  "keyPoints": ["关键点1", "关键点2"]
}
```

### 4.2 知识树管理系统

#### 4.2.1 知识树结构

```typescript
// 两层结构示例
const knowledgeTree = {
  id: "1",
  name: "数据结构与算法",
  description: "编程基础知识点",
  level: 1,
  children: [
    {
      id: "1-1",
      name: "数组与链表",
      description: "线性表数据结构",
      parentId: "1",
      level: 2,
      children: []
    },
    {
      id: "1-2",
      name: "树与图",
      description: "非线性数据结构",
      parentId: "1",
      level: 2,
      children: []
    }
  ]
}
```

#### 4.2.2 文件导入生成知识树

**流程:**
```
上传txt/pdf文件 → AI解析内容 → 识别知识主题 → 生成两层知识树 → 用户编辑确认
```

**AI提示词:**
```
请分析以下文本，识别其中的知识点，并生成一个两层结构的知识树。

要求：
1. 第一层：主要知识分类（如：数据结构、算法、编程语言等）
2. 第二层：具体的知识点
3. 返回JSON格式

文本内容：
{file_content}

返回格式：
{
  "knowledgeTree": {
    "name": "知识体系",
    "children": [
      {
        "name": "分类1",
        "children": [{"name": "知识点1"}, {"name": "知识点2"}]
      }
    ]
  }
}
```

#### 4.2.3 题目自动归入知识树

**流程:**
```
创建/编辑题目时 → 管理员输入或AI分析 → 自动推荐知识树节点 → 确认关联
```

**AI推荐提示词:**
```
请分析以下题目，判断它属于哪些知识节点：

题目：{problem_title}
描述：{problem_description}
类型：{problem_type}

请从以下知识树中选择最合适的节点ID：
{existing_knowledge_tree}

返回格式：
{
  "recommendedNodeIds": ["node-id-1", "node-id-2"],
  "reason": "推荐理由"
}
```

### 4.3 积分系统

#### 4.3.1 积分规则

| 行为 | 积分变化 | 说明 |
|------|---------|------|
| 完成简单题 | +5 | 编程题、选择、填空 |
| 完成中等题 | +10 | 编程题、选择、填空 |
| 完成困难题 | +20 | 编程题、选择、填空 |
| 首次通过 | +5 | 每题首次AC奖励 |
| 对战获胜 | +15 | 1v1排位赛 |
| 对战失败 | -5 | 排位赛失败扣分 |
| 友谊赛获胜 | +5 | 友谊赛奖励较少 |
| 考试满分 | +50 | 完成考试且满分 |
| 考试及格 | +20 | 完成考试且及格 |
| 连续登录 | +10 | 每日首次登录 |

#### 4.3.2 等级系统

```typescript
const levels = [
  { level: 1, name: "青铜", minPoints: 0, maxPoints: 100 },
  { level: 2, name: "白银", minPoints: 101, maxPoints: 300 },
  { level: 3, name: "黄金", minPoints: 301, maxPoints: 600 },
  { level: 4, name: "铂金", minPoints: 601, maxPoints: 1000 },
  { level: 5, name: "钻石", minPoints: 1001, maxPoints: 2000 },
  { level: 6, name: "大师", minPoints: 2001, maxPoints: 5000 },
  { level: 7, name: "王者", minPoints: 5001, maxPoints: null },
];
```

#### 4.3.3 成就系统

```typescript
const achievements = [
  { name: "初出茅庐", description: "完成第一道题", criteria: { problemsCompleted: 1 } },
  { name: "小试牛刀", description: "完成10道题", criteria: { problemsCompleted: 10 } },
  { name: "连胜达人", description: "对战5连胜", criteria: { matchWinStreak: 5 } },
  { name: "学霸", description: "累计积分达到1000", criteria: { totalPoints: 1000 } },
  { name: "全对通过", description: "一次性AC 10道题", criteria: { consecutiveAC: 10 } },
];
```

### 4.4 对战系统

#### 4.4.1 1v1实时对战

**流程:**
```
匹配 → 等待对手 → 开始 → 轮流答题 → 结算 → 积分变化
```

**实时事件:**
```typescript
// 服务器推送
{
  event: "match_start",
  data: {
    matchId: "xxx",
    opponent: { username: "xxx", avatar: "xxx" },
    totalProblems: 5,
    timeLimit: 300 // 秒
  }
}

{
  event: "problem_update",
  data: {
    currentProblem: 1,
    problem: { ... },
    yourScore: 10,
    opponentScore: 0,
    yourTime: 30,
    opponentTime: null // 对手未完成
  }
}

{
  event: "answer_submitted",
  data: {
    correct: true,
    yourScore: 20,
    opponentScore: 10,
    timeBonus: 5
  }
}
```

#### 4.4.2 排行榜挑战

**类型:**
- 天梯排行榜 (按积分排序)
- 周排行榜 (本周积分)
- 成就排行榜 (按成就数)

#### 4.4.3 组队竞赛

**配置:**
- 房间容量: 2-10人
- 队伍数量: 2-5队
- 题目数量: 5-20道
- 计分规则: 队伍总分 = Σ(个人得分) × 团队系数

### 4.5 考试系统

#### 4.5.1 作业模式

**特性:**
- 有开始和截止时间
- 可设置是否允许逾期提交
- 提交后立即显示成绩（可选）
- 老师可查看所有学生提交

#### 4.5.2 限时考试

**特性:**
- 学生点击"开始考试"后计时
- 时间到自动提交
- 禁止切换页面（可选）
- 禁止复制粘贴（可选）

#### 4.5.3 自动监考

**监控项:**
```typescript
interface ProctoringLog {
  timestamp: Date;
  event: "FOCUS_LOST" | "TAB_SWITCH" | "COPY_ATTEMPT" | "PASTE_ATTEMPT" | "RIGHT_CLICK";
  details: string;
}

interface Violation {
  type: string;
  count: number;
  severity: "WARNING" | "VIOLATION" | "CHEATING";
  autoSubmit: boolean; // 严重违规自动提交
}
```

#### 4.5.4 考试分析

**完成后显示:**
- 成绩总分
- 每题正确性
- 用时分析
- 薄弱知识点推荐
- 正确答案对比（可设置）

---

## 5. API设计

### 5.1 RESTful API

#### 用户与认证
```
POST   /api/auth/register      - 注册
POST   /api/auth/login         - 登录
POST   /api/auth/logout        - 登出
GET    /api/auth/me            - 当前用户
PATCH  /api/auth/points        - 更新积分（内部）
```

#### 题目管理
```
GET    /api/problems                    - 题目列表
GET    /api/problems/:id                - 题目详情
POST   /api/problems                    - 创建题目
PUT    /api/problems/:id                - 更新题目
DELETE /api/problems/:id                - 删除题目
POST   /api/problems/import             - 导入题目（文件）
POST   /api/problems/:id/ai-generate-testcases  - AI生成测试样例
POST   /api/problems/:id/ai-generate-solution   - AI生成题解
```

#### 知识树
```
GET    /api/knowledge-tree              - 获取知识树
POST   /api/knowledge-tree              - 创建知识树
PUT    /api/knowledge-tree/:id          - 更新节点
DELETE /api/knowledge-tree/:id          - 删除节点
POST   /api/knowledge-tree/import       - 从文件导入知识树
POST   /api/knowledge-tree/ai-classify  - AI自动归类题目
```

#### 对战
```
GET    /api/matches                     - 对战列表
GET    /api/matches/:id                 - 对战详情
POST   /api/matches/1v1/match           - 开始1v1匹配
POST   /api/matches/1v1/challenge/:userId - 挑战用户
POST   /api/matches/group/create        - 创建组队房间
POST   /api/matches/group/join/:roomId  - 加入组队房间
GET    /api/matches/leaderboard         - 排行榜
```

#### 考试
```
GET    /api/exams                       - 考试列表
GET    /api/exams/:id                   - 考试详情
POST   /api/exams                       - 创建考试
PUT    /api/exams/:id                   - 更新考试
DELETE /api/exams/:id                   - 删除考试
POST   /api/exams/:id/start             - 开始考试
POST   /api/exams/:id/submit            - 提交考试
GET    /api/exams/:id/result            - 考试结果
GET    /api/exams/:id/analytics         - 考试分析
```

#### 积分与成就
```
GET    /api/users/:id/points            - 用户积分
GET    /api/users/:id/achievements      - 用户成就
GET    /api/achievements               - 全部成就
GET    /api/leaderboard                - 总排行榜
```

#### 在线状态
```
GET    /api/online/count                - 在线人数
GET    /api/online/users                - 在线用户列表
```

### 5.2 WebSocket事件

#### 客户端 → 服务器
```typescript
// 认证
socket.emit("auth", { token: "jwt" });

// 加入对战匹配队列
socket.emit("match:join", { type: "1v1" });

// 取消匹配
socket.emit("match:cancel");

// 提交答案
socket.emit("match:answer", { 
  matchId: "xxx", 
  problemIndex: 0, 
  answer: "xxx",
  time: 30000 
});

// 考试监控
socket.emit("exam:heartbeat", { examId: "xxx" });
```

#### 服务器 → 客户端
```typescript
// 在线状态
socket.on("online:count", (count: number) => {});

// 匹配成功
socket.on("match:found", (data: MatchStart) => {});

// 对战更新
socket.on("match:problem", (data: ProblemUpdate) => {});
socket.on("match:score", (data: ScoreUpdate) => {});

// 对战结束
socket.on("match:end", (data: MatchResult) => {});

// 考试监控警告
socket.on("exam:warning", (data: ProctoringWarning) => {});
```

---

## 6. 实时通信设计

### 6.1 Socket.io架构

```typescript
// server/socket/index.ts
import { Server } from "socket.io";

export function setupSocket(server: any) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true
    }
  });

  // 在线用户管理
  const onlineUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>
  const socketToUser = new Map<string, string>();     // socketId -> userId

  io.use(authMiddleware);  // JWT验证

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    
    // 管理在线状态
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);
    socketToUser.set(socket.id, userId);

    // 广播在线人数
    io.emit("online:count", onlineUsers.size);

    // 考试心跳
    socket.on("exam:heartbeat", handleExamHeartbeat);

    // 对战事件
    socket.on("match:join", handleMatchJoin);
    socket.on("match:cancel", handleMatchCancel);
    socket.on("match:answer", handleMatchAnswer);

    socket.on("disconnect", () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
      socketToUser.delete(socket.id);
      io.emit("online:count", onlineUsers.size);
    });
  });

  return io;
}
```

### 6.2 对战匹配算法

```typescript
// 简单基于积分的匹配
async function findOpponent(userId: string, userPoints: number) {
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: userId },
      isOnline: true,
      // 在±100积分范围内搜索
      points: {
        gte: userPoints - 100,
        lte: userPoints + 100
      },
      matchStatus: "WAITING"
    },
    take: 10
  });

  // 选择积分最接近的对手
  return candidates.sort((a, b) => 
    Math.abs(a.points - userPoints) - Math.abs(b.points - userPoints)
  )[0];
}
```

---

## 7. 前端页面结构

### 7.1 页面路由

```typescript
const routes = [
  // 公开页面
  { path: "/", component: Home },
  { path: "/login", component: Login },
  { path: "/register", component: Register },
  { path: "/problem/:id", component: ProblemDetail },
  { path: "/leaderboard", component: Leaderboard },

  // 学生页面
  { path: "/problem/:id/solve", component: Solve, auth: true },
  { path: "/submissions", component: Submissions, auth: true },
  { path: "/profile", component: Profile, auth: true },
  { path: "/match", component: MatchPage, auth: true },
  { path: "/match/:id", component: MatchBattle, auth: true },
  { path: "/exams", component: ExamList, auth: true },
  { path: "/exam/:id", component: ExamPage, auth: true },
  { path: "/exam/:id/result", component: ExamResult, auth: true },

  // 管理员页面
  { path: "/admin", component: AdminDashboard, role: "ADMIN" },
  { path: "/admin/problems", component: AdminProblems, role: "ADMIN" },
  { path: "/admin/problems/create", component: AdminProblemForm, role: "ADMIN" },
  { path: "/admin/knowledge-tree", component: AdminKnowledgeTree, role: "ADMIN" },
  { path: "/admin/exams", component: AdminExams, role: "ADMIN" },
  { path: "/admin/exams/create", component: AdminExamForm, role: "ADMIN" },
  { path: "/admin/users", component: AdminUsers, role: "ADMIN" },
  { path: "/admin/ai-config", component: AdminAIConfig, role: "ADMIN" },
];
```

### 7.2 核心页面功能

#### 做题页面 (SolvePage)
- Monaco代码编辑器
- 题目描述（Markdown渲染）
- AI提示按钮
- 实时判题反馈
- 提交后显示积分变化

#### 对战大厅 (MatchPage)
- 1v1匹配按钮
- 房间列表（组队赛）
- 排行榜入口
- 历史战绩

#### 对战页面 (MatchBattle)
- 实时对战界面
- 题目显示
- 双方得分/时间
- 答案提交
- 结果展示

#### 考试页面 (ExamPage)
- 倒计时显示
- 题目列表
- 答题区
- 提交按钮
- 监考警告提示

#### 知识树页面
- 树形可视化
- 节点点击查看题目
- 添加/编辑节点
- 文件导入

---

## 8. AI功能集成

### 8.1 AI服务封装

```typescript
// api/services/ai.service.ts (扩展现有服务)

class AIService {
  // 生成测试样例
  async generateTestCases(problem: Problem): Promise<TestCase[]> {
    const prompt = `请为以下编程题生成测试用例...`;
    return await this.callOpenAI(prompt);
  }

  // 生成题解
  async generateSolution(problem: Problem): Promise<ProblemSolution> {
    const prompt = `请为以下题目生成题解...`;
    return await this.callOpenAI(prompt);
  }

  // 解析文件生成知识树
  async parseFileToKnowledgeTree(content: string): Promise<KnowledgeNode[]> {
    const prompt = `请分析文本内容，生成知识树...`;
    return await this.callOpenAI(prompt);
  }

  // 自动归类题目
  async classifyProblem(problem: Problem, knowledgeTree: KnowledgeNode[]): Promise<string[]> {
    const prompt = `请判断题目属于哪些知识节点...`;
    return await this.callOpenAI(prompt);
  }

  // 导入题目
  async parseProblemFile(content: string, fileType: string): Promise<Problem[]> {
    const prompt = `请从${fileType}文件中提取题目...`;
    return await this.callOpenAI(prompt);
  }
}
```

### 8.2 AI提示词模板

#### 题目导入
```
你是一个专业的编程教师。请从以下{file_type}文件中提取题目信息。

文件内容：
{content}

要求：
1. 识别题目类型（PROGRAMMING/CHOICE/FILL_BLANK）
2. 提取题目描述（Markdown格式）
3. 对于编程题，生成测试用例
4. 对于选择题，提取选项和正确答案
5. 对于填空题，提取填空答案

返回JSON数组格式：
[
  {
    "title": "题目标题",
    "description": "题目描述",
    "type": "PROGRAMMING|CHOICE|FILL_BLANK",
    "testCases": [...],  // 编程题
    "choices": [...],    // 选择题
    "correctAnswer": "...", // 答案
    "fillBlanks": [...]  // 填空题答案
  }
]
```

#### 知识树生成
```
请分析以下文本内容，识别知识点并生成两层知识树结构。

文本内容：
{content}

要求：
1. 第一层：主要知识分类（不超过10个）
2. 第二层：具体知识点（每个分类下2-5个）
3. 使用中文命名
4. 简洁准确

返回格式：
{
  "knowledgeTree": {
    "name": "知识体系",
    "children": [
      {
        "name": "分类名称",
        "description": "简要描述",
        "children": [
          {"name": "知识点1", "description": "描述"},
          {"name": "知识点2", "description": "描述"}
        ]
      }
    ]
  }
}
```

---

## 9. 安全设计

### 9.1 实时通信安全

```typescript
// JWT验证中间件
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = await verifyToken(token);
    socket.data.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});

// 考试监考安全
socket.on("exam:heartbeat", async (data) => {
  const exam = await getExam(data.examId);
  if (exam.enableProctoring) {
    await logProctoringEvent(data);
    if (data.violations?.length > 3) {
      await autoSubmitExam(data.examId, data.userId);
    }
  }
});
```

### 9.2 积分安全

```typescript
// 使用事务更新积分
async function updateUserPoints(userId: string, delta: number) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { points: { increment: delta } }
    });
    
    // 记录积分变动
    await tx.pointLog.create({
      data: { userId, delta, reason: "自动生成" }
    });
    
    // 检查等级提升
    await checkAndUpdateLevel(tx, user);
    
    return user;
  });
}
```

### 9.3 考试安全

```typescript
// 防止答案泄露
async function submitExamAnswer(examId: string, userId: string, data: any) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { examId, userId, status: "IN_PROGRESS" }
  });

  if (!attempt) {
    throw new Error("考试未开始或已结束");
  }

  // 不返回正确答案给前端
  return await saveAnswer(examId, userId, data.answers);
}
```

---

## 10. 实现优先级

### Phase 1: 基础扩展 (1-2周)
1. ✅ 题解内嵌到题目
2. ✅ AI生成测试样例
3. ✅ AI生成题解
4. ✅ 文件导入题目（txt/pdf）
5. ✅ 基础积分系统

### Phase 2: 知识树系统 (1周)
1. ✅ 知识树数据结构
2. ✅ 知识树管理页面
3. ✅ AI解析文件生成知识树
4. ✅ 题目关联知识树
5. ✅ AI自动归类题目

### Phase 3: 实时系统 (2周)
1. ✅ WebSocket集成
2. ✅ 在线人数统计
3. ✅ 1v1对战系统
4. ✅ 排行榜
5. ✅ 组队竞赛

### Phase 4: 考试系统 (2周)
1. ✅ 考试管理
2. ✅ 在线考试
3. ✅ 监考功能
4. ✅ 考试分析
5. ✅ 考试与积分联动

### Phase 5: 完善优化 (1周)
1. ✅ 成就系统
2. ✅ 等级特权
3. ✅ 性能优化
4. ✅ 安全加固
5. ✅ 文档完善

---

## 附录

### A. 环境变量

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/oj"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# AI
AI_ENABLED=true
AI_PROVIDER="openai"
AI_API_KEY="sk-xxx"
AI_BASE_URL="https://api.openai.com/v1"

# 文件存储
STORAGE_TYPE="local"  # 或 "oss"
OSS_BUCKET="oj-files"
OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"
```

### B. 性能指标

- 在线人数更新延迟: < 1秒
- 对战同步延迟: < 100ms
- 考试提交响应: < 2秒
- AI生成响应: < 10秒

### C. 扩展建议

1. **分布式部署**: 使用Redis Pub/Sub同步Socket状态
2. **CDN加速**: 静态资源、文件上传
3. **消息队列**: AI任务队列，避免阻塞
4. **监控系统**: 实时监控用户行为、性能指标

---

**文档结束**

*本设计方案为初稿，欢迎提出修改意见。*
