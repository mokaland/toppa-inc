import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';



type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  OPENAI_API_KEY: string;
};

const app = new Hono();

app.post('/api/chat', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY } = env<Bindings>(c);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const { user_id, message } = await c.req.json();

  if (!user_id || !message) {
    return c.json({ error: 'user_id and message are required' }, 400);
  }

  // Supabaseにユーザーメッセージを保存
  const { error: userMessageError } = await supabase
    .from('chat_messages')
    .insert({ user_id, role: 'user', content: message })
    .select()
    .single();

  if (userMessageError) {
    console.error('Error saving user message:', userMessageError);
    return c.json({ error: 'Failed to save user message' }, 500);
  }

  // 会話履歴を取得 (直近のメッセージをいくつか取得)
  const { data: history, error: historyError } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', user_id)
    .order('created_at', { ascending: true })
    .limit(10); // 例: 直近10件のメッセージを取得

  if (historyError) {
    console.error('Error fetching chat history:', historyError);
    return c.json({ error: 'Failed to fetch chat history' }, 500);
  }

  const messages = history.map(msg => ({ role: msg.role, content: msg.content }));
  messages.push({ role: 'user', content: message }); // 現在のメッセージも追加

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o', // または 'gpt-3.5-turbo', 'claude-3-opus-20240229' など
      messages: messages as any, // 型を調整
    });

    const aiResponseContent = chatCompletion.choices[0].message?.content || '応答なし';

    // SupabaseにAI応答を保存
    const { error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({ user_id, role: 'assistant', content: aiResponseContent })
      .select()
      .single();

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError);
      return c.json({ error: 'Failed to save AI message' }, 500);
    }

    return c.json({ response: aiResponseContent });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return c.json({ error: 'Failed to get AI response' }, 500);
  }
});

app.get('/api/chat/history', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<Bindings>(c);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const user_id = c.req.query('user_id');

  if (!user_id) {
    return c.json({ error: 'user_id is required' }, 400);
  }

  const { data: history, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat history:', error);
    return c.json({ error: 'Failed to fetch chat history' }, 500);
  }

  return c.json({ history });
});

export default app;