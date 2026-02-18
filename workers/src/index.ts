import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleGenerateReport } from './handlers/reportHandler';
import { authMiddleware } from './middleware/auth';

// 環境変数の型定義
export type Bindings = {
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

// --- Public Routes ---
// ヘルスチェック用エンドポイント
app.get('/', (c) => c.text('TOPPA Inc. API is running!'));
// TODO: サインアップ、ログインのエンドポイントをここに配置する

// --- Protected Routes ---
const protectedRoutes = new Hono<{ Bindings: Bindings }>();
protectedRoutes.use('*', authMiddleware());

// 認証済みユーザー情報を返すエンドポイント
protectedRoutes.get('/me', (c) => {
  const user = c.get('user');
  return c.json({ user });
});

/**
 * AIレポート生成エンドポイント (CSVファイルアップロード対応)
 * multipart/form-data でファイルとプロンプトを受け取る
 */
protectedRoutes.post('/report', handleGenerateReport);

// ルーターに保護されたルートを登録
app.route('/', protectedRoutes);


export default app;
