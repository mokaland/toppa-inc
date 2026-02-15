import { Hono } from 'hono';
import { supabase } from '../src/lib/supabase'; // Supabaseクライアントを共有

const chatApi = new Hono();

chatApi.post('/', async (c) => {
  const { message, userId } = await c.req.json();

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400);
  }

  // ダミーのAI応答
  const aiResponseContent = `AIからの応答: ${message}についてですね。`;

  // 会話履歴をSupabaseに保存
  try {
    // ユーザーメッセージの保存
    const { error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({ user_id: userId, role: 'user', content: message });

    if (userMessageError) throw userMessageError;

    // AI応答の保存
    const { error: assistantMessageError } = await supabase
      .from('chat_messages')
      .insert({ user_id: userId, role: 'assistant', content: aiResponseContent });
    
    if (assistantMessageError) throw assistantMessageError;

  } catch (error: any) {
    console.error('Failed to save chat message:', error.message);
    return c.json({ error: 'Failed to save chat message' }, 500);
  }

  return c.json({ response: aiResponseContent });
});

chatApi.get('/history', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) {
    return c.json({ error: 'userId is required' }, 400);
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return c.json({ history: data });
  } catch (error: any) {
    console.error('Failed to fetch chat history:', error.message);
    return c.json({ error: 'Failed to fetch chat history' }, 500);
  }
});

export default chatApi;
