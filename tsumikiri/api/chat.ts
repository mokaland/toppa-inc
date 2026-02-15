import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { createClient } from '@supabase/supabase-js';

const chatApi = new Hono();

// Supabaseクライアントの初期化 (環境変数から取得)
const supabaseUrl = 'YOUR_SUPABASE_URL'; // 環境変数から取得するように変更
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // 環境変数から取得するように変更
const supabase = createClient(supabaseUrl, supabaseAnonKey);

chatApi.post('/', async (c) => {
  const { messages } = await c.req.json();
  const userId = c.get('userId'); // 認証ミドルウェアからuserIdを取得することを想定

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

  // OpenAI APIへのリクエスト (ストリーミング応答を想定)
  return streamText(c, async (stream) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o', // モデルはtech-direction.mdのBYOK方式に従う
          messages: messages,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`OpenAI API request failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponseContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // OpenAIのストリーミング応答をパースしてクライアントに送信
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') {
              break;
            }
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content || '';
            if (content) {
              assistantResponseContent += content;
              await stream.write(content);
            }
          }
        }
      }

      // 会話履歴をSupabaseに保存 (アシスタントメッセージ)
      await supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'assistant',
        content: assistantResponseContent,
      });

    } catch (error) {
      console.error('Error during AI chat:', error);
      await stream.write(`Error: ${error.message}`);
      // エラーメッセージもSupabaseに保存するかどうかは検討
    } finally {
      await stream.close();
    }
  });
});

export default chatApi;
