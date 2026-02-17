import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { createClient } from '@supabase/supabase-js';

const report = new Hono();

// 純粋な関数としてコアロジックを抽出
export async function processUploadReport(file, supabaseUrl, supabaseAnonKey, aiApiKey) {
  // TODO: ファイルのバリデーション (サイズ, 形式など)
  // TODO: ファイルを読み込み、データ解析 (CSV, Excelなど)

  // 仮のレポートデータを生成
  const dummyReportContent = `これはAIが生成したダミーレポートです。ファイル名: ${file.name}`;
  const reportId = crypto.randomUUID(); // レポートIDを生成

  // TODO: Supabaseにレポートを保存
  // const supabase = createClient(supabaseUrl, supabaseAnonKey);
  // const { data, error: dbError } = await supabase.from('reports').insert([
  //   { id: reportId, user_id: 'current_user_id', content: dummyReportContent, filename: file.name }
  // ]);

  // if (dbError) {
  //   throw new Error('レポートの保存に失敗しました。');
  // }

  return { message: 'レポートが正常に生成され、保存されました。', reportId };
}

export async function retrieveReport(reportId, supabaseUrl, supabaseAnonKey) {
  // TODO: Supabaseからレポートを取得
  // const supabase = createClient(supabaseUrl, supabaseAnonKey);
  // const { data, error } = await supabase.from('reports').select('*').eq('id', reportId).single();

  // if (error || !data) {
  //   throw new Error('レポートが見つかりません。');
  // }

  // 仮のレポートデータを返す
  const dummyReport = {
    id: reportId,
    content: `これはID ${reportId} のダミーレポート内容です。`,
    filename: `report-${reportId}.txt`,
  };

  return dummyReport;
}

/**
 * @swagger
 * /report/upload:
 *   post:
 *     summary: レポート生成のためのファイルをアップロードし、AIレポートを生成・保存する
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: レポートが正常に生成され、保存されました
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 reportId:
 *                   type: string
 *       400:
 *         description: リクエストエラー
 */
report.post('/upload', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, AI_API_KEY } = env<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string; AI_API_KEY: string }>(c);

  try {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return c.json({ error: 'ファイルが提供されていません。' }, 400);
    }

    const result = await processUploadReport(file, SUPABASE_URL, SUPABASE_ANON_KEY, AI_API_KEY);
    return c.json(result);
  } catch (error: any) {
    console.error('レポート生成エラー:', error);
    return c.json({ error: error.message || 'レポート生成中にエラーが発生しました。' }, 500);
  }
});

/**
 * @swagger
 * /report/{id}:
 *   get:
 *     summary: 特定のAIレポートを取得する
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 取得するレポートのID
 *     responses:
 *       200:
 *         description: レポートデータ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 content:
 *                   type: string
 *                 filename:
 *                   type: string
 *       404:
 *         description: レポートが見つかりません
 *       500:
 *         description: サーバーエラー
 */
report.get('/:id', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string }>(c);

  const reportId = c.req.param('id');

  try {
    const result = await retrieveReport(reportId, SUPABASE_URL, SUPABASE_ANON_KEY);
    return c.json(result);
  } catch (error: any) {
    console.error('レポート取得エラー:', error);
    return c.json({ error: error.message || 'レポート取得中にエラーが発生しました。' }, 500);
  }
});

export default report;
