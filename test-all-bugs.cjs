const http = require('http');

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: 'localhost', port: 3005, path, method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

(async () => {
  const loginRes = await api('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  const token = JSON.parse(loginRes.body).data?.token;
  if (!token) { console.log('Login failed'); return; }
  console.log('1. Login OK');

  /* Bug 1: Exam list (creator field) */
  const exams = await api('GET', '/api/exams', null, token);
  const examOk = exams.status === 200;
  console.log('2. Exam list (creator field):', examOk ? 'PASS' : 'FAIL', examOk ? '' : exams.body.substring(0, 120));

  /* Bug 1: Exam creation */
  const createExam = await api('POST', '/api/exams', {
    title: 'Test Exam',
    type: 'PRACTICE',
    duration: 60,
    maxAttempts: 1,
  }, token);
  const examCreateOk = createExam.status === 201;
  console.log('3. Exam create:', examCreateOk ? 'PASS' : 'FAIL', examCreateOk ? '' : createExam.body.substring(0, 150));

  /* Bug 2: Solved problems */
  const solved = await api('GET', '/api/submissions/solved-problems', null, token);
  const solvedOk = solved.status === 200;
  console.log('4. Solved problems:', solvedOk ? 'PASS' : 'FAIL', solvedOk ? '(count: ' + JSON.parse(solved.body).data.length + ')' : solved.body.substring(0, 120));

  /* Bug 3: Learning admin stats */
  const stats = await api('GET', '/api/learning-admin/stats', null, token);
  const statsOk = stats.status === 200;
  console.log('5. Learning admin stats:', statsOk ? 'PASS' : 'FAIL', statsOk ? '' : stats.body.substring(0, 120));

  /* Bug 4: Promotion create */
  const promo = await api('POST', '/api/promotions', {
    code: 'TESTPROMO2026',
    name: 'Test Promotion',
    type: 'PERCENTAGE',
    value: 20,
    maxUses: 100,
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  }, token);
  const promoOk = promo.status === 200 || promo.status === 201;
  console.log('6. Promotion create:', promoOk ? 'PASS' : 'FAIL', promoOk ? '' : promo.body.substring(0, 150));

  /* Summary */
  const all = [examOk, examCreateOk, solvedOk, statsOk, promoOk];
  console.log('\n=== Summary: ' + all.filter(Boolean).length + '/' + all.length + ' passed ===');
})().catch((e) => console.error('Error:', e));
