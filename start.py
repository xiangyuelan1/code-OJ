"""
OJ在线评测系统 - 一键启动脚本
用法: python start.py
"""

import subprocess
import sys
import os
import signal
import time
import threading
import webbrowser
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
BACKEND_PORT = 3005
FRONTEND_PORT = 5175

processes: list[subprocess.Popen] = []


def log(tag: str, msg: str):
    icons = {"OK": "✅", "ERR": "❌", "INFO": "💡", "STEP": "👉", "WARN": "⚠️"}
    print(f"  {icons.get(tag, '')} {msg}")


def run(cmd: str, check: bool = True, quiet: bool = False) -> bool:
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    result = subprocess.run(
        cmd, shell=True, cwd=str(PROJECT_DIR),
        capture_output=quiet, text=quiet,
        encoding="utf-8", errors="replace", env=env,
    )
    if check and result.returncode != 0:
        if quiet:
            print(result.stderr if result.stderr else result.stdout)
        return False
    return True


def check_prerequisites():
    log("STEP", "检查运行环境...")
    if not run("node --version", quiet=True):
        log("ERR", "未安装 Node.js，请先安装: https://nodejs.org/")
        sys.exit(1)
    log("OK", "Node.js 已安装")

    if not (PROJECT_DIR / "node_modules").exists():
        log("INFO", "首次运行，正在安装依赖 (npm install)...")
        if not run("npm install"):
            log("ERR", "依赖安装失败！")
            sys.exit(1)
        log("OK", "依赖安装完成")
    else:
        log("OK", "依赖已就绪")


def kill_port(port: int):
    if sys.platform == "win32":
        subprocess.run(
            f'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :{port} ^| findstr LISTENING\') do taskkill /F /PID %a',
            shell=True, capture_output=True,
        )
    else:
        subprocess.run(f"lsof -ti:{port} | xargs kill -9 2>/dev/null", shell=True, capture_output=True)


def init_database():
    log("STEP", "检查数据库...")
    if not (PROJECT_DIR / ".env").exists():
        env_content = (
            'DATABASE_URL="file:./dev.db"\n'
            'JWT_SECRET="oj-secret-key-2024-secure"\n'
            'JWT_EXPIRES_IN="24h"\n'
            f'PORT={BACKEND_PORT}\n'
        )
        (PROJECT_DIR / ".env").write_text(env_content, encoding="utf-8")
        log("OK", "已创建 .env 配置文件")
    else:
        log("OK", "环境配置已存在")

    kill_port(BACKEND_PORT)

    if not run("npx prisma generate", quiet=True):
        log("ERR", "Prisma 客户端生成失败！")
        sys.exit(1)
    log("OK", "Prisma 客户端已生成")

    db_path = PROJECT_DIR / "prisma" / "dev.db"
    if not db_path.exists():
        log("INFO", "首次运行，正在创建数据库...")
        if not run("npx prisma migrate dev --name init"):
            log("ERR", "数据库创建失败！")
            sys.exit(1)
        log("OK", "数据库创建完成")
    else:
        log("OK", "数据库已就绪")


def seed_data():
    log("STEP", "初始化种子数据...")
    run("npx tsx api/scripts/seed.ts", check=False, quiet=True)
    log("OK", "种子数据已初始化")


def wait_for_backend(timeout: int = 30) -> bool:
    import urllib.request
    import urllib.error

    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(f"http://localhost:{BACKEND_PORT}/api/health", timeout=2)
            return True
        except Exception:
            time.sleep(1)
    return False


def start_services():
    log("STEP", "启动后端服务...")
    backend_env = os.environ.copy()
    backend_env["PORT"] = str(BACKEND_PORT)
    backend_env["PYTHONIOENCODING"] = "utf-8"

    backend_proc = subprocess.Popen(
        "npx tsx api/dev-server.ts",
        shell=True, cwd=str(PROJECT_DIR), env=backend_env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    processes.append(backend_proc)

    stream_output(backend_proc, "BACKEND")

    if wait_for_backend():
        log("OK", f"后端服务已启动 → http://localhost:{BACKEND_PORT}")
    else:
        log("WARN", "后端服务启动超时，可能仍在初始化中...")

    log("STEP", "启动前端服务...")
    frontend_env = os.environ.copy()
    frontend_env["PYTHONIOENCODING"] = "utf-8"
    frontend_proc = subprocess.Popen(
        "npx vite --host 0.0.0.0",
        shell=True, cwd=str(PROJECT_DIR), env=frontend_env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        )
    processes.append(frontend_proc)
    stream_output(frontend_proc, "FRONTEND")    
    log("OK", f"前端服务已启动 → http://localhost:{FRONTEND_PORT}")


def open_browser():
    def _open():
        time.sleep(3)
        webbrowser.open(f"http://localhost:{FRONTEND_PORT}")
    threading.Thread(target=_open, daemon=True).start()


def cleanup(signum=None, frame=None):
    print("\n")
    log("INFO", "正在停止所有服务...")
    for proc in processes:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
    log("OK", "所有服务已停止")
    sys.exit(0)


def stream_output(proc: subprocess.Popen, prefix: str):
    for line in iter(proc.stdout.readline, b""):
        try:
            text = line.decode("utf-8", errors="replace").rstrip()
        except Exception:
            text = line.rstrip()
        if text:
            print(f"  [{prefix}] {text}")


def main():
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print()
    print("  ╔═══════════════════════════════════════════╗")
    print("  ║     OJ 在线评测系统 - 一键启动            ║")
    print("  ╚═══════════════════════════════════════════╝")
    print()

    check_prerequisites()
    init_database()
    seed_data()

    start_services()

    print()
    print("  ══════════════════════════════════════════════")
    print(f"  🌐 前端地址: http://localhost:{FRONTEND_PORT}")
    print(f"  🔧 后端API:  http://localhost:{BACKEND_PORT}")
    print("  📝 测试账户:")
    print("     管理员: admin / admin123")
    print("     学生:   student1 / test123456")
    print("  按 Ctrl+C 停止服务")
    print("  ══════════════════════════════════════════════")
    print()

    open_browser()

    threads = []
    for i, proc in enumerate(processes):
        prefix = "后端" if i == 0 else "前端"
        t = threading.Thread(target=stream_output, args=(proc, prefix), daemon=True)
        t.start()
        threads.append(t)

    try:
        for proc in processes:
            proc.wait()
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
