/**
 * local server entry file, for local development
 */
import app from './app.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // 允许内网访问

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server ready on http://${HOST}:${PORT}`);
  console.log(`📡 LAN访问地址: http://你的IP地址:${PORT}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;