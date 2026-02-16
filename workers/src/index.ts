import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { streamText } from 'hono/streaming';

type Bindings = {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Supabase REST APIを叩くヘルパー関数
async function callSupabase(
  supabaseUrl: string,
  supabaseAnonKey: string,
  method: string,
  path: string,
  body?: object,
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`, // RLS対応のため、認証後のJWTが必要だが、今回はanon keyで簡易化
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`Supabase API Error on ${path}:`, error);
    throw new Error(`Supabase API Error: ${JSON.stringify(error)}`);
  }
  return response.json();
}

app.post('/api/chat', async (c) => {
  const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = env<Bindings>(c);
  const { userId, message } = await c.req.json(); // フロントエンドからuserIdとmessageを受け取る想定

  if (!userId || !message) {
    return c.json({ error: 'userId and message are required' }, 400);
  }

  // 1. ユーザーメッセージをSupabaseに保存
  try {
    await callSupabase(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      'POST',
      'chat_messages',
      { user_id: userId, role: 'user', content: message }
    );
  } catch (error: any) {
    return c.json({ error: 'Failed to save user message to Supabase', details: error.message }, 500);
  }

  // 2. 過去の会話履歴を取得
  let chatHistory: { role: string; content: string }[] = [];
  try {
    const history = await callSupabase(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      'GET',
      `chat_messages?user_id=eq.${userId}&order=created_at.asc`
    );
    chatHistory = history.map((msg: any) => ({ role: msg.role, content: msg.content }));
  } catch (error: any) {
    console.warn('Failed to retrieve chat history from Supabase, proceeding without history:', error.message);
    // エラーが発生しても処理を続行
  }

  // AIプロバイダーへのリクエスト
  try {
    const messages = [
      { role: 'system', content: 'あなたはユーザーを支援する有能なアシスタントです。' },
      ...chatHistory, // 過去の会話履歴を含める
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        stream: false,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      return c.json({ error: 'AIプロバイダーからの応答取得に失敗しました。', details: errorData }, 500);
    }

    const data = await response.json();
    const aiResponseContent = data.choices[0].message.content;

    // 3. AI応答をSupabaseに保存
    try {
      await callSupabase(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        'POST',
        'chat_messages',
        { user_id: userId, role: 'assistant', content: aiResponseContent }
      );
    } catch (error: any) {
      console.error('Failed to save assistant message to Supabase:', error.message);
      // エラーが発生してもAI応答は返す
    }

    return c.json({ response: aiResponseContent });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return c.json({ error: 'チャット処理中にエラーが発生しました。', details: error.message }, 500);
  }
});


// レポート生成APIの実AI連携実装 (既存のコードを維持)
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
          { role: 'user', content: `以下のデータを分析し、レポートを作成してください。\nデータ:\n${fileContent}\n指示:\n${prompt}` },
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
    return c.json({ report: data.choices[0].message.content });

  } catch (error: any) {
    console.error('Report generation API Error:', error);
    return c.json({ error: 'レポート生成中にエラーが発生しました。', details: error.message }, 500);
  }
});

export default app;
