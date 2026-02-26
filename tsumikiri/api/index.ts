import { Hono } from 'hono';
import { cors } from 'hono/cors';
import chatApi from './chat';
import { supabaseMiddleware } from './middleware/supabase';
import { authMiddleware } from './middleware/auth';
import csvUpload from '../../../src/handlers/csvUpload';
import report from '../../../src/handlers/report';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

type Variables = {
  userId: string | undefined;
}

type Bindings = {
  SUPABASE_JWT_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
}

const app = new Hono<{ Variables: Variables, Bindings: Bindings }>();

app.use('*', cors());

// APIルートグループ
const api = app.basePath('/api');

// Apply general middlewares
api.use('*', supabaseMiddleware);

// Supabase JWT検証ミドルウェア (from tsumikiri/api/index.ts)
// The authMiddleware from workers/src/middleware/auth should be integrated with this.
// For now, I'm keeping the dummy userId setting and then applying the authMiddleware.
api.use('*', async (c, next) => {
  // 認証が不要なエンドポイントはスキップ
  if (c.req.path === '/api/auth/signup' || c.req.path === '/api/auth/signin') {
    await next();
    return;
  }

  // Original dummy userId setting
  c.set('userId', 'dummy-user-id');
  await next();
});

// Now apply the authMiddleware from the moved workers/src/middleware
api.use('*', authMiddleware);


// 認証関連のエンドポイント（仮）
api.post('/auth/signup', async (c) => {
  return c.json({ message: 'Signup endpoint (handled by client)' });
});

api.post('/auth/signin', async (c) => {
  return c.json({ message: 'Signin endpoint (handled by client)' });
});

// Mount CSV upload and report generation handlers
api.route('/csv', csvUpload);
api.route('/reports', report);

// Mount chatApi (existing)
api.route('/chat', chatApi);




// 保護されたルートの例
api.get('/protected', (c) => {
  const userId = c.get('userId');
  return c.json({ message: `Hello, user ${userId || 'unknown'}! This is a protected route.` });
});

export default app;
