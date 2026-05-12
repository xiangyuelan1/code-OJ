@echo off
chcp 65001 >nul
title OJ在线评测系统 - 启动中

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║       OJ在线评测系统 - 一键启动                          ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

:: 检查管理员权限（如果需要）
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [提示] 建议以管理员权限运行以获得最佳体验
)

:: 切换到脚本目录
cd /d "%~dp0"

:: 1. 检查依赖
echo [1/6] 检查依赖...
if not exist "node_modules" (
    echo   首次运行，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo   [错误] 依赖安装失败！
        pause
        exit /b 1
    )
)
echo   [OK] 依赖已就绪

:: 2. 检查环境变量
echo.
echo [2/6] 检查环境配置...
if not exist ".env" (
    echo DATABASE_URL="file:./prisma/dev.db" > .env
    echo   [OK] 已创建.env配置文件
) else (
    echo   [OK] 环境配置已存在
)

:: 3. 生成Prisma客户端
echo.
echo [3/6] 生成数据库客户端...
call npx prisma generate
if errorlevel 1 (
    echo   [错误] Prisma客户端生成失败！
    pause
    exit /b 1
)
echo   [OK] Prisma客户端已生成

:: 4. 初始化数据库
echo.
echo [4/6] 检查数据库...
if not exist "dev.db" (
    echo   首次运行，正在创建数据库...
    call npx prisma migrate dev --name init
    if errorlevel 1 (
        echo   [错误] 数据库创建失败！
        pause
        exit /b 1
    )
)
echo   [OK] 数据库已就绪

:: 5. 初始化种子数据
echo.
echo [5/6] 初始化种子数据...
call npx tsx api/scripts/seed.ts >nul 2>&1
echo   [OK] 种子数据已初始化

:: 6. 启动服务
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo   ✅ 所有准备工作已完成！
echo.
echo   🌐 前端地址: http://localhost:5173
echo   🔧 后端API:  http://localhost:3001
echo.
echo   📝 测试账户:
echo      管理员: admin / admin123
echo      学生:   student1 / test123456
echo.
echo   按 Ctrl+C 停止服务
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 正在启动服务，请稍候...
echo.

:: 启动前后端服务
npm run dev

:: 如果启动失败，保持窗口
if errorlevel 1 (
    echo.
    echo [错误] 服务启动失败！
    echo.
    pause
)
