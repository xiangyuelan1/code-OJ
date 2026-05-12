#!/bin/bash

# OJ系统一键启动脚本
# 作者: TRAE AI Assistant
# 版本: 1.0

echo "🚀 OJ在线评测系统启动中..."
echo "================================"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查命令是否成功
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 成功${NC}"
    else
        echo -e "${RED}✗ $1 失败${NC}"
        exit 1
    fi
}

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 1. 检查依赖
echo -e "\n${YELLOW}📦 检查依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装依赖..."
    npm install
    check_command "安装依赖"
else
    echo -e "${GREEN}✓ 依赖已安装${NC}"
fi

# 2. 检查环境变量文件
echo -e "\n${YELLOW}⚙️ 检查环境配置...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ 已从.env.example创建.env文件${NC}"
    else
        echo -e "DATABASE_URL=\"file:./prisma/dev.db\"" > .env
        echo -e "${GREEN}✓ 已创建.env文件${NC}"
    fi
else
    echo -e "${GREEN}✓ 环境配置文件已存在${NC}"
fi

# 3. 生成Prisma客户端
echo -e "\n${YELLOW}🔧 生成数据库客户端...${NC}"
npx prisma generate
check_command "生成Prisma客户端"

# 4. 检查数据库
echo -e "\n${YELLOW}🗄️ 检查数据库...${NC}"
if [ ! -f "dev.db" ]; then
    echo "首次运行，正在创建数据库..."
    npx prisma migrate dev --name init
    check_command "创建数据库"
else
    echo -e "${GREEN}✓ 数据库已存在${NC}"
fi

# 5. 检查种子数据
echo -e "\n${YELLOW}🌱 检查种子数据...${NC}"
echo "正在初始化种子数据..."
npx tsx api/scripts/seed.ts 2>/dev/null || echo "种子数据可能已存在，跳过..."

# 6. 初始化成就数据
echo -e "\n${YELLOW}🏆 初始化成就系统...${NC}"
echo "正在初始化成就..."
sleep 1 && curl -s -X POST http://localhost:3005/api/achievements/initialize >/dev/null 2>&1 || echo "成就初始化（可能后端未启动）..."

# 7. 启动服务
echo -e "\n${YELLOW}🚀 启动服务...${NC}"
echo "================================"
echo -e "${GREEN}前端地址: http://localhost:5175${NC}"
echo -e "${GREEN}后端API: http://localhost:3005${NC}"
echo -e "${GREEN}数据库:  SQLite (prisma/dev.db)${NC}"
echo "================================"
echo -e "\n按 ${YELLOW}Ctrl+C${NC} 停止服务\n"

# 启动前后端服务
npm run dev
