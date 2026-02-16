import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';

const chatApi = new Hono();

chatApi.use(cors()); // chatApi全体にCORSを適用

// Supabaseクライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided as environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

chatApi.post('/', async (c) => {
  const body = await c.req.json();
  const userId = c.req.header('X-User-ID'); // ユーザーIDはヘッダーから取得することを想定
  const message = body.message;

  if (!userId || !message) {
    return c.json({ error: 'User ID and message are required' }, 400);
  }

  console.log(`Received message from user ${userId}: ${message}`);

  // ユーザーメッセージをSupabaseに保存
  const { error: userMessageError } = await supabase
    .from('chat_messages')
    .insert([{ user_id: userId, role: 'user', content: message }]);

  if (userMessageError) {
    console.error('Error saving user message to Supabase:', userMessageError);
    return c.json({ error: 'Failed to save user message.' }, 500);
  }

  // ここでAIプロバイダーへのリクエスト処理を実装
  // 仮のAI応答
  const aiResponse = `AIからの応答: ${message}について承知しました。`;

  // AI応答をSupabaseに保存
  const { error: aiMessageError } = await supabase
    .from('chat_messages')
    .insert([{ user_id: userId, role: 'assistant', content: aiResponse }]);

  if (aiMessageError) {
    console.error('Error saving AI message to Supabase:', aiMessageError);
    return c.json({ error: 'Failed to save AI message.' }, 500);
  }

  return c.json({ response: aiResponse });
});

// 会話履歴取得API
chatApi.get('/history', async (c) => {
  const userId = c.req.header('X-User-ID');

  if (!userId) {
    return c.json({ error: 'User ID is required' }, 400);
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat history from Supabase:', error);
    return c.json({ error: 'Failed to fetch chat history.' }, 500);
  }

  return c.json({ history: data });
});

export default chatApi;
