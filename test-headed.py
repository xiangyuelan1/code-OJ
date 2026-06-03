"""查找考试页面具体 DOM"""
from playwright.sync_api import sync_playwright
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = context.new_page()

    page.on('console', lambda msg: print(f'[CONSOLE {msg.type}] {msg.text[:200]}', flush=True))
    page.on('pageerror', lambda err: print(f'[PAGEERROR] {err}', flush=True))

    page.goto('http://localhost:5175/login')
    page.wait_for_load_state('networkidle')
    page.locator('input').first.fill('student1')
    page.locator('input[type="password"]').first.fill('123456')
    page.locator('button[type="submit"]').first.click()
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    page.locator('a:has-text("考试")').first.click()
    time.sleep(5)

    # 关键检查
    h1_count = page.locator('h1:has-text("考试中心")').count()
    print(f'Exam center h1 count: {h1_count}', flush=True)

    # 查找 "进行中" 文字
    active_count = page.locator('text=进行中').count()
    print(f'Active status count: {active_count}', flush=True)

    # 找开始考试链接
    start_links = page.locator('a:has-text("开始考试")').count()
    print(f'Start exam links: {start_links}', flush=True)

    # 找"加载中"
    loading = page.locator('text=加载中').count()
    print(f'Loading: {loading}', flush=True)

    # 找错误
    err = page.locator('text=获取考试列表失败').count()
    print(f'Error text: {err}', flush=True)

    # 找所有 h1/h2/h3
    heads = page.locator('h1, h2, h3').all()
    print(f'Head count: {len(heads)}', flush=True)
    for h in heads[:10]:
        try:
            print(f'  "{h.inner_text(timeout=200)}"', flush=True)
        except:
            pass

    page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test-final.png', full_page=True)

    browser.close()
