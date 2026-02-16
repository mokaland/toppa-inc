import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { streamText } from 'hono/streaming';
import { createClient } from '@supabase/supabase-js'; // Supabaseクライアントをインポート

type Bindings = {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Supabaseクライアントの初期化（HonoのContextから環境変数を取得）
const getSupabaseClient = (c: any) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<Bindings>(c);
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};

app.post('/api/chat', async (c) => {
  const { OPENAI_API_KEY } = env<Bindings>(c);
  const supabase = getSupabaseClient(c);
  const { userId, message } = await c.req.json();

  if (!userId || !message) {
    return c.json({ error: 'userId and message are required' }, 400);
  }

  // 1. ユーザーメッセージをSupabaseに保存
  const { error: userMsgError } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, role: 'user', content: message });

  if (userMsgError) {
    console.error('Error saving user message to Supabase:', userMsgError);
    return c.json({ error: 'Failed to save user message' }, 500);
  }

  // 2. OpenAI APIにリクエストを送信し、ストリーミングで応答を処理
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o', // または他の適切なモデル
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message }
      ],
      stream: true,
    }),
  });

  if (!openaiResponse.ok) {
    const errorBody = await openaiResponse.text();
    console.error('OpenAI API Error:', errorBody);
    return c.json({ error: 'Failed to get response from AI' }, 500);
  }

  let aiResponseContent = '';
  return streamText(c, async (stream) => {
    const reader = openaiResponse.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      // ストリーミングデータを処理し、AI応答を構築
      // ここでは簡易的にチャンクをそのまま結合していますが、
      // 実際にはSSE (Server-Sent Events) 形式のパースが必要です。
      // 例: data: {"id":"chatcmpl-...", "object":"chat.completion.chunk", ...}
      // また、エラーハンドリングも強化する必要があります。
      aiResponseContent += chunk; // 暫定的に全て結合

      // クライアントにストリーミングで送信
      stream.write(chunk);
    }

    // 3. AI応答をSupabaseに保存
    const { error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({ user_id: userId, role: 'assistant', content: aiResponseContent });

    if (aiMsgError) {
      console.error('Error saving AI message to Supabase:', aiMsgError);
      // ここでエラーが発生しても、クライアントには既にストリーミングされているため、
      // エラーを返すのではなく、ログに記録するに留めます。
    }
  });
});

// GET /api/chat/history - 会話履歴の取得
app.get('/api/chat/history', async (c) => {
  const supabase = getSupabaseClient(c);
  const userId = c.req.query('userId'); // クエリパラメータからuserIdを取得

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400);
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat history from Supabase:', error);
    return c.json({ error: 'Failed to fetch chat history' }, 500);
  }

  return c.json(data);
});

// GET /api/chat/history/:sessionId は、現状sessionIdの概念がないためスキップ
// 必要に応じて、chat_messagesテーブルにsessionIdカラムを追加し、
// それを元にフィルタリングするロジックを実装する。

export default app;
