import { Hono } from 'hono';
import { supabaseMiddleware } from './middleware/supabase';
import { authMiddleware } from './middleware/auth';
import { csvToJson } from './services/reportService'; // csvToJsonをインポート
import { generateReport } from './report'; // generateReportをインポート

// Cloudflare Workers の型定義
type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  OPENAI_API_KEY: string;
}

export function createWorkerApp(bindings: Bindings) {
  const app = new Hono<{ Bindings: Bindings }>();

  // APIルートグループ
  const api = app.basePath('/api');

  // Temporarily removed middleware for testing
  // api.use('*', supabaseMiddleware);
  // api.use('*', authMiddleware);

  /**
   * [要認証] AIレポート生成APIエンドポイント
   * POST /api/reports/generate
   */
  api.post('/reports/generate', async (c) => {
    try {
      const user = c.get('user');
      console.log(`Report generation request from user: ${user.id}`);

      const { csvData, userInstruction } = await c.req.json<{ csvData: string; userInstruction: string }>();

      if (!userInstruction) {
        return c.json({ error: '`userInstruction`は必須です' }, 400);
      }

      const openaiApiKey = c.env.OPENAI_API_KEY;
      const report = await generateReport(jsonData, userInstruction, openaiApiKey);

      return c.json({ report });

    } catch (error) {
      console.error('Error in /api/reports/generate:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました。';
      return c.json({ error: `レポートの生成に失敗しました: ${errorMessage}` }, 500);
    }
  });

  return app;
}

const app = createWorkerApp({
  SUPABASE_URL: (globalThis as any).SUPABASE_URL || '',
  SUPABASE_ANON_KEY: (globalThis as any).SUPABASE_ANON_KEY || '',
  OPENAI_API_KEY: (globalThis as any).OPENAI_API_KEY || '',
});

export default app;
