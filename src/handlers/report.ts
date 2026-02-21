import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Env {
  GEMINI_API_KEY: string;
}

const report = new Hono<{ Bindings: Env }>();

report.post('/generate', async (c) => {
  const { csvData, userInstruction } = await c.req.json();

  // 2. AIプロバイダーへのリクエスト (Gemini API連携)
  try {
    const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const fullPrompt = `以下のCSVデータに基づいて、ユーザーの指示に従いレポートを生成してください。出力はMarkdown形式でお願いします。\n\nユーザーの指示:\n${userInstruction}\n\nCSVデータ:\n${csvData}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    // 3. レポート履歴の保存 (Supabase連携は別途 - 必要であればここで実装)
    // const supabase = new SupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
    // await supabase.from('reports').insert({
    //   user_id: userId,
    //   title: `Generated Report for ${fileName}`,
    //   file_name: fileName,
    //   prompt: prompt,
    //   result: aiResponse,
    // });

    return streamText(c, async (stream) => {
      await stream.write(JSON.stringify({ report: aiResponse }));
    });

  } catch (error) {
    console.error('Gemini API request failed:', error);
    return c.json({ error: 'AIレポートの生成中にエラーが発生しました。' }, 500);
  }
});

export default report; 
