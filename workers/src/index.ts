import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { streamText } from 'hono/streaming';

type Bindings = {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// チャットAPIの既存部分（仮）
app.post('/api/chat', async (c) => {
  // ... 既存チャットロジック ...
  return c.json({ message: 'Chat response (dummy)' });
});

// レポート生成APIの実AI連携実装
app.post('/api/report/generate', async (c) => {
  const { OPENAI_API_KEY } = env<Bindings>(c);
  const { fileContent, prompt } = await c.req.json();

  // AIプロバイダーへのリクエスト（OpenAIを想定）
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // 技術方針書に基づきOpenAI GPT-4oを選定
        messages: [
          { role: 'system', content: 'あなたはデータ分析とレポート生成を支援する有能なアシスタントです。ユーザーの指示に従い、提供されたデータから分かりやすい日本語のレポートを作成してください。' },
          { role: 'user', content: `以下のデータを分析し、レポートを作成してください。
データ:
${fileContent}
指示:
${prompt}` },
        ],
        stream: false,
        max_tokens: 2000, // レポートの長さを考慮して設定
        temperature: 0.7, // 創造性と一貫性のバランス
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      return c.json({ error: 'AIプロバイダーからのレポート生成に失敗しました。', details: errorData }, 500);
    }

    const data = await response.json();
    const aiReport = data.choices[0].message.content;

    // Supabaseにレポート結果を保存するロジック（後で実装、今回はスキップ）
    // ...

    return c.json({ report: aiReport });
  } catch (error) {
    console.error('AIレポート生成中にエラーが発生しました:', error);
    return c.json({ error: 'AIレポート生成中にサーバー内部エラーが発生しました。' }, 500);
  }
});

export default app;