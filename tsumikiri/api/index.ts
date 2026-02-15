
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { createClient } from '@supabase/supabase-js';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  JWT_SECRET: string; // JWTの検証に使用するシークレットキー
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// Supabaseクライアントの初期化（Workers環境変数を使用）
const getSupabaseClient = (env: Bindings) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
};

// 認証ミドルウェア
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const supabase = getSupabaseClient(c.env);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    c.set('user', user); // ユーザー情報をコンテキストに保存
    await next();
  } catch (e) {
    return c.json({ error: 'Authentication failed' }, 401);
  }
});

// 例: 保護されたルート
app.get('/api/protected', (c) => {
  const user = c.get('user');
  return c.json({ message: `Hello, ${user.email}! This is a protected route.`, user });
});

app.get('/', (c) => c.text('Hello Hono!'));

export default app;
