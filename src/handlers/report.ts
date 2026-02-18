import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import Papa from 'papaparse';

const report = new Hono();

report.post('/generate', async (c) => {
  const { fileContent, fileName, prompt } = await c.req.json();

  // 1. ファイル内容の解析 (仮実装)
  let parsedData: any[] = [];
  if (fileName.endsWith('.csv')) {
    parsedData = Papa.parse(fileContent, { header: true }).data; // Use papaparse
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    // xlsxライブラリはCloudflare Workersで直接使うのが難しい場合があるため、一旦ダミー
    // 実際には、サーバーサイドでの処理や、wasm版のxlsxライブラリの検討が必要
    console.log('XLSX file parsing is a placeholder. Actual implementation requires further consideration for Cloudflare Workers.');
    // 仮のデータとして、ファイル名とプロンプトから作成
    parsedData = [{ message: `Processed dummy XLSX for ${fileName} with prompt: ${prompt}` }];
  } else {
    return c.json({ error: 'Unsupported file type' }, 400);
  }

  // 2. AIプロバイダーへのリクエスト (仮実装)
  // ここではダミー応答を返す。実際のAI連携は別途実装
  const aiResponse = `AIによるレポート生成結果（データ件数: ${parsedData.length}件、プロンプト: "${prompt}"）`;

  // 3. レポート履歴の保存 (Supabase連携は別途)
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
});

export default report; 
