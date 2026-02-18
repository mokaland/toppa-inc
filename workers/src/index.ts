import { Hono } from 'hono';
import { createReportPrompt } from './services/reportService';
import { supabaseMiddleware } from './middleware/supabase';
import { authMiddleware } from './middleware/auth';

// Cloudflare Workers の型定義
// 環境変数は wrangler.toml またはダッシュボードで設定する
type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  // AI: Ai;
}

const app = new Hono<{ Bindings: Bindings }>();

// APIルートグループ
// このグループ内のすべてのルートで、Supabaseクライアントの初期化とユーザー認証が実行される
const api = app.basePath('/api');

api.use('*', supabaseMiddleware);
api.use('*', authMiddleware);

/**
 * [要認証] AIレポート生成APIエンドポイント
 * POST /api/reports/generate
 *
 * リクエストボディ:
 * {
 *   "csvData": "CSV形式の文字列",
 *   "userInstruction": "ユーザーからの指示"
 * }
 *
 * レスポンス:
 * {
 *   "report": "AIによって生成されたMarkdown形式のレポート"
 * }
 */
api.post('/reports/generate', async (c) => {
  try {
    // authMiddlewareによって、c.get('user')で認証済みユーザー情報が取得可能
    const user = c.get('user');
    console.log(`Report generation request from user: ${user.id}`);

    const { csvData, userInstruction } = await c.req.json<{ csvData: string; userInstruction: string }>();

    if (!csvData || !userInstruction) {
      return c.json({ error: '`csvData`と`userInstruction`は必須です' }, 400);
    }

    const prompt = createReportPrompt(csvData, userInstruction);

    // TODO: AIプロバイダー連携
    const mockAiResponse = `## AIによる分析レポート（モック）
ユーザーID: ${user.id}
指示: 「${userInstruction}」

分析結果...
`;

    return c.json({ report: mockAiResponse });
  } catch (error) {
    console.error('レポート生成処理でエラーが発生しました:', error);
    return c.json({ error: 'サーバー内部でエラーが発生しました。' }, 500);
  }
});

export default app;
