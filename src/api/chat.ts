import { Hono } from 'hono';
import { cors } from 'hono/cors';

const chatApi = new Hono();

chatApi.use(cors()); // chatApi全体にCORSを適用

chatApi.post('/', async (c) => {
  const body = await c.req.json();
  const userId = c.req.header('X-User-ID'); // ユーザーIDはヘッダーから取得することを想定
  const message = body.message;

  if (!userId || !message) {
    return c.json({ error: 'User ID and message are required' }, 400);
  }

  console.log(`Received message from user ${userId}: ${message}`);

  // TODO: Supabaseへの保存処理を実装
  // await supabase.from('chat_messages').insert([{ user_id: userId, role: 'user', content: message }]);

  const aiResponse = `AIからの応答: ${message}について承知しました。`;

  // TODO: SupabaseへのAI応答保存処理を実装
  // await supabase.from('chat_messages').insert([{ user_id: userId, role: 'assistant', content: aiResponse }]);

  return c.json({ response: aiResponse });
});

export default chatApi;
