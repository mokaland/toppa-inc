import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verify } from 'hono/jwt';

const app = new Hono();

app.use('*', cors());

// Supabase JWT検証ミドルウェア
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/auth/signup' || c.req.path === '/api/auth/signin') {
    await next();
    return;
  }
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.split(' ')[1];
    // Supabase JWTの検証は実際にはSupabase SDKで行うか、JWT secretを使って検証します。
    // ここでは簡易的にモックとしていますが、本番では適切な検証ロジックを実装してください。
    // 例: const payload = await verify(token, c.env.SUPABASE_JWT_SECRET);
    // c.set('user', payload.sub);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
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

// 保護されたルートの例
app.get('/api/protected', (c) => {
  const user = c.get('user');
  return c.json({ message: `Hello, user ${user || 'unknown'}! This is a protected route.` });
});

export default app;
