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

  const createExam = await api('POST', '/api/exams', {
    title: 'Test Exam',
    description: 'A test exam',
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 7200000).toISOString(),
    duration: 60,
    maxAttempts: 1,
  }, token);
  console.log('Full error:', createExam.body);
})().catch((e) => console.error('Error:', e));
