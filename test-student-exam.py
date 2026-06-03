"""通过完整用户流程测试学生考试"""
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    api_responses = []
    page.on('response', lambda r: api_responses.append(f'{r.request.method} {r.url} -> {r.status}'))
    page.on('console', lambda msg: print(f'[CONSOLE {msg.type}] {msg.text[:200]}'))
    page.on('pageerror', lambda err: print(f'[PAGEERROR] {err}'))
    page.on('dialog', lambda d: print(f'[ALERT] {d.message}'))

    # 1. 学生登录
    page.goto('http://localhost:5175/login')
    page.wait_for_load_state('networkidle')
    page.locator('input').first.fill('student1')
    page.locator('input[type="password"]').first.fill('123456')
    page.locator('button[type="submit"]').first.click()
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    print(f'After login URL: {page.url}')

    # 2. 停留一会儿看默认页面
    time.sleep(2)
    page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test-after-login.png', full_page=True)

    # 3. 找包含"考试"或"exam"的链接
    print('\n=== Looking for exam nav link ===')
    for elem in page.locator('a, button').all():
        try:
            text = elem.inner_text(timeout=200).strip()
            if text and ('考试' in text or 'exams' in text.lower()):
                href = elem.get_attribute('href') if elem.evaluate('el => el.tagName') == 'A' else None
                print(f'  "{text}" href={href}')
        except:
            pass

    # 4. 点击"考试中心"或类似
    exam_link = page.locator('a:has-text("考试")').first
    if exam_link.count() > 0:
        print('Clicking exam link...')
        exam_link.click()
        time.sleep(3)
        print(f'URL: {page.url}')
        page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test-exam-page-v2.png', full_page=True)
    else:
        print('No exam link found, trying direct nav...')
        page.goto('http://localhost:5175/exams')
        time.sleep(3)
        page.screenshot(path='d:/桌面/TRAESOLO/OJ/开发OJ系统/test-exams-direct.png', full_page=True)

    # 5. 看页面文字
    print('\n=== Page text ===')
    try:
        text = page.locator('body').inner_text(timeout=2000)
        print(text[:800])
    except:
        pass

    # 6. 报告所有 API 响应
    print('\n=== ALL API RESPONSES ===')
    for r in api_responses:
        if 'exam' in r.lower() or r.endswith('-> 0'):
            print(f'  {r}')

    browser.close()
