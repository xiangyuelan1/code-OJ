#!/bin/bash
set -e

# ============================================================
#  OJ 在线评测系统 - 云主机部署脚本 (Ubuntu/Debian)
#  用法:
#    首次部署:  bash deploy.sh
#    更新部署:  bash deploy.sh update
# ============================================================

APP_NAME="oj-system"
APP_DIR="/opt/oj-system"
REPO_URL="https://github.com/xiangyuelan1/code-OJ.git"
BRANCH="main"
NODE_VERSION="20"
SERVICE_NAME="oj-system"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ============================================================
#  1. 安装系统依赖
# ============================================================
install_system_deps() {
    info "检查系统依赖..."

    if ! command -v node &>/dev/null; then
        info "安装 Node.js ${NODE_VERSION}..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
        sudo apt-get install -y nodejs
    fi

    if ! command -v git &>/dev/null; then
        info "安装 Git..."
        sudo apt-get update
        sudo apt-get install -y git
    fi

    ok "系统依赖已就绪 (Node $(node -v), npm $(npm -v))"
}

# ============================================================
#  2. 克隆或更新代码
# ============================================================
clone_or_update() {
    if [ -z "$REPO_URL" ]; then
        err "请先设置 REPO_URL 变量，填入你的 GitHub 仓库地址\n       例如: REPO_URL=https://github.com/yourname/oj-system.git"
    fi

    if [ -d "$APP_DIR/.git" ]; then
        info "更新代码..."
        cd "$APP_DIR"
        git fetch origin
        git reset --hard "origin/${BRANCH}"
        ok "代码已更新到最新"
    else
        info "首次部署，克隆代码..."
        sudo mkdir -p "$APP_DIR"
        sudo chown "$(whoami)" "$APP_DIR"
        git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
        ok "代码克隆完成"
    fi
}

# ============================================================
#  3. 安装依赖 & 构建
# ============================================================
build_app() {
    cd "$APP_DIR"

    info "安装 npm 依赖..."
    npm install
    ok "依赖安装完成"

    info "生成 Prisma 客户端..."
    npx prisma generate
    ok "Prisma 客户端已生成"

    info "构建前端..."
    npm run build
    ok "前端构建完成"
}

# ============================================================
#  4. 初始化数据库
# ============================================================
init_database() {
    cd "$APP_DIR"

    if [ ! -f ".env" ]; then
        info "创建 .env 配置文件..."
        cp .env.example .env
        warn "已从 .env.example 创建 .env，请根据需要修改配置！"
        warn "特别是 JWT_SECRET，请务必修改为安全的随机字符串"
    else
        ok ".env 配置文件已存在"
    fi

    if [ ! -f "prisma/dev.db" ]; then
        info "初始化数据库..."
        npx prisma migrate dev --name init
        ok "数据库创建完成"
    else
        info "检查数据库迁移..."
        npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init
        ok "数据库已就绪"
    fi

    info "检查种子数据..."
    USER_COUNT=$(npx tsx -e "
        const { PrismaClient } = require('@prisma/client');
        const p = new PrismaClient();
        p.user.count().then(c => { console.log(c); p.\$disconnect(); })
            .catch(() => { console.log(0); p.\$disconnect(); });
    " 2>/dev/null | tail -1)

    if [ "${USER_COUNT:-0}" = "0" ]; then
        info "填充种子数据..."
        npx tsx api/scripts/seed.ts
        ok "种子数据已初始化"
    else
        ok "数据库已有 ${USER_COUNT} 个用户，跳过种子数据"
    fi
}

# ============================================================
#  5. 配置 systemd 服务
# ============================================================
setup_systemd() {
    info "配置 systemd 服务..."

    cat > /tmp/${SERVICE_NAME}.service << EOF
[Unit]
Description=OJ Online Judge System
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=$(which npx) tsx api/server.ts
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo cp /tmp/${SERVICE_NAME}.service /etc/systemd/system/${SERVICE_NAME}.service
    sudo systemctl daemon-reload
    sudo systemctl enable ${SERVICE_NAME}
    ok "systemd 服务已配置"
}

# ============================================================
#  6. 启动/重启服务
# ============================================================
restart_service() {
    info "重启服务..."
    sudo systemctl restart ${SERVICE_NAME}

    sleep 3

    if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
        ok "服务启动成功！"
    else
        err "服务启动失败，查看日志: sudo journalctl -u ${SERVICE_NAME} -n 50"
    fi
}

# ============================================================
#  7. 配置防火墙
# ============================================================
setup_firewall() {
    if command -v ufw &>/dev/null; then
        info "配置防火墙 (ufw)..."
        sudo ufw allow 5000/tcp 2>/dev/null || true
        ok "防火墙已开放 5000 端口"
    elif command -v firewall-cmd &>/dev/null; then
        info "配置防火墙 (firewalld)..."
        sudo firewall-cmd --permanent --add-port=5000/tcp 2>/dev/null || true
        sudo firewall-cmd --reload 2>/dev/null || true
        ok "防火墙已开放 5000 端口"
    fi
}

# ============================================================
#  8. 显示状态
# ============================================================
show_status() {
    echo ""
    echo "============================================================"
    echo -e "${GREEN}  OJ 在线评测系统部署完成！${NC}"
    echo "============================================================"
    echo ""
    echo "  访问地址: http://<你的云主机IP>:5000"
    echo ""
    echo "  常用命令:"
    echo "    查看状态:  sudo systemctl status ${SERVICE_NAME}"
    echo "    查看日志:  sudo journalctl -u ${SERVICE_NAME} -f"
    echo "    重启服务:  sudo systemctl restart ${SERVICE_NAME}"
    echo "    停止服务:  sudo systemctl stop ${SERVICE_NAME}"
    echo ""
    echo "  更新部署:"
    echo "    cd ${APP_DIR} && bash deploy.sh update"
    echo ""
    echo "  测试账户:"
    echo "    管理员: admin / admin123"
    echo "    学生:   student1 / test123456"
    echo "============================================================"
}

# ============================================================
#  主流程
# ============================================================
main() {
    echo ""
    echo "============================================================"
    echo "  OJ 在线评测系统 - 部署脚本"
    echo "============================================================"
    echo ""

    local ACTION="${1:-install}"

    case "$ACTION" in
        update)
            info "执行更新部署..."
            clone_or_update
            build_app
            init_database
            restart_service
            ;;
        install|*)
            install_system_deps
            clone_or_update
            build_app
            init_database
            setup_systemd
            setup_firewall
            restart_service
            show_status
            ;;
    esac
}

main "$@"
