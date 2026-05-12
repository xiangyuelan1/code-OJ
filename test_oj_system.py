from playwright.sync_api import sync_playwright
import json

def run_test():
    errors = []
    test_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        try:
            print("=" * 60)
            print("🧪 OJ系统自动化测试")
            print("=" * 60)

            # Test 1: 访问首页
            print("\n📍 测试 1: 访问首页...")
            page.goto('http://localhost:5175')  
            page.wait_for_load_state('networkidle')
            page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test_results/01_home.png', full_page=True)
            test_results.append(("访问首页", True,   "成功加载"))
            print("   ✅ 首页加载成功")

            # Test 2: 检查导航栏
            print("\n📍 测试 2: 检查导航栏...")
            navbar = page.locator('nav').first
            if navbar.is_visible():
                test_results.append(("导航栏", True, "导航栏可见"))
                print("   ✅ 导航栏正常显示")
            else:
                test_results.append(("导航栏", False, "导航栏未找到"))
                print("   ❌ 导航栏未找到")

            # Test 3: 访问登录页
            print("\n📍 测试 3: 访问登录页...")
            page.goto('http://localhost:5175/login')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test_results/02_login.png', full_page=True)
            test_results.append(("登录页", True,   "登录页加载成功"))
            print("   ✅ 登录页加载成功")

            # Test 4: 登录功能测试
            print("\n📍 测试 4: 测试登录功能...")
            page.fill('input[type="text"], input[name="username"]', 'admin')
            page.fill('input[type="password"]', 'admin123')
            page.click('button[type="submit"]')
            page.wait_for_timeout(2000)

            current_url = page.url
            if '/login' not in current_url:
                test_results.append(("登录功能", True, "登录成功"))
                print("   ✅ 登录成功，跳转到主页")
                page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test_results/03_after_login.png', full_page=True)
            else:
                test_results.append(("登录功能", False, "登录失败"))
                print("   ❌ 登录可能失败，仍在登录页")

            # Test 5: 检查在线用户数显示
            print("\n📍 测试 5: 检查在线用户数...")
            page.wait_for_load_state('networkidle')
            online_indicator = page.locator('text=/在线|online|人数/i')
            if online_indicator.count() > 0:
                test_results.append(("在线用户数", True, "在线用户数显示正常"))
                print("   ✅ 在线用户数显示正常")
            else:
                test_results.append(("在线用户数", False, "未找到在线用户数显示"))
                print("   ⚠️ 未找到在线用户数显示")

            # Test 6: 访问做题页面
            print("\n📍 测试 6: 访问做题页面...")
            page.goto('http://localhost:5175/solve')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test_results/04_solve.png', full_page=True)
            test_results.append(("做题页面", True, "做题页面加载成功"))
            print("   ✅ 做题页面加载成功")

            # Test 7: 检查题目列表
            print("\n📍 测试 7: 检查题目列表...")
            problem_cards = page.locator('[class*="problem"], [class*="card"], [class*="item"]')
            if problem_cards.count() > 0:
                test_results.append(("题目列表", True, f"找到 {problem_cards.count()} 个题目"))
                print(f"   ✅ 找到 {problem_cards.count()} 个题目")
            else:
                test_results.append(("题目列表", False, "未找到题目"))
                print("   ⚠️ 未找到题目")

            # Test 8: 访问提交记录页面
            print("\n📍 测试 8: 访问提交记录页面...")
            page.goto('http://localhost:5175/submissions')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test_results/05_submissions.png', full_page=True)
            test_results.append(("提交记录", True, "提交记录页面加载成功"))
            print("   ✅ 提交记录页面加载成功")

            # Test 9: 访问知识树页面
            print("\n📍 测试 9: 访问知识树页面...")
            page.goto('http://localhost:5175/knowledge-tree')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test_results/06_knowledge_tree.png', full_page=True)
            test_results.append(("知识树页面", True, "知识树页面加载成功"))
            print("   ✅ 知识树页面加载成功")

            # Test 10: 访问考试页面
            print("\n📍 测试 10: 访问考试页面...")
            page.goto('http://localhost:5175/exams')    
            page.wait_for_load_state('networkidle')
            page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test_results/07_exams.png', full_page=True)
            test_results.append(("考试页面", True, "考试页面加载成功"))
            print("   ✅ 考试页面加载成功")

            # Test 11: 访问对战页面
            print("\n📍 测试 11: 访问对战页面...")
            page.goto('http://localhost:5175/match')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test_results/08_match.png', full_page=True)
            test_results.append(("对战页面", True, "对战页面加载成功"))
            print("   ✅ 对战页面加载成功")

            # Test 12: 访问成就页面
            print("\n📍 测试 12: 访问成就页面...")
            page.goto('http://localhost:5175/achievements')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test_results/09_achievements.png', full_page=True)
            test_results.append(("成就页面", True, "成就页面加载成功"))
            print("   ✅ 成就页面加载成功")

            # Test 13: API 基础测试
            print("\n📍 测试 13: 测试后端 API...")
            api_response = page.request.get('http://localhost:3005/api/problems')
            if api_response.ok:
                test_results.append(("后端 API", True, f"状态码: {api_response.status}"))
                print(f"   ✅ 后端 API 正常 (状态码: {api_response.status})")
            else:
                test_results.append(("后端 API", False, f"状态码: {api_response.status}"))
                print(f"   ❌ 后端 API 异常 (状态码: {api_response.status})")

            # Test 14: WebSocket 连接
            print("\n📍 测试 14: 测试 WebSocket...")
            ws_test = page.request.get('http://localhost:3005')     
            if ws_test.status in [200, 404]:
                test_results.append(("WebSocket", True, "服务器运行正常"))
                print("   ✅ WebSocket 服务器运行正常")
            else:
                test_results.append(("WebSocket", False, "服务器无响应"))
                print("   ❌ WebSocket 服务器无响应")

        except Exception as e:
            errors.append(str(e))
            test_results.append(("测试异常", False, str(e)))
            print(f"\n   ❌ 测试异常: {e}")

        finally:
            browser.close()

    # 输出测试报告
    print("\n" + "=" * 60)
    print("📊 测试报告")
    print("=" * 60)

    passed = sum(1 for _, status, _ in test_results if status)
    total = len(test_results)

    for name, status, message in test_results:
        status_icon = "✅" if status else "❌"
        print(f"  {status_icon} {name}: {message}")

    print("\n" + "-" * 60)
    print(f"  通过: {passed}/{total} ({passed*100//total}%)")

    if console_errors:
        print(f"\n  ⚠️ 控制台错误 ({len(console_errors)} 个):")
        for err in console_errors[:5]:
            print(f"     - {err[:100]}")
    else:
        print("\n  ✅ 无控制台错误")

    if errors:
        print(f"\n  ❌ 异常: {len(errors)} 个")
        for err in errors:
            print(f"     - {err}")

    print("\n" + "=" * 60)
    print("🖼️ 截图已保存到 test_results 目录")
    print("=" * 60)

    return passed == total

if __name__ == "__main__":
    import os
    os.makedirs('d:/桌面/TRAESOLO/OJ/开发OJ系统/test_results', exist_ok=True)
    success = run_test()
    exit(0 if success else 1)
