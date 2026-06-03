"""完整测试考试创建流程"""
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    api_responses = []
    def handle_response(response):
        if '/api/' in response.url:
            try:
                body = response.text() if response.request.method == 'POST' or response.status >= 400 else ''
            except:
                body = '<binary>'
            api_responses.append({
                'url': response.url,
                'method': response.request.method,
                'status': response.status,
                'body': body[:500] if body else ''
            })
    page.on('response', handle_response)

    page.on('console', lambda msg: print(f'[CONSOLE {msg.type}] {msg.text}'))
    page.on('pageerror', lambda err: print(f'[PAGEERROR] {err}'))

    # 1. 登录
    page.goto('http://localhost:5175/login')
    page.wait_for_load_state('networkidle')
    page.locator('input').first.fill('admin')
    page.locator('input[type="password"]').first.fill('admin123')
    page.locator('button[type="submit"]').first.click()
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    print(f'After login URL: {page.url}')

    # 2. 进入考试管理
    page.goto('http://localhost:5175/admin/exams')
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    # 3. 点击创建考试
    page.locator('button:has-text("创建考试")').first.click()
    time.sleep(1)

    # 4. 列出所有按钮
    print('\n=== ALL BUTTONS ===')
    for i, btn in enumerate(page.locator('button').all()):
        try:
            text = btn.inner_text(timeout=500).strip()
            visible = btn.is_visible()
            if text and visible:
                print(f'  [{i}] "{text}"')
        except:
            pass

    # 5. 填写标题
    page.locator('input[placeholder*="考试标题"]').first.fill('E2E浏览器测试')

    # 6. 选 2 个题目（checkbox 索引 18 之后开始是题目）
    # 因为前几个 checkbox 是 enableProctoring / maxAttempts 等
    # 我们直接通过 label 文本或者 problem list 选择
    print('\n=== Trying to select problems ===')
    # 找到所有 problem 名称元素
    problem_labels = page.locator('label, span, div').all()
    for elem in problem_labels:
        try:
            text = elem.inner_text(timeout=200).strip()
            # 题目以 #1, #2 等开头
            if text and len(text) < 100 and ('#' in text or '两数之和' in text or 'A+B' in text):
                print(f'  Problem: "{text[:50]}"')
        except:
            pass

    # 直接勾选最后几个 checkbox（这些应该是题目）
    checkboxes = page.locator('input[type="checkbox"]').all()
    print(f'\nTotal checkboxes: {len(checkboxes)}')
    # 最后 20 个 checkbox 应该是题目
    if len(checkboxes) > 10:
        for i in range(-2, 0):
            try:
                cb = checkboxes[i]
                if not cb.is_checked():
                    cb.check()
                    print(f'  Checked checkbox[{i}]')
            except:
                pass

    # 7. 点击提交（找文字包含"创建"的按钮，模态框底部）
    print('\n=== Clicking submit ===')
    # 找所有"创建"按钮
    submit_candidates = []
    for btn in page.locator('button').all():
        try:
            text = btn.inner_text(timeout=300).strip()
            if '创建' in text and len(text) < 20:
                submit_candidates.append((btn, text))
        except:
            pass

    print(f'  Found {len(submit_candidates)} "创建" buttons')
    for btn, text in submit_candidates:
        print(f'    "{text}"')

    if submit_candidates:
        # 点击最后一个（应该是模态框的提交按钮）
        submit_candidates[-1][0].click()
        time.sleep(3)

    page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test-after-submit.png', full_page=True)

    # 8. 报告所有 POST 响应
    print('\n=== POST RESPONSES ===')
    for r in api_responses:
        if r['method'] == 'POST':
            print(f"\n{r['method']} {r['url']} -> {r['status']}")
            if r['body']:
                print(f"  Body: {r['body'][:500]}")

    # 9. 看是否有 alert 弹窗
    page.on('dialog', lambda d: print(f'[ALERT] {d.message}'))
    time.sleep(1)

    browser.close()
