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

  // ファイルタイプ判定とパース
  // TODO: Cloudflare Workersの制約（Node.jsライブラリ利用不可）を考慮し、
  // 引用符や改行を含むCSVに対応可能な軽量なパーサーライブラリを選定するか、
  // 自前で実装を検討してください。
  // XLSXファイル対応も将来的に必要となる場合は、別途対応方針を検討します。
  if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
    fileContent = await file.text();
    // 簡易的なCSVパース。Founding Engineerはより堅牢な実装に置き換えてください。
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 0) {
      parsedData = lines.map(line => line.split(','));
    }
  } else {
    // 他のファイルタイプは一旦サポート外とする
    throw new Error('現在、CSVファイルのみサポートしています。');
  }

  // AI連携の具体的な実装方針
  // MiniMax M2.5 Standard を想定
  // プロンプト設計のポイント：
  // 1. ユーザーが何を求めているか明確に指示 (例: 「以下のCSVデータから経営レポートを作成してください。」)
  // 2. データの形式を明示 (例: 「データはCSV形式で、ヘッダー行が含まれます。」)
  // 3. 期待する出力形式を指定 (例: 「レポートはMarkdown形式で、要約、課題、改善提案のセクションを含めてください。」)
  // 4. 制約条件を付与 (例: 「2000文字以内でまとめてください。」)
  
  let aiGeneratedReportContent: string;

  if (!aiApiKey) {
    aiGeneratedReportContent = `
      --- AI生成レポート（ダミー）---
      AIキーが提供されていないため、ダミーレポートを生成しました。
      入力ファイル名: ${file.name}
      ファイルタイプ: ${file.type}
      データ概要（最初の数行）:
      ${parsedData.slice(0, 3).map(row => row.join(',')).join('\n')}
      --------------------
    `;
  } else {
    const prompt = `
      以下のCSVデータを分析し、経営者向けのレポートを作成してください。
      データはCSV形式で、ヘッダー行が含まれます。
      レポートはMarkdown形式で、以下のセクションを含めてください。
      - 要約
      - 主要な課題
      - 改善提案
      - データからの考察
      2000文字以内でまとめてください。

      --- CSVデータ ---
      ${fileContent}
      ---
    `;

    try {
      const aiResponse = await fetch('https://api.minimax.chat/v1/text/chatcompletion', { // MiniMax APIのエンドポイント例
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiApiKey}`, // ユーザー提供のAPIキー
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.5-Standard', // モデル名
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!aiResponse.ok) {
        const errorBody = await aiResponse.text();
        console.error('AI APIエラー:', aiResponse.status, errorBody);
        throw new Error(`AIレポート生成に失敗しました: ${aiResponse.statusText}`);
      }

      const aiResult = await aiResponse.json();
      aiGeneratedReportContent = aiResult.choices[0].message.content;

    } catch (error) {
      console.error('AI API呼び出し中にエラー:', error);
      aiGeneratedReportContent = `
        --- AI生成レポート（エラー）---
        AIレポートの生成中にエラーが発生しました。
        エラー詳細: ${error instanceof Error ? error.message : String(error)}
        入力ファイル名: ${file.name}
        ファイルタイプ: ${file.type}
        --------------------
      `;
    }
  }

  const reportId = crypto.randomUUID(); // レポートIDを生成
  // TODO: 認証機能と連携して実際のユーザーIDを取得し、SupabaseのRLSを考慮した保存処理を実装してください。
  // 現在はダミーのユーザーIDを使用しています。
  const currentUserId = 'dummy_user_id'; 

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Supabaseにレポート内容を保存
  const { data, error } = await supabase
    .from('reports') // 仮のテーブル名。PdMと相談して決定してください。
    .insert([
      {
        id: reportId,
        user_id: currentUserId,
        file_name: file.name,
        file_type: file.type,
        original_content: fileContent,
        generated_report: aiGeneratedReportContent,
        created_at: new Date().toISOString(),
      },
    ]);

  if (error) {
    console.error('Supabase保存エラー:', error);
    throw new Error('レポートの保存に失敗しました。');
  }

  return {
    reportId,
    generatedReport: aiGeneratedReportContent,
    message: 'レポートが正常に生成され、保存されました。',
  };
}

report.post('/', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, MINIMAX_API_KEY } = env<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string; MINIMAX_API_KEY: string }>(c);
  const body = await c.req.parseBody();
  const file = body['file'] as File; // 'file'はフォームデータのフィールド名

  try {
    const result = await processUploadReport(file, SUPABASE_URL, SUPABASE_ANON_KEY, MINIMAX_API_KEY);
    return c.json(result, 200);
  } catch (error) {
    console.error('レポート生成APIエラー:', error);
    return c.json({ error: error instanceof Error ? error.message : '不明なエラーが発生しました。' }, 400);
  }
});

export default report;
