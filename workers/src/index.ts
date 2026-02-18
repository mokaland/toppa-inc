import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleGenerateReport } from './handlers/reportHandler';

// 環境変数の型定義
type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  AI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// すべてのルートにCORSミドルウェアを適用
app.use('*', cors({
  origin: '*', // TODO: 本番環境では特定のドメインに制限する
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ヘルスチェック用エンドポイント
app.get('/', (c) => c.text('TOPPA Inc. API is running!'));

// モックのユーザー情報エンドポイント
app.get('/auth/user', async (c) => {
  // TODO: Supabaseクライアントを初期化して実際のユーザー情報を取得する
  return c.json({ user: { id: 'mock-user-id', email: 'test@example.com' }});
});


/**
 * AIレポート生成エンドポイント (CSVファイルアップロード対応)
 * multipart/form-data でファイルとプロンプトを受け取る
 */
app.post('/report', handleGenerateReport);


export default app;
