import type { Context } from 'hono';
import { generateReport } from '../services/aiService';

/**
 * AIレポート生成APIのハンドラ
 * multipart/form-data で送信されたCSVファイルと指示プロンプトを処理する
 * @param c Honoのコンテキストオブジェクト
 * @returns レスポンスオブジェクト
 */
export const handleGenerateReport = async (c: Context) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
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
    if (file.size > 5 * 1024 * 1024) {
        return c.json({ error: 'ファイルサイズは5MB以下にしてください。' }, 400);
    }

    // --- データ処理 ---
    const csvData = await file.text();

    const generatedPrompt = `
以下のCSVデータを分析し、次の指示に従ってレポートを作成してください。

[指示]
${prompt}

[CSVデータ (先頭4000文字)]
${csvData.substring(0, 4000)}
`; 
    
    // AIサービスを呼び出してレポートを生成
    const report = await generateReport(generatedPrompt);

    return c.json({ report });
  } catch (error) {
    console.error('レポート生成中にエラー:', error);
    return c.json({ error: 'サーバー内部でエラーが発生しました。' }, 500);
  }
};
