"""测试学生开始考试 + 提交答案完整流程"""
from playwright.sync_api import sync_playwright
import time, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    api_responses = []
    def handle_response(response):
        if '/api/' in response.url:
            try:
                body = response.text() if response.request.method in ['POST', 'PUT', 'DELETE'] or response.status >= 400 else ''
            except:
                body = ''
            api_responses.append({
                'url': response.url,
                'method': response.request.method,
                'status': response.status,
                'body': body[:500] if body else ''
            })
    page.on('response', handle_response)
    page.on('console', lambda msg: print(f'[CONSOLE {msg.type}] {msg.text[:200]}', flush=True))
    page.on('pageerror', lambda err: print(f'[PAGEERROR] {err}', flush=True))
    page.on('dialog', lambda d: print(f'[ALERT] {d.message}', flush=True))

    page.goto('http://localhost:5175/login')
    page.wait_for_load_state('networkidle')
    page.locator('input').first.fill('student1')
    page.locator('input[type="password"]').first.fill('123456')
    page.locator('button[type="submit"]').first.click()
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    page.locator('a:has-text("考试")').first.click()
    time.sleep(3)

    # 点击第一个"开始考试"链接
    print('=== Clicking first start exam link ===', flush=True)
    page.locator('a:has-text("开始考试")').first.click()
    time.sleep(3)
    print(f'URL: {page.url}', flush=True)
    page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test-taking-exam.png', full_page=True)

    # 查找题目编辑器
    print('\n=== Exam taking page ===', flush=True)
    h1s = page.locator('h1, h2').all()
    for h in h1s[:5]:
        try:
            print(f'  H: "{h.inner_text(timeout=200)}"', flush=True)
        except:
            pass

    # 找"提交"按钮
    submit_btn = page.locator('button:has-text("提交")').first
    submit_count = page.locator('button:has-text("提交")').count()
    print(f'Submit buttons: {submit_count}', flush=True)

    if submit_count > 0:
        print('Clicking submit...', flush=True)
        submit_btn.click()
        time.sleep(3)
        page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test-after-submit.png', full_page=True)

    print('\n=== ALL API RESPONSES (POST/PUT/error) ===', flush=True)
    for r in api_responses:
        if r['method'] in ['POST', 'PUT', 'DELETE'] or r['status'] >= 400:
            print(f"\n{r['method']} {r['url']} -> {r['status']}", flush=True)
            if r['body']:
                print(f"  Body: {r['body'][:400]}", flush=True)

    browser.close()
