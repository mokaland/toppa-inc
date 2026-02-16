import { Hono } from 'hono';
import { cors } from 'hono/cors';
import chatApi from './api/chat'; // 新しく作成するchatApiをインポート
import reportHandler from './handlers/report'; // これは既存なのでそのまま

const app = new Hono();

app.use('*', cors());

// chatApiを/api/chatのパスでルーティング
app.route('/api/chat', chatApi);
app.route('/api/report', reportHandler); // レポートハンドラーを追加

export default app;
