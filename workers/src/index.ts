import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { createClient } from '@supabase/supabase-js';

// 環境変数の型定義
type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  AI_PROVIDER_API_KEY: string; // AIプロバイダー連携時に追加
};

const app = new Hono();

// グローバルエラーハンドリングミドルウェア
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// POST /api/chat エンドポイント (既存)
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
  const aiResponseContent = `AIからの応答: ${message}`; // とりあえずオウム返し

  // AI応答を保存
  const { data: aiMessage, error: aiMessageError } = await supabase
    .from('chat_messages')
    .insert([{ user_id: userId, role: 'ai', content: aiResponseContent }])
    .select();

  if (aiMessageError) {
    console.error('Error saving AI message:', aiMessageError);
    return c.json({ error: 'Failed to save AI message' }, 500);
  }

  return c.json({ response: aiResponseContent });
});

// POST /api/report エンドポイント (既存)
app.post('/api/report', async (c) => {
  // TODO: レポート生成ロジックを実装
  // 現状はダミーレスポンスを返す
  return c.json({ message: 'レポート生成リクエストを受け付けました（ダミー）' });
});

// POST /api/upload エンドポイント (新規追加)
app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file'); // 'file' はフォームフィールド名

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file uploaded or file is not valid' }, 400);
    }

    // ファイル名とサイズを取得
    const fileName = file.name;
    const fileSize = file.size;

    return c.json({
      message: 'ファイルアップロード成功',
      fileName: fileName,
      fileSize: fileSize,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return c.json({ error: 'File upload failed' }, 500);
  }
});

export default app;
