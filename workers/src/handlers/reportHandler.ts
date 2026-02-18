import type { Context } from 'hono';

/**
 * AIレポート生成APIのハンドラ
 * multipart/form-data で送信されたCSVファイルと指示プロンプトを処理する
 * @param c Honoのコンテキストオブジェクト
 * @returns レスポンスオブジェクト
 */
export const handleGenerateReport = async (c: Context) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File; // 'file' はFileオブジェクトであることを期待
    const prompt = formData.get('prompt') as string;

    // --- バリデーション ---
    if (!file || !(file instanceof File) || file.size === 0) {
      return c.json({ error: 'ファイルが提供されていません。' }, 400);
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return c.json({ error: '指示プロンプトが提供されていません。' }, 400);
    }
    if (file.type !== 'text/csv') {
      return c.json({ error: '無効なファイルタイプです。CSVファイルのみ対応しています。' }, 400);
    }
    // 5MB以上のファイルは弾く
    if (file.size > 5 * 1024 * 1024) {
        return c.json({ error: 'ファイルサイズは5MB以下にしてください。' }, 400);
    }

    // --- データ処理 ---
    const csvData = await file.text();

    // AIに渡すプロンプトを生成 (実際のロジックは report.ts などに切り出すべき)
    const generatedPrompt = `
以下のCSVデータを分析し、次の指示に従ってレポートを作成してください。

[指示]
${prompt}

[CSVデータ (先頭4000文字)]
${csvData.substring(0, 4000)}
`; 
    // TODO: このプロンプトを実際にAI APIに送信する処理を実装する
    // const report = await generateReportFromAI(generatedPrompt);

    return c.json({
      message: 'レポート生成リクエストを正常に処理しました。',
      fileName: file.name,
      fileSize: file.size,
      prompt: prompt,
      // In a real scenario, you would return the actual report
      // For now, returning the generated prompt for verification
      generatedPrompt: generatedPrompt, 
    });

  } catch (error) {
    console.error('レポート生成処理でエラーが発生しました:', error);
    return c.json({ error: 'サーバー内部で予期せぬエラーが発生しました。' }, 500);
  }
};
