import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateReport } from './report';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  AI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// CORSミドルウェア
app.use('*', cors());


app.get('/auth/user', async (c) => {
  // TODO: Supabaseクライアントを初期化して実際のユーザー情報を取得する
  // 現在はモックを返却
  return c.json({ user: { id: 'mock-user-id', email: 'test@example.com' }});
});


/**
 * AIレポート生成エンドポイント
 * リクエストボディ: { jsonData: string, userPrompt: string }
 */
app.post('/report', async (c) => {
  try {
    const { jsonData, userPrompt } = await c.req.json();
    
    if (typeof jsonData !== 'string' || typeof userPrompt !== 'string') {
        return c.jon({ error: 'jsonDataとuserPromptは文字列である必要があります。' }, 400);
    }

    const aiApiKey = c.env.AI_API_KEY;

    const report = await generateReport(jsonData, userPrompt, aiApiKey);

    return c.json({ report });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました。';
    return c.json({ error: `レポート生成に失敗しました: ${errorMessage}` }, 500);
  }
});

export default app;
