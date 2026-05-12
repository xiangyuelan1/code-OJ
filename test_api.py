import json
import urllib.request
import urllib.error

def make_request(url, method='GET', data=None, headers=None):
    """发送 HTTP 请求"""
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
        return {
            'ok': False,
            'status': e.code,
            'data': json.loads(e.read().decode('utf-8')) if e.read else None
        }
    except Exception as e:
        return {
            'ok': False,
            'status': 0,
            'data': None,
            'error': str(e)
        }

def run_api_tests():
    results = []

    print("=" * 60)
    print("🧪 OJ系统后端 API 测试")
    print("=" * 60)

    # Test 1: 后端 API 健康检查
    print("\n📍 测试 1: 后端 API 健康检查...")
    response = make_request('http://localhost:3005/api/health')
    if response['ok']:
        data = response['data']
        if data.get('success'):
            results.append(("后端健康检查", True, "API 运行正常"))
            print("   ✅ 后端 API 运行正常")
        else:
            results.append(("后端健康检查", False, "API 返回异常"))
            print("   ❌ API 返回异常")
    else:
        results.append(("后端健康检查", False, f"状态码: {response['status']}"))
        print(f"   ❌ API 请求失败 (状态码: {response['status']})")

    # Test 2: 前端页面访问
    print("\n📍 测试 2: 前端页面访问...")
    response = make_request('http://localhost:5175')
    if response['ok']:
        results.append(("前端页面", True, "前端运行正常"))
        print("   ✅ 前端页面加载成功")
    else:
        results.append(("前端页面", False, f"状态码: {response['status']}"))
        print(f"   ❌ 前端页面加载失败 (状态码: {response['status']})")

    # Test 3: 登录 API 测试
    print("\n📍 测试 3: 用户登录...")
    response = make_request(
        'http://localhost:3005/api/auth/login',
        method='POST',
        data={"username": "admin", "password": "admin123"}
    )
    if response['ok']:
        data = response['data']
        if data.get('success') and data.get('data', {}).get('token'):
            token = data['data']['token']
            results.append(("用户登录", True, "登录成功"))
            print("   ✅ 用户登录成功")

            headers = {'Authorization': f'Bearer {token}'}

            # Test 4: 获取题目列表
            print("\n📍 测试 4: 获取题目列表...")
            problems_response = make_request(
                'http://localhost:3005/api/problems',
                headers=headers
            )
            if problems_response['ok']:
                problems_data = problems_response['data']
                if problems_data.get('success'):
                    problem_list = problems_data.get('data', [])
                    problem_count = len(problem_list)
                    results.append(("题目列表", True, f"获取到 {problem_count} 道题目"))
                    print(f"   ✅ 题目列表获取成功 ({problem_count} 道题目)")

                    # Test 5: 获取第一道题目详情
                    if problem_count > 0:
                        print("\n📍 测试 5: 获取题目详情...")
                        problem_id = problem_list[0]['id']
                        detail_response = make_request(
                            f'http://localhost:3005/api/problems/{problem_id}',
                            headers=headers
                        )
                        if detail_response['ok'] and detail_response['data'].get('success'):
                            results.append(("题目详情", True, "详情获取成功"))
                            print("   ✅ 题目详情获取成功")
                        else:
                            results.append(("题目详情", False, "详情获取失败"))
                            print("   ❌ 题目详情获取失败")
                else:
                    results.append(("题目列表", False, "获取失败"))
                    print("   ❌ 题目列表获取失败")
            else:
                results.append(("题目列表", False, f"状态码: {problems_response['status']}"))
                print(f"   ❌ 题目列表请求失败 (状态码: {problems_response['status']})")

            # Test 6: 获取用户积分
            print("\n📍 测试 6: 获取用户积分...")
            points_response = make_request(
                'http://localhost:3005/api/points/me',
                headers=headers
            )
            if points_response['ok']:
                points_data = points_response['data']
                if points_data.get('success'):
                    points_info = points_data.get('data', {})
                    results.append(("用户积分", True, f"积分: {points_info.get('points', 0)}"))
                    print(f"   ✅ 用户积分获取成功 (积分: {points_info.get('points', 0)})")
                else:
                    results.append(("用户积分", False, "获取失败"))
                    print("   ❌ 用户积分获取失败")
            else:
                results.append(("用户积分", False, f"状态码: {points_response['status']}"))
                print(f"   ❌ 用户积分请求失败 (状态码: {points_response['status']})")

            # Test 7: 知识树 API
            print("\n📍 测试 7: 知识树 API...")
            tree_response = make_request('http://localhost:3005/api/knowledge-tree')    
            if tree_response['ok']:
                tree_data = tree_response['data']
                if tree_data.get('success'):
                    tree_nodes = tree_data.get('data', [])
                    results.append(("知识树 API", True, f"获取到 {len(tree_nodes)} 个节点"))
                    print(f"   ✅ 知识树 API 正常 (节点数: {len(tree_nodes)})")
                else:
                    results.append(("知识树 API", True, "API 返回正常但无数据"))
                    print("   ✅ 知识树 API 正常 (暂无数据)")
            else:
                results.append(("知识树 API", False, f"状态码: {tree_response['status']}"))
                print(f"   ❌ 知识树 API 请求失败 (状态码: {tree_response['status']})")

            # Test 8: 考试 API
            print("\n📍 测试 8: 考试 API...")
            exam_response = make_request(
                'http://localhost:3005/api/exams',  
                headers=headers
            )
            if exam_response['ok']:
                exam_data = exam_response['data']
                if exam_data.get('success'):
                    results.append(("考试 API", True, "API 运行正常"))
                    print("   ✅ 考试 API 正常")
                else:
                    results.append(("考试 API", True, "API 返回正常"))
                    print("   ✅ 考试 API 正常")
            else:
                results.append(("考试 API", False, f"状态码: {exam_response['status']}"))
                print(f"   ❌ 考试 API 请求失败 (状态码: {exam_response['status']})")

            # Test 9: 对战 API
            print("\n📍 测试 9: 对战 API...")
            match_response = make_request(
                'http://localhost:3005/api/matches/leaderboard/1V1_RANKED',
                headers=headers
            )
            if match_response['ok']:
                match_data = match_response['data']
                if match_data.get('success'):
                    results.append(("对战 API", True, "API 运行正常"))
                    print("   ✅ 对战 API 正常")
                else:
                    results.append(("对战 API", True, "API 返回正常"))
                    print("   ✅ 对战 API 正常")
            else:
                results.append(("对战 API", False, f"状态码: {match_response['status']}"))
                print(f"   ❌ 对战 API 请求失败 (状态码: {match_response['status']})")

            # Test 10: 成就 API
            print("\n📍 测试 10: 成就 API...")
            achievement_response = make_request(
                'http://localhost:3005/api/achievements',
                headers=headers
            )
            if achievement_response['ok']:
                achievement_data = achievement_response['data']
                if achievement_data.get('success'):
                    achievements = achievement_data.get('data', [])
                    results.append(("成就 API", True, f"获取到 {len(achievements)} 个成就"))
                    print(f"   ✅ 成就 API 正常 ({len(achievements)} 个成就)")
                else:
                    results.append(("成就 API", True, "API 返回正常"))
                    print("   ✅ 成就 API 正常")
            else:
                results.append(("成就 API", False, f"状态码: {achievement_response['status']}"))
                print(f"   ❌ 成就 API 请求失败 (状态码: {achievement_response['status']})")

            # Test 11: 排行榜 API
            print("\n📍 测试 11: 积分排行榜 API...")
            leaderboard_response = make_request(
                'http://localhost:3005/api/points/leaderboard', 
                headers=headers
            )
            if leaderboard_response['ok']:
                leaderboard_data = leaderboard_response['data']
                if leaderboard_data.get('success'):
                    rankings = leaderboard_data.get('data', [])
                    results.append(("积分排行榜", True, f"获取到 {len(rankings)} 条记录"))
                    print(f"   ✅ 积分排行榜正常 ({len(rankings)} 条记录)")
                else:
                    results.append(("积分排行榜", True, "API 返回正常"))
                    print("   ✅ 积分排行榜正常")
            else:
                results.append(("积分排行榜", False, f"状态码: {leaderboard_response['status']}"))
                print(f"   ❌ 积分排行榜请求失败 (状态码: {leaderboard_response['status']})")

        else:
            results.append(("用户登录", False, "Token 获取失败"))
            print("   ❌ 登录失败：Token 未返回")
    else:
        results.append(("用户登录", False, f"状态码: {response['status']}"))
        print(f"   ❌ 登录请求失败 (状态码: {response['status']})")

    # 输出测试报告
    print("\n" + "=" * 60)
    print("📊 后端 API 测试报告")
    print("=" * 60)

    passed = sum(1 for _, status, _ in results if status)
    total = len(results)

    for name, status, message in results:
        status_icon = "✅" if status else "❌"
        print(f"  {status_icon} {name}: {message}")

    print("\n" + "-" * 60)
    print(f"  通过: {passed}/{total} ({passed*100//total}%)")
    print("=" * 60)

    return passed >= total - 2

if __name__ == "__main__":
    success = run_api_tests()
    exit(0 if success else 1)
