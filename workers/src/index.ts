import { Hono } from 'hono';
import { createReportPrompt } from './services/reportService';

// Cloudflare Workers の型定義
// 環境変数は wrangler.toml またはダッシュボードで設定する
type Bindings = {
  // 例:
  // AI: Ai;
  // DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>();

/**
 * AIレポート生成APIエンドポイント
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
app.post('/api/reports/generate', async (c) => {
  try {
    const { csvData, userInstruction } = await c.req.json<{ csvData: string; userInstruction: string }>();

    if (!csvData || !userInstruction) {
      return c.json({ error: '`csvData`と`userInstruction`は必須です' }, 400);
    }

    // reportService を使ってAIへのプロンプトを生成
    const prompt = createReportPrompt(csvData, userInstruction);

    // TODO: ここでAIプロバイダー (OpenAI, Anthropic, Cloudflare AI Gateway等) にリクエストを送信する
    //       c.env.AI などを利用する
    const mockAiResponse = `## AIによる分析レポート（モック）

ユーザーの指示「${userInstruction}」に基づき、分析を行いました。

**これはモック応答です。実際のAI連携は未実装です。**

生成されたプロンプト（デバッグ用）:
\`\`\`
${prompt}
\`\`\`
`;

    return c.json({ report: mockAiResponse });
  } catch (error) {
    // ログ記録（実際の環境ではより詳細なロギングサービスを利用する）
    console.error('レポート生成処理でエラーが発生しました:', error);
    return c.json({ error: 'サーバー内部でエラーが発生しました。' }, 500);
  }
});

export default app;
