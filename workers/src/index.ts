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
  const aiResponseContent = `AIからの応答: ${message}`;

  // AI応答を保存
  const { data: aiMessage, error: aiMessageError } = await supabase
    .from('chat_messages')
    .insert([{ user_id: userId, role: 'assistant', content: aiResponseContent }])
    .select();

  if (aiMessageError) {
    console.error('Error saving AI message:', aiMessageError);
    return c.json({ error: 'Failed to save AI message' }, 500);
  }

  return c.json({ response: aiResponseContent });
});

// POST /api/upload エンドポイント
app.post('/api/upload', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<Bindings>(c);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return c.json({ error: 'Supabase environment variables are not set' }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const filename = c.req.query('filename');
  if (!filename) {
    return c.json({ error: 'filename query parameter is required' }, 400);
  }

  const contentType = c.req.header('Content-Type');
  if (!contentType) {
    return c.json({ error: 'Content-Type header is required' }, 400);
  }

  const fileBuffer = await c.req.arrayBuffer();
  if (!fileBuffer) {
    return c.json({ error: 'File data is empty' }, 400);
  }

  try {
    // Supabase Storageにファイルをアップロード
    // 'files' はバケット名。必要に応じて変更する。
    const { data, error } = await supabase.storage
      .from('files')
      .upload(filename, fileBuffer, { contentType, upsert: true }); // upsert: true で同名ファイルの上書きを許可

    if (error) {
      console.error('Error uploading file to Supabase Storage:', error);
      return c.json({ error: `Failed to upload file: ${error.message}` }, 500);
    }

    return c.json({ message: 'File uploaded successfully', path: data.path });
  } catch (e) {
    console.error('Unexpected error during file upload:', e);
    return c.json({ error: 'Internal server error during file upload' }, 500);
  }
});

export default app;
