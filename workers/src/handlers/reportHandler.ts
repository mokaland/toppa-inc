import type { Context } from 'hono';
import { reportService } from '../services/reportService';

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
    
    // TODO: 認証ミドルウェアからユーザーIDを取得する
    // const userId = c.get('userId'); 
    const userId = 'd5e1a4f7-c923-4a2c-9a7c-0d1d1a3f7b3a'; // 仮のハードコードされたUUID

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
    if (file.size > 5 * 1024 * 1024) { // 5MB
        return c.json({ error: 'ファイルサイズは5MB以下にしてください。' }, 400);
    }

    // --- サービス呼び出し ---
    const { reportContent, storagePath } = await reportService.createReport(file, prompt, userId);

    return c.json({ 
      message: 'レポートが正常に生成されました。',
      report: reportContent,
      source_file_path: storagePath 
    });

  } catch (error) {
    console.error('レポート生成ハンドラでエラー:', error);
    // エラーのインスタンスに応じて、より具体的なエラーメッセージを返すことも可能
    const errorMessage = error instanceof Error ? error.message : 'サーバー内部でエラーが発生しました。';
    return c.json({ error: errorMessage }, 500);
  }
};
