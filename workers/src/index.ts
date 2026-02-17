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
  const aiResponseContent = `AIからの返信: ${message}`;
  const { data: aiMessage, error: aiMessageError } = await supabase
    .from('chat_messages')
    .insert([{ user_id: userId, role: 'ai', content: aiResponseContent }])
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

// POST /api/report エンドポイント (新規)
app.post('/api/report', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, AI_PROVIDER_API_KEY } = env<Bindings>(c);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !AI_PROVIDER_API_KEY) {
    return c.json({ error: 'Required environment variables are not set' }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { userId, reportType, dataContext } = await c.req.json();

  if (!userId || !reportType || !dataContext) {
    return c.json({ error: 'userId, reportType, and dataContext are required' }, 400);
  }

  // TODO: AIプロバイダーにレポート生成をリクエストする
  // 例: MiniMax M2.5 Standard を利用
  // const aiProviderResponse = await fetch('https://api.minimax.chat/v1/chat/completion', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${AI_PROVIDER_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     model: 'MiniMax-M2.5-Standard',
  //     messages: [
  //       { role: 'system', content: 'You are a helpful assistant that generates business reports.' },
  //       { role: 'user', content: `Generate a ${reportType} report based on the following data: ${JSON.stringify(dataContext)}` }
  //     ],
  //     max_tokens: 1000,
  //   }),
  // });
  // const aiReport = await aiProviderResponse.json();
  // const generatedReportContent = aiReport.choices[0].message.content;

  // AIレポートをモック
  const generatedReportContent = `これは${reportType}レポートのモックです。データコンテキスト: ${JSON.stringify(dataContext)}`;

  // 生成されたレポートを保存
  // TODO: `reports` テーブルのスキーマを定義し、データを保存する
  const { data: report, error: reportError } = await supabase
    .from('reports') // 仮のテーブル名 'reports'
    .insert([{ user_id: userId, type: reportType, content: generatedReportContent }])
    .select();

  if (reportError) {
    console.error('Error saving report:', reportError);
    return c.json({ error: 'Failed to save report' }, 500);
  }

  return c.json({
    message: 'Report generated successfully',
    report: report[0],
  });
});

export default app;
