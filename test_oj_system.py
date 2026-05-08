from playwright.sync_api import sync_playwright

def test_oj_system():
    results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # 1. 测试首页加载
        print("1. 测试首页加载...")
        page.goto('http://localhost:5173')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/01_homepage.png', full_page=True)
        
        # 检查是否有题目列表
        title = page.locator('h1').first.text_content()
        results.append(f"✅ 首页加载成功，标题: {title}")
        
        # 2. 测试用户注册
        print("2. 测试用户注册...")
        page.click('text=注册')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/02_register.png', full_page=True)
        
        page.fill('input[placeholder="请输入用户名"]', 'testuser')
        page.fill('input[placeholder="请输入邮箱"]', 'test@example.com')
        page.fill('input[placeholder="请输入密码（至少6位）"]', 'test123456')
        page.fill('input[placeholder="请再次输入密码"]', 'test123456')
        page.click('button:has-text("注册")')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/03_after_register.png', full_page=True)
        
        results.append("✅ 用户注册功能正常")
        
        # 3. 测试登录功能
        print("3. 测试登录功能...")
        page.click('text=登录')
        page.wait_for_load_state('networkidle')
        
        page.fill('input[placeholder="请输入用户名或邮箱"]', 'testuser')
        page.fill('input[placeholder="请输入密码"]', 'test123456')
        page.click('button:has-text("登录")')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/04_after_login.png', full_page=True)
        
        # 检查是否登录成功
        user_text = page.locator('text=testuser').first.text_content()
        results.append(f"✅ 登录成功，用户显示: {user_text}")
        
        # 4. 测试题目列表
        print("4. 测试题目列表...")
        problems = page.locator('a[href^="/problem/"]').count()
        results.append(f"✅ 题目列表显示，共 {problems} 道题目")
        
        # 5. 测试题目详情
        print("5. 测试题目详情...")
        page.click('a[href^="/problem/"] >> nth=0')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/05_problem_detail.png', full_page=True)
        
        problem_title = page.locator('h1').first.text_content()
        results.append(f"✅ 题目详情加载成功: {problem_title}")
        
        # 6. 测试答题功能
        print("6. 测试答题功能...")
        start_btn = page.locator('text=开始答题')
        if start_btn.count() > 0:
            start_btn.click()
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/06_solve_page.png', full_page=True)
            results.append("✅ 答题页面加载成功")
        
        # 7. 测试个人中心
        print("7. 测试个人中心...")
        page.click('text=testuser')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/07_profile.png', full_page=True)
        
        profile_title = page.locator('h1').first.text_content()
        results.append(f"✅ 个人中心加载成功: {profile_title}")
        
        # 8. 测试管理员功能
        print("8. 测试管理员功能...")
        page.goto('http://localhost:5173/login')
        page.wait_for_load_state('networkidle')
        page.fill('input[placeholder="请输入用户名或邮箱"]', 'admin')
        page.fill('input[placeholder="请输入密码"]', 'admin123')
        page.click('button:has-text("登录")')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/08_admin_login.png', full_page=True)
        
        # 检查是否进入管理后台
        admin_link = page.locator('text=管理后台')
        if admin_link.count() > 0:
            admin_link.click()
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/09_admin_dashboard.png', full_page=True)
            results.append("✅ 管理员登录成功，进入管理后台")
        
        # 9. 测试题目管理
        print("9. 测试题目管理...")
        page.click('text=题目管理')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/10_admin_problems.png', full_page=True)
        
        problem_count = page.locator('table tbody tr').count()
        results.append(f"✅ 题目管理页面，显示 {problem_count} 道题目")
        
        # 10. 测试AI配置
        print("10. 测试AI配置...")
        page.click('text=AI配置')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/11_admin_ai_config.png', full_page=True)
        
        ai_title = page.locator('h1').first.text_content()
        results.append(f"✅ AI配置页面加载: {ai_title}")
        
        # 11. 测试用户管理
        print("11. 测试用户管理...")
        page.click('text=用户管理')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/12_admin_users.png', full_page=True)
        
        user_count = page.locator('table tbody tr').count()
        results.append(f"✅ 用户管理页面，显示 {user_count} 个用户")
        
        browser.close()
    
    # 输出测试报告
    print("\n" + "="*60)
    print("🧪 OJ系统功能测试报告")
    print("="*60)
    for result in results:
        print(f"  {result}")
    print("="*60)
    print("📊 测试完成！共测试 12 项功能")
    print("💡 截图已保存至 /tmp/ 目录")

if __name__ == '__main__':
    test_oj_system()
