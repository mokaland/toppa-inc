import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabaseClient'; // Import Supabase client

interface Env {
  GEMINI_API_KEY: string;
}

const report = new Hono<{ Bindings: Env }>();

report.post('/generate', async (c) => {
  const { csvData, userInstruction, user_id } = await c.req.json(); // Accept user_id from body

  if (!user_id) {
    return c.json({ error: 'User ID is required' }, 400);
  }

  // 2. AIプロバイダーへのリクエスト (Gemini API連携)
  try {
    const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const csvDataString = JSON.stringify(csvData, null, 2); // Pretty print JSON
    const fullPrompt = `以下のCSVデータに基づいて、ユーザーの指示に従いレポートを生成してください。出力はMarkdown形式でお願いします。\n\nユーザーの指示:\n${userInstruction}\n\nCSVデータ:\n${csvDataString}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    // 3. レポート履歴の保存 (Supabase連携)
    // Generate a simple title for the report
    const reportTitle = `AI Report: ${userInstruction.substring(0, 50)}${userInstruction.length > 50 ? '...' : ''}`;
    
    await supabase.from('reports').insert({
      user_id: user_id,
      title: reportTitle,
      file_name: 'generated_report.md', // Placeholder file name
      prompt: fullPrompt,
      result: aiResponse,
    });

    return streamText(c, async (stream) => {
      await stream.write(JSON.stringify({ report: aiResponse }));
    });

  } catch (error) {
    console.error('Gemini API request failed:', error);
    return c.json({ error: 'レポートの生成に失敗しました。もう一度お試しください' }, 500);
  }
});

export default report;
