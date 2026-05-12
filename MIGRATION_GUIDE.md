# OJ在线评测系统 - 项目移植指南

## 📋 目录

1. [内网访问配置](#内网访问配置)
2. [项目下载](#项目下载)
3. [环境要求](#环境要求)
4. [安装步骤](#安装步骤)
5. [启动项目](#启动项目)
6. [常见问题](#常见问题)

---

## 🌐 内网访问配置

### 当前环境配置

系统已配置为支持内网访问：

- **前端地址**: `http://0.0.0.0:5175`
- **后端地址**: `http://0.0.0.0:3005` 
- **API代理**: 前端自动代理到后端

### 如何查看内网IP

**Windows:**
```cmd
ipconfig
```
查找 "IPv4 地址" 或 "Ethernet adapter" 下的 IP

**Mac/Linux:**
```bash
ifconfig
```
查找 "inet" 开头的行（通常是 `192.168.x.x` 或 `10.0.x.x`）

### 内网访问地址

```
前端: http://你的内网IP:5175
后端: http://你的内网IP:3005
```

**示例:** 如果你的内网IP是 `192.168.1.100`，则访问：
- 前端: http://192.168.1.100:5175
- 后端: http://192.168.1.100:3005

---

## 📥 项目下载

### 方式一：复制整个项目文件夹

直接复制 `/workspace` 文件夹到你的电脑即可。

### 方式二：GitHub（如果已上传）

```bash
git clone https://github.com/你的用户名/oj-system.git
cd oj-system
```

### 方式三：打包下载

```bash
# 在项目根目录执行
tar -czvf oj-system.tar.gz .
```

---

## 💻 环境要求

### 必需环境

| 环境 | 版本要求 | 下载地址 |
|------|---------|---------|
| Node.js | ≥ 18.0.0 | [官网](https://nodejs.org/) |
| npm | ≥ 9.0.0 | (随Node.js安装) |
| Python | ≥ 3.8 | [官网](https://www.python.org/) |

### 检查版本

```bash
node -v    # 应显示 v18.x.x 或更高
npm -v     # 应显示 9.x.x 或更高
python3 --version  # 应显示 Python 3.8+
```

---

## 🚀 安装步骤

### 1. 解压项目（如果下载的是压缩包）

**Windows:**
```cmd
tar -xzf oj-system.tar.gz
cd oj-system
```

**Mac/Linux:**
```bash
tar -xzf oj-system.tar.gz
cd oj-system
```

### 2. 安装依赖

```bash
# 安装所有依赖（前后端）
npm install
```

这会自动安装：
- 前端依赖 (React, Vite, TailwindCSS等)
- 后端依赖 (Express, Prisma, JWT等)

### 3. 初始化数据库

```bash
# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init

# 初始化种子数据（管理员账户和示例题目）
npx tsx api/scripts/seed.ts
```

### 4. 配置环境变量（可选）

复制 `.env.example` 为 `.env`：

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 数据库
DATABASE_URL="file:./dev.db"

# JWT密钥（生产环境请更换）
JWT_SECRET="你的密钥"

# 服务器端口
PORT=3005
```

---

## ▶️ 启动项目

### 开发模式（推荐）

同时启动前端和后端：

```bash
npm run dev
```

这会启动：
- 前端开发服务器: http://localhost:5175
- 后端API服务器: http://localhost:3005

### 分别启动

**终端1 - 后端:**
```bash
npm run server:dev
```

**终端2 - 前端:**
```bash
npm run client:dev
```

### 生产模式

```bash
# 构建前端
npm run build

# 启动后端
npm run server:start
```

---

## 🔧 功能验证

启动后，访问 http://localhost:5175

### 测试账户

| 账户 | 用户名 | 密码 | 角色 |
|------|--------|------|------|
| 管理员 | admin | admin123 | 管理员 |
| 学生 | student1 | test123456 | 学生 |

### 验证清单

- [ ] 首页加载，显示题目列表
- [ ] 用户注册和登录
- [ ] 切换到管理员账户
- [ ] 访问管理后台
- [ ] 查看题目详情
- [ ] 提交选择题答案

---

## ❓ 常见问题

### 1. 端口被占用

如果端口被占用，修改 `.env` 文件：

```env
PORT=3002
```

同时修改 `vite.config.ts`:

```typescript
server: {
  port: 5174,  // 换一个前端端口
  proxy: {
    '/api': {
      target: 'http://localhost:3002',  // 对应新的后端端口
      // ...
    }
  }
}
```

### 2. 数据库错误

如果遇到数据库错误：

```bash
# 删除旧数据库
rm -f prisma/dev.db

# 重新迁移
npx prisma migrate dev --name init

# 重新初始化数据
npx tsx api/scripts/seed.ts
```

### 3. 依赖安装失败

清理缓存后重试：

```bash
# 清理npm缓存
npm cache clean --force

# 删除node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 4. 前端无法连接后端

检查：
1. 后端是否正常运行（`npm run server:dev`）
2. Vite代理配置是否正确
3. 浏览器控制台是否有CORS错误

### 5. 代码执行器不工作

确保已安装Node.js和Python：

```bash
# 检查Node.js
node -v

# 检查Python
python3 --version

# 如果缺少Python，安装它
# Windows: https://www.python.org/downloads/
# Mac: brew install python3
# Ubuntu: sudo apt install python3
```

---

## 📦 项目结构

```
oj-system/
├── api/                    # 后端代码
│   ├── controllers/       # 控制器
│   ├── services/           # 业务逻辑
│   ├── routes/            # API路由
│   ├── middleware/        # 中间件
│   ├── lib/               # 工具库
│   └── scripts/           # 脚本
│       └── seed.ts        # 数据初始化
├── prisma/                # 数据库
│   └── schema.prisma      # 数据模型
├── src/                   # 前端代码
│   ├── components/        # 组件
│   ├── pages/            # 页面
│   ├── services/         # API服务
│   ├── stores/           # 状态管理
│   └── types/            # 类型定义
├── public/               # 静态资源
├── .env                  # 环境变量
├── package.json          # 项目配置
├── vite.config.ts        # Vite配置
└── README.md             # 项目说明
```

---

## 🛠️ 自定义配置

### 修改默认管理员密码

编辑 `api/scripts/seed.ts`，修改：
```typescript
await prisma.user.create({
  data: {
    username: 'admin',
    email: 'admin@yourdomain.com',
    password: await bcrypt.hash('你的新密码', 10),
    role: 'ADMIN'
  }
});
```

然后重新运行：
```bash
npx tsx api/scripts/seed.ts
```

### 添加更多示例题目

编辑 `api/scripts/seed.ts` 的 `problemCount === 0` 部分，添加更多题目。

### 配置AI功能

1. 获取 OpenAI API Key
2. 访问管理后台 → AI配置
3. 填入 API Key 并启用

---

## 📞 技术支持

如遇问题，请检查：
1. Node.js 和 npm 版本
2. 数据库是否正确初始化
3. 端口是否被占用
4. 浏览器控制台错误信息

---

**祝你使用愉快！🎉**
