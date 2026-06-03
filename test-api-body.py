"""捕获实际API响应数据"""
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    exam_responses = []
    def handle_response(response):
        if '/api/exams' in response.url and response.request.method == 'GET':
            try:
                body = response.text()
                exam_responses.append({'url': response.url, 'status': response.status, 'body': body[:2000]})
            except:
                pass
    page.on('response', handle_response)
    page.on('console', lambda msg: print(f'[CONSOLE {msg.type}] {msg.text[:200]}'))

    # 学生登录
    page.goto('http://localhost:5175/login')
    page.wait_for_load_state('networkidle')
    page.locator('input').first.fill('student1')
    page.locator('input[type="password"]').first.fill('123456')
    page.locator('button[type="submit"]').first.click()
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    # 进入考试中心
    page.locator('a:has-text("考试")').first.click()
    time.sleep(3)

    print('=== EXAM API RESPONSES ===')
    for r in exam_responses:
        print(f"\n{r['url']} -> {r['status']}")
        print(f"Body: {r['body']}")

    browser.close()
