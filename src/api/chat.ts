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

  // OpenAI APIを使ってAI応答を生成
  const openAiApiKey = c.env.OPENAI_API_KEY; // 環境変数から取得
  if (!openAiApiKey) {
    return c.json({ error: 'OpenAI API Key is not configured.' }, 500);
  }

  try {
    const chatHistoryResponse = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (chatHistoryResponse.error) {
      console.error('Error fetching chat history from Supabase:', chatHistoryResponse.error);
      return c.json({ error: 'Failed to fetch chat history for AI.' }, 500);
    }

    // OpenAI APIのmessages形式に変換
    const messages = chatHistoryResponse.data.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user', // SupabaseのroleをOpenAIのroleにマッピング
      content: msg.content,
    }));

    messages.push({ role: 'user', content: message }); // 現在のユーザーメッセージを追加

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // 利用するモデルを指定
        messages: messages,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return c.json({ error: 'Failed to get response from AI provider.', details: errorData }, openaiResponse.status);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    // AI応答をSupabaseに保存
    const { error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert([{ user_id: userId, role: 'assistant', content: aiResponse }]);

    if (aiMessageError) {
      console.error('Error saving AI message to Supabase:', aiMessageError);
      return c.json({ error: 'Failed to save AI message.' }, 500);
    }

    return c.json({ response: aiResponse });

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return c.json({ error: 'An internal server error occurred.' }, 500);
  }
});

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
    console.error('Error fetching chat history:', error);
    return c.json({ error: 'Failed to fetch chat history.' }, 500);
  }

  return c.json({ history: data });
});

export default chatApi;
