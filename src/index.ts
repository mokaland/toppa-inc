import { Hono } from 'hono';
import { cors } from 'hono/cors';
// import { authMiddleware } from './middlewares/auth'; // 認証ミドルウェア (仮)
import chatHandler from './handlers/chat';
import reportHandler from './handlers/report';

const app = new Hono();

app.use('*', cors());
// app.use('/api/*', authMiddleware); // 認証が必要なAPIに適用

app.route('/api/chat', chatHandler);
app.route('/api/report', reportHandler); // レポートハンドラーを追加

export default app;
