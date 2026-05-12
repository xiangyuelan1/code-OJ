import json
import urllib.request

def make_request(url, method='GET', data=None, headers=None):
    if headers is None:
        headers = {}

    if data and method == 'POST':
        data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'

    try:
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=10) as response:
            return {
                'ok': True,
                'status': response.status,
                'data': json.loads(response.read().decode('utf-8'))
            }
    except urllib.error.HTTPError as e:
        try:
            return {
                'ok': False,
                'status': e.code,
                'data': json.loads(e.read().decode('utf-8'))
            }
        except:
            return {
                'ok': False,
                'status': e.code,
                'data': None
            }
    except Exception as e:
        return {
            'ok': False,
            'status': 0,
            'data': None,
            'error': str(e)
        }

print("=" * 60)
print("🔍 积分 API 调试 v2")
print("=" * 60)

# 1. 登录获取 token
print("\n📍 登录获取 Token...")
login_response = make_request(
    'http://localhost:3005/api/auth/login',
    method='POST',
    data={"username": "admin", "password": "admin123"}
)

if login_response['ok']:
    data = login_response['data']
    if data.get('success'):
        token = data['data']['token']
        print(f"   ✅ Token 获取成功")
        headers = {'Authorization': f'Bearer {token}'}

        # 2. 测试 debug 端点（不需要认证）
        print("\n📍 测试 Debug 端点...")
        debug_response = make_request('http://localhost:3005/api/points/debug')
        print(f"   状态码: {debug_response['status']}")
        print(f"   响应: {debug_response['data']}")

        # 3. 测试积分 API
        print("\n📍 测试积分 API...")
        points_response = make_request(
            'http://localhost:3005/api/points/me',
            headers=headers
        )
        print(f"   状态码: {points_response['status']}")
        print(f"   响应: {json.dumps(points_response['data'], indent=2, ensure_ascii=False)}")
    else:
        print("   ❌ 登录失败")
else:
    print(f"   ❌ 登录请求失败 (状态码: {login_response['status']})")
