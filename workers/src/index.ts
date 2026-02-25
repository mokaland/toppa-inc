import { Hono } from 'hono';
import { supabaseMiddleware } from './middleware/supabase';
import { authMiddleware } from './middleware/auth';
import { generateReport } from './report';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Cloudflare Workers の型定義
type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  OPENAI_API_KEY: string;
}

export function createWorkerApp(bindings: Bindings) {
  const app = new Hono<{ Bindings: Bindings }>();

  // APIルートグループ
  const api = app.basePath('/api');

  // Temporarily removed middleware for testing
  api.use('*', supabaseMiddleware);
  api.use('*', authMiddleware);

  // Chat API routes
  api.post('/chat', async (c) => {
    try {
      const { userId, message } = await c.req.json<{ userId: string; message: string }>();

      if (!userId || !message) {
        return c.json({ error: 'userId and message are required' }, 400);
      }

      const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
      const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

      // Save user message
      await supabase.from('chat_messages').insert({ user_id: userId, role: 'user', content: message });

      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: message }],
      });

      const aiResponseContent = chatCompletion.choices[0]?.message?.content || '';

      // Save AI response
      await supabase.from('chat_messages').insert({ user_id: userId, role: 'assistant', content: aiResponseContent });

      return c.json({ userMessage: { content: message }, aiMessage: { content: aiResponseContent } });
    } catch (error) {
      console.error('Error in /api/chat:', error);
      return c.json({ error: 'Failed to process chat message' }, 500);
    }
  });

  api.get('/chat/history', async (c) => {
    try {
      const userId = c.req.query('userId');

      if (!userId) {
        return c.json({ error: 'userId is required' }, 400);
      }

      const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return c.json({ history: data });
    } catch (error) {
      console.error('Error in /api/chat/history:', error);
      return c.json({ error: 'Failed to retrieve chat history' }, 500);
    }
  });

  /**
   * [要認証] AIレポート生成APIエンドポイント
   * POST /api/reports/generate
   */
  api.post('/reports/generate', async (c) => {
    try {
      const user = c.get('user');
      console.log(`Report generation request from user: ${user.id}`);

      const { csvData, userInstruction } = await c.req.json<{ csvData: any; userInstruction: string }>();

      if (!csvData) {
        return c.json({ error: '`csvData`は必須です。' }, 400);
      }

      if (!userInstruction || typeof userInstruction !== 'string') {
        return c.json({ error: '`userInstruction`は必須です。' }, 400);
      }

      const openaiApiKey = c.env.OPENAI_API_KEY;
      const report = await generateReport(JSON.stringify(csvData), userInstruction, openaiApiKey);

      return c.json({ report });

    } catch (error) {
      console.error('Error in /api/reports/generate:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました。';
      return c.json({ error: `レポートの生成に失敗しました: ${errorMessage}` }, 500);
    }
  });

  return app;
}

const app = createWorkerApp({
  SUPABASE_URL: (globalThis as any).SUPABASE_URL || '',
  SUPABASE_ANON_KEY: (globalThis as any).SUPABASE_ANON_KEY || '',
  OPENAI_API_KEY: (globalThis as any).OPENAI_API_KEY || '',
});

export default app;
