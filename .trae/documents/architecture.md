# OJ 在线评测系统 - 技术架构文档

## 1. 系统架构概述

### 1.1 架构设计原则
- **前后端分离**：清晰的职责分离，便于独立开发和部署
- **模块化设计**：各功能模块解耦，支持灵活扩展
- **可配置性**：AI功能插件化设计，支持多API切换
- **安全性**：多层防护机制，保障系统安全

### 1.2 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      前端层 (React + TS)                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │  主页   │ │ 题目页  │ │ 做题页  │ │ 管理页  │          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
└───────┼──────────┼──────────┼──────────┼──────────────────┘
        │          │          │          │
        └──────────┴────┬─────┴──────────┘
                       │ REST API / WebSocket
        ┌──────────────┴──────────────────┐
        │         API 网关层               │
        │    (认证 / 鉴权 / 限流)           │
        └──────────────┬──────────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
┌───┴────┐      ┌─────┴─────┐      ┌────┴────┐
│ 用户模块│      │ 题目模块  │      │ 判题模块 │
└───┬────┘      └─────┬─────┘      └────┬────┘
    │                  │                  │
┌───┴────┐      ┌─────┴─────┐      ┌────┴────┐
│ AI模块 │      │ 题解模块  │      │代码执行器│
└────────┘      └───────────┘      └─────────┘
                       │
         ┌─────────────┴─────────────┐
         │      数据存储层              │
         │  SQLite  │  文件存储        │
         └────────────────────────────┘
```

---

## 2. 前端架构

### 2.1 技术栈
- **框架**：React 18 + TypeScript 5
- **构建工具**：Vite 5
- **路由**：React Router v6
- **状态管理**：Zustand（轻量级）
- **HTTP客户端**：Axios
- **样式方案**：TailwindCSS 3
- **代码编辑器**：Monaco Editor
- **UI组件库**：Headless UI + 自定义组件
- **图标库**：Lucide React

### 2.2 目录结构

```
frontend/
├── src/
│   ├── components/          # 公共组件
│   │   ├── common/          # 通用组件（按钮、输入框等）
│   │   ├── layout/          # 布局组件（导航栏、侧边栏等）
│   │   └── editor/          # 代码编辑器组件
│   ├── pages/               # 页面组件
│   │   ├── public/          # 公共页面
│   │   ├── student/         # 学生页面
│   │   └── admin/           # 管理员页面
│   ├── hooks/               # 自定义Hooks
│   ├── stores/               # 状态管理
│   ├── services/             # API服务层
│   ├── types/                # TypeScript类型定义
│   ├── utils/                # 工具函数
│   └── styles/               # 全局样式
├── public/
└── vite.config.ts
```

### 2.3 路由设计

| 路由 | 组件 | 权限 |
|------|------|------|
| / | 首页/题目列表 | 公开 |
| /login | 登录页 | 公开 |
| /register | 注册页 | 公开 |
| /problem/:id | 题目详情 | 公开 |
| /problem/:id/solve | 做题页面 | 学生 |
| /solutions/:id | 题解详情 | 学生 |
| /profile | 个人中心 | 学生 |
| /submissions | 提交历史 | 学生 |
| /admin | 管理后台 | 管理员 |
| /admin/problems | 题目管理 | 管理员 |
| /admin/problems/create | 创建题目 | 管理员 |
| /admin/problems/:id/edit | 编辑题目 | 管理员 |
| /admin/solutions | 题解管理 | 管理员 |
| /admin/users | 用户管理 | 管理员 |
| /admin/ai-config | AI配置 | 管理员 |

---

## 3. 后端架构

### 3.1 技术栈
- **运行环境**：Node.js 20 LTS
- **框架**：Express.js
- **语言**：TypeScript 5
- **数据库**：SQLite（开发/小型部署）/ PostgreSQL（生产）
- **ORM**：Prisma
- **认证**：JWT（jsonwebtoken）
- **密码加密**：bcrypt
- **文件存储**：本地文件系统（可扩展至OSS）

### 3.2 目录结构

```
backend/
├── src/
│   ├── controllers/          # 控制器层
│   │   ├── auth.controller.ts
│   │   ├── problem.controller.ts
│   │   ├── solution.controller.ts
│   │   ├── submission.controller.ts
│   │   └── ai.controller.ts
│   ├── services/             # 业务逻辑层
│   │   ├── auth.service.ts
│   │   ├── problem.service.ts
│   │   ├── solution.service.ts
│   │   ├── submission.service.ts
│   │   └── ai.service.ts
│   ├── models/               # 数据模型层
│   │   └── prisma/
│   ├── middleware/           # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/               # 路由定义
│   ├── utils/                # 工具函数
│   ├── executor/             # 代码执行器
│   └── config/               # 配置文件
├── prisma/
│   └── schema.prisma
└── dist/
```

### 3.3 API设计

#### 认证模块
| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户 |
| POST | /api/auth/logout | 登出 |

#### 题目模块
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /api/problems | 获取题目列表 |
| GET | /api/problems/:id | 获取题目详情 |
| POST | /api/problems | 创建题目（管理员）|
| PUT | /api/problems/:id | 更新题目（管理员）|
| DELETE | /api/problems/:id | 删除题目（管理员）|

#### 提交判题模块
| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /api/submissions | 提交答案 |
| GET | /api/submissions/:id | 获取判题结果 |
| GET | /api/submissions/user/:userId | 获取用户提交历史 |

#### 题解模块
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /api/solutions/problem/:problemId | 获取题目题解 |
| POST | /api/solutions | 创建题解（管理员）|
| PUT | /api/solutions/:id | 更新题解（管理员）|
| DELETE | /api/solutions/:id | 删除题解（管理员）|

#### AI模块
| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /api/ai/explain-code | AI代码解释 |
| POST | /api/ai/hint | AI思路提示 |
| POST | /api/ai/diagnose | AI错误诊断 |
| GET | /api/admin/ai-config | 获取AI配置（管理员）|
| PUT | /api/admin/ai-config | 更新AI配置（管理员）|

---

## 4. 数据库设计

### 4.1 数据模型（Prisma Schema）

```prisma
model User {
  id            String       @id @default(uuid())
  username      String       @unique
  email         String       @unique
  password      String
  role          Role         @default(STUDENT)
  createdAt     DateTime     @default(now())
  submissions   Submission[]
  isActive      Boolean      @default(true)
}

enum Role {
  ADMIN
  STUDENT
}

model Problem {
  id            String       @id @default(uuid())
  title         String
  description   String
  type          ProblemType
  difficulty    Difficulty
  tags          String[]
  testCases     Json
  timeLimit     Int          @default(2000)
  memoryLimit   Int          @default(256)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  solutions     Solution[]
  submissions   Submission[]
}

enum ProblemType {
  PROGRAMMING
  CHOICE
  FILL_BLANK
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

model Solution {
  id            String   @id @default(uuid())
  problemId     String
  problem       Problem  @relation(fields: [problemId], references: [id])
  title         String
  content       String
  code          String?
  complexity    String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Submission {
  id            String         @id @default(uuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id])
  problemId     String
  problem       Problem        @relation(fields: [problemId], references: [id])
  type          ProblemType
  code          String?
  answer        String?
  result        Json?
  status        SubmissionStatus
  score         Int?
  createdAt     DateTime       @default(now())
}

enum SubmissionStatus {
  PENDING
  JUDGING
  ACCEPTED
  WRONG_ANSWER
  TIME_LIMIT_EXCEEDED
  MEMORY_LIMIT_EXCEEDED
  RUNTIME_ERROR
  COMPILE_ERROR
}

model AIConfig {
  id            String   @id @default(uuid())
  enabled       Boolean  @default(false)
  provider      String   @default("openai")
  apiKey        String?
  baseUrl       String?
  model         String   @default("gpt-3.5-turbo")
  updatedAt     DateTime @updatedAt
}
```

---

## 5. 代码执行器设计

### 5.1 执行环境隔离
- 使用 Node.js child_process 创建独立进程
- 设置资源限制（CPU、内存、时间）
- 超时自动终止进程
- 捕获运行时错误

### 5.2 支持的语言
| 语言 | 编译/解释 | 文件扩展名 |
|------|----------|-----------|
| JavaScript | Node.js | .js |
| Python | Python3 | .py |
| Java | javac + java | .java |
| C++ | g++ | .cpp |

### 5.3 判题流程

```
1. 接收提交 → 状态: PENDING
2. 入队等待 → 状态: JUDGING
3. 代码编译（如需）
4. 逐测试点执行：
   - 输入数据 → 程序执行 → 输出结果
   - 比对输出与期望
   - 记录执行时间/内存
5. 综合所有测试点结果
6. 返回判题结果
```

---

## 6. AI集成架构

### 6.1 AI服务抽象层

```typescript
interface AIProvider {
  explainCode(code: string, language: string): Promise<string>;
  getHint(problem: Problem, context: string): Promise<string>;
  diagnoseError(code: string, error: string): Promise<string>;
}

class OpenAIProvider implements AIProvider { ... }
class ClaudeProvider implements AIProvider { ... }
class CustomProvider implements AIProvider { ... }
```

### 6.2 配置管理
- AI配置存储于数据库（AIConfig表）
- 支持动态切换API服务商
- 敏感信息（API Key）加密存储

### 6.3 AI功能开关
- 管理员可全局启用/禁用AI功能
- 不同AI功能可独立控制
- 未启用时对应功能隐藏或提示

---

## 7. 安全设计

### 7.1 认证授权
- JWT Token认证，有效期24小时
- Refresh Token延长登录状态
- 基于角色的访问控制（RBAC）

### 7.2 数据安全
- 密码bcrypt加密（10轮salt）
- SQL参数化查询（Prisma自动处理）
- XSS防护（React自动转义）
- CORS配置限制

### 7.3 代码执行安全
- 进程隔离执行
- 资源限制（CPU时间、内存）
- 超时强制终止
- 禁用危险系统调用

---

## 8. 部署架构

### 8.1 开发环境
- 前端：Vite Dev Server (端口5175)
- 后端：Node.js (端口3005)
- 数据库：SQLite文件

### 8.2 生产环境建议
- 前端：静态文件CDN或Nginx
- 后端：PM2集群或Docker容器
- 数据库：PostgreSQL云数据库
- 存储：OSS/S3对象存储

### 8.3 环境变量配置

```env
# 后端
DATABASE_URL=file:./dev.db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
PORT=3005

# AI配置
AI_ENABLED=false
AI_PROVIDER=openai
AI_API_KEY=
AI_BASE_URL=

# 前端
VITE_API_BASE_URL=http://localhost:3005 
```

---

## 9. 开发规范

### 9.1 代码风格
- TypeScript严格模式
- ESLint + Prettier
- 组件采用函数式+Hooks
- 服务层异常统一处理

### 9.2 Git提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试相关
chore: 构建/工具
```

### 9.3 API响应格式

```typescript
// 成功响应
{
  success: true,
  data: { ... }
}

// 错误响应
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "错误描述"
  }
}
```

---

## 10. 性能优化

### 10.1 前端优化
- 路由懒加载
- 组件按需引入
- 图片优化压缩
- 本地缓存策略

### 10.2 后端优化
- 数据库索引优化
- 判题队列异步处理
- 结果缓存
- 连接池管理

---

## 11. 扩展性设计

### 11.1 功能扩展
- 插件化AI Provider接口
- 可配置判题语言
- 自定义测试点模板

### 11.2 规模扩展
- 数据库读写分离
- 判题服务集群
- 分布式缓存
- CDN静态资源

---

## 12. 测试策略

### 12.1 单元测试
- Jest测试框架
- 核心业务逻辑覆盖
- AI服务Mock测试

### 12.2 集成测试
- API端到端测试
- 数据库操作测试
- 代码执行器测试

### 12.3 E2E测试
- Playwright自动化测试
- 关键用户流程覆盖
