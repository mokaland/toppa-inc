import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { createClient } from '@supabase/supabase-js';

const report = new Hono();

// 純粋な関数としてコアロジックを抽出
export async function processUploadReport(file: File, supabaseUrl: string, supabaseAnonKey: string, aiApiKey: string) {
  // ファイルのバリデーション (サイズ, 形式など)
  if (!file) {
    throw new Error('ファイルがアップロードされていません。');
  }
  if (file.size === 0) {
    throw new Error('空のファイルは処理できません。');
  }

  let fileContent: string = '';
  let parsedData: string[][] = [];

  // TODO: より堅牢なファイルタイプ判定とパースライブラリの検討（Cloudflare Workersの制約を考慮）
  if (file.type === 'text/csv') {
    fileContent = await file.text();
    // 簡易的なCSVパース (ヘッダーと最初の数行を想定)
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 0) {
      parsedData = lines.map(line => line.split(','));
    }
  } else {
    // 他のファイルタイプは一旦サポート外とする
    throw new Error('現在、CSVファイルのみサポートしています。');
  }

  // AI連携のダミー実装
  // 実際のAI API呼び出しはFounding Engineerが実装
  const aiGeneratedReportContent = `
    --- AI生成レポート ---
    入力ファイル名: ${file.name}
    ファイルタイプ: ${file.type}
    データ概要（最初の数行）:
    ${parsedData.slice(0, 3).map(row => row.join(',')).join('\n')}

    AIによる分析結果:
    これは、アップロードされたCSVデータを基にAIが生成したダミーのレポートです。
    AIキー ${aiApiKey ? 'が提供されました' : 'は提供されていません'}。
    詳細な分析や洞察は、実際のAIモデルとの連携後に提供されます。
    --------------------
  `;

  const reportId = crypto.randomUUID(); // レポートIDを生成
  const currentUserId = 'dummy_user_id'; // TODO: 認証機能と連携して実際のユーザーIDを取得

  // Supabaseにレポートを保存
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error: dbError } = await supabase.from('reports').insert([
    { id: reportId, user_id: currentUserId, content: aiGeneratedReportContent, filename: file.name }
  ]);

  if (dbError) {
    console.error('Supabaseへのレポート保存中にエラーが発生しました:', dbError);
    throw new Error('レポートの保存に失敗しました。');
  }

  return { message: 'レポートが正常に生成され、保存されました。', reportId, reportContent: aiGeneratedReportContent };
}

export async function retrieveReport(reportId: string, supabaseUrl: string, supabaseAnonKey: string) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('reports').select('*').eq('id', reportId).single();

  if (error || !data) {
    console.error('Supabaseからのレポート取得中にエラーが発生しました:', error);
    throw new Error('レポートが見つかりません。');
  }

  return data;
}

// Honoルーターの設定 (既存のものを維持)
report.post('/upload', async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY, AI_API_KEY } = env<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string; AI_API_KEY?: string }>(c);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return c.json({ error: 'Supabase設定が不足しています。' }, 500);
    }

    const body = await c.req.parseBody();
    const file = body['file'] as File;

    if (!file) {
      return c.json({ error: 'ファイルがアップロードされていません。' }, 400);
    }

    const result = await processUploadReport(file, SUPABASE_URL, SUPABASE_ANON_KEY, AI_API_KEY || '');
    return c.json({ success: true, ...result });
  } catch (error: any) {
    console.error('レポートアップロード処理中にエラーが発生しました:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

report.get('/:reportId', async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string }>(c);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return c.json({ error: 'Supabase設定が不足しています。' }, 500);
    }Honoルーターの設定 (既存のものを維持)
report.post('/upload', async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY, AI_API_KEY } = env<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string; AI_API_KEY?: string }>(c);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return c.json({ error: 'Supabase設定が不足しています。' }, 500);
    }

    const body = await c.req.parseBody();
    const file = body['file'] as File;

    if (!file) {
      return c.json({ error: 'ファイルがアップロードされていません。' }, 400);
    }

    const result = await processUploadReport(file, SUPABASE_URL, SUPABASE_ANON_KEY, AI_API_KEY || '');
    return c.json({ success: true, ...result });
  } catch (error: any) {
    console.error('レポートアップロード処理中にエラーが発生しました:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

report.get('/:reportId', async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string }>(c);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return c.json({ error: 'Supabase設定が不足しています。' }, 500);
    }

    const reportId = c.req.param('reportId');
    const reportData = await retrieveReport(reportId, SUPABASE_URL, SUPABASE_ANON_KEY);
    return c.json({ success: true, report: reportData });
  } catch (error: any) {
    console.error('レポート取得処理中にエラーが発生しました:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default report;
