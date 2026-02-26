import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai'; // Import OpenAI directly

type Env = {
  Variables: {
    userId: string | undefined;
  };
  Bindings: {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    GEMINI_API_KEY: string; // Ensure this is present if needed for other AI models
    OPENAI_API_KEY: string; // Although fetched from user_settings, keeping it for consistency if a fallback is needed
  }; 
}

const chatApi = new Hono<Env>();

chatApi.post('/', async (c) => {
  const { messages } = await c.req.json();
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Use c.env for Supabase client initialization
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  // ユーザー設定からAPIキーを取得 (仮の実装)
  const { data: userSettings, error: settingsError } = await supabase
    .from('user_settings')
    .select('openai_api_key')
    .eq('user_id', userId)
    .single();

  if (settingsError || !userSettings?.openai_api_key) {
    return c.json({ error: 'OpenAI API Key not found for user.' }, 400);
  }
  const openaiApiKey = userSettings.openai_api_key;

  // 会話履歴をSupabaseに保存 (ユーザーメッセージ)
  await supabase.from('chat_messages').insert({
    user_id: userId,
    role: 'user',
    content: messages[messages.length - 1].content,
  });

  // OpenAI APIへのリクエスト (using OpenAI client)
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      stream: true,
    });

    let assistantResponseContent = '';
    for await (const chunk of stream) {
      assistantResponseContent += chunk.choices[0]?.delta?.content || '';
    }

    // 会話履歴をSupabaseに保存 (アシスタントメッセージ)
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      content: assistantResponseContent,
    });

    return c.json({ response: assistantResponseContent });

  } catch (error) {
    console.error('Error during AI chat:', error);
    return c.json({ error: `Error: ${(error as Error).message}` }, 500);
  }
});

chatApi.get('/history', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Use c.env for Supabase client initialization
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

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
  } catch (error: any) {
    console.error('Error in chat history endpoint:', error);
    return c.json({ error: `Error: ${(error as Error).message}` }, 500);
  }
});

export default chatApi;
