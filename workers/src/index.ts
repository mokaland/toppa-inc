import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { createClient } from '@supabase/supabase-js';

// 環境変数の型定義
type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  // AI_PROVIDER_API_KEY: string; // 将来的にAIプロバイダー連携時に追加
};

const app = new Hono();

// グローバルエラーハンドリングミドルウェア
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// POST /api/chat エンドポイント
app.post('/api/chat', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<Bindings>(c);
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return c.json({ error: 'Supabase environment variables are not set' }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { userId, message } = await c.req.json();

  if (!userId || !message) {
    return c.json({ error: 'userId and message are required' }, 400);
  }

  // ユーザーメッセージを保存
  const { data: userMessage, error: userMessageError } = await supabase
    .from('chat_messages')
    .insert([{ user_id: userId, role: 'user', content: message }])
    .select();

  if (userMessageError) {
    console.error('Error saving user message:', userMessageError);
    return c.json({ error: 'Failed to save user message' }, 500);
  }

  // AI応答をモック（実際にはAIプロバイダーにリクエスト）
  // TODO: AIプロバイダーとの実際の連携を実装する
  // 例:
  // const aiProvider = new OpenAI(AI_PROVIDER_API_KEY);
  // const aiResponse = await aiProvider.chat.completions.create({...});
  const aiResponseContent = `AIアシスタントからの応答: "${message}" についてですね。現在、この機能は開発中です。`;

  // AI応答を保存
  const { data: aiMessage, error: aiMessageError } = await supabase
    .from('chat_messages')
    .insert([{ user_id: userId, role: 'assistant', content: aiResponseContent }])
    .select();

  if (aiMessageError) {
    console.error('Error saving AI message:', aiMessageError);
    return c.json({ error: 'Failed to save AI message' }, 500);
  }

  return c.json({
    userMessage: userMessage[0],
    aiMessage: aiMessage[0],
  });
});

// GET /api/chat/history エンドポイント (追加)
app.get('/api/chat/history', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<Bindings>(c);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return c.json({ error: 'Supabase environment variables are not set' }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { userId } = c.req.query();

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400);
  }

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat history:', error);
    return c.json({ error: 'Failed to fetch chat history' }, 500);
  }

  return c.json({ history: messages });
});

export default app;
