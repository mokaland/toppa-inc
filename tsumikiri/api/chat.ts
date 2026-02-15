import { Hono } from 'hono';
import { verifyAuth } from './middleware/auth';

const chatApi = new Hono();

chatApi.post('/', verifyAuth, async (c) => {
  const { message } = await c.req.json();

  // ここでAIプロバイダーとの連携ロジックを実装します。
  // 現状はモック応答として、受け取ったメッセージをそのまま返します。
  const aiResponse = `「${message}」についてですね。承知いたしました。（モック応答）`;

  return c.json({ response: aiResponse });
});

export default chatApi;
