import { Hono } from 'hono';
import { cors } from 'hono/cors';
import chatApi from './chat'; // chatApiをインポート

type Variables = {
  userId: string | undefined;
}

type Bindings = {
  SUPABASE_JWT_SECRET: string; // 環境変数としてJWTシークレットを想定
}

const app = new Hono<{ Variables: Variables, Bindings: Bindings }>();

app.use('*', cors());

// Supabase JWT検証ミドルウェア
app.use('/api/*', async (c, next) => {
  // 認証が不要なエンドポイントはスキップ
  if (c.req.path === '/api/auth/signup' || c.req.path === '/api/auth/signin') {
    await next();
    return;
  }

  // TODO: Supabase JWTの検証ロジックを実装
  // 現状はダミー。本番では適切な検証ロジックを実装してください。
  // const authHeader = c.req.header('Authorization');
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   return c.json({ error: 'Unauthorized' }, 401);
  // }
  // const token = authHeader.split(' ')[1];
  // try {
  //   const payload = await verify(token, c.env.SUPABASE_JWT_SECRET);
  //   c.set('userId', payload.sub); // userIdをセット
  //   await next();
  // } catch (error) {
  //   return c.json({ error: 'Invalid token' }, 401);
  // }
  c.set('userId', 'dummy-user-id'); // 一旦ダミーのuserIdをセットして進行
  await next(); // 一旦認証をスキップして進行
});

// 認証関連のエンドポイント（仮）
app.post('/api/auth/signup', async (c) => {
  // 実際のSupabase認証はフロントエンドSDKで行うため、ここではダミーレスポンス
  return c.json({ message: 'Signup endpoint (handled by client)' });
});

app.post('/api/auth/signin', async (c) => {
  // 実際のSupabase認証はフロントエンドSDKで行うため、ここではダミーレスポンス
  return c.json({ message: 'Signin endpoint (handled by client)' });
});

// chatApiをマウント
app.route('/api/chat', chatApi);

// 保護されたルートの例
app.get('/api/protected', (c) => {
  const userId = c.get('userId');
  return c.json({ message: `Hello, user ${userId || 'unknown'}! This is a protected route.` });
});

export default app;
