import { supabase } from '../lib/supabaseClient';
import { callAiGateway } from './aiGateway'; // 将来的に実装するAI Gatewayサービス

/**
 * レポート生成に関するビジネスロジックを扱うサービスクラス
 */
export class ReportService {
  private supabaseClient;
  private aiGateway;

  /**
   * コンストラクタで依存性を注入
   * @param supabaseClient Supabaseクライアントのインスタンス
   * @param aiGateway AI Gatewayを呼び出す関数
   */
  constructor(supabaseClient: typeof supabase, aiGateway: typeof callAiGateway) {
    this.supabaseClient = supabaseClient;
    this.aiGateway = aiGateway;
  }

  /**
   * アップロードされたファイルと指示に基づき、AIレポートを生成する
   * @param file ユーザーがアップロードしたCSVファイル
   * @param prompt ユーザーからの指示
   * @param userId ユーザーID
   * @returns 生成されたレポート内容とファイルの保存パス
   */
  public async createReport(file: File, prompt: string, userId: string) {
    if (!file || !prompt || !userId) {
      throw new Error('File, prompt, and userId are required.');
    }

    // 1. ファイルをSupabase Storageにアップロード
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `${userId}/source/${timestamp}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await this.supabaseClient.storage
      .from('documents') // 'reports'から'documents'バケットに変更
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error('Failed to upload file to storage.');
    }
    const storagePath = uploadData.path;

    // 2. ファイルの内容を読み込む
    const csvData = await file.text();

    // 3. AIに渡すための最終的なプロンプトを構築
    const finalPrompt = this.buildFinalPrompt(prompt, csvData);

    // 4. AI Gatewayを呼び出してレポートを生成
    const reportContent = await this.aiGateway(finalPrompt);
    
    // TODO: 生成されたレポートをDBの'documents'テーブルに保存する処理を追加

    return { reportContent, storagePath };
  }

  /**
   * AIに渡す最終的なプロンプトを組み立てる
   * @param userPrompt ユーザーからの指示
   * @param csvData CSVデータ
   * @returns 組み立てられたプロンプト文字列
   */
  private buildFinalPrompt(userPrompt: string, csvData: string): string {
    const truncatedCsv = csvData.length > 4000 ? csvData.substring(0, 4000) : csvData;
    return \`
以下のCSVデータを分析し、次の指示に従ってレポートを作成してください。
レポートは必ずMarkdown形式で、見出し、箇条書き、表などを適切に使用して分かりやすくまとめてください。

[指示]
${userPrompt}

[CSVデータ (先頭最大4000文字)]
${truncatedCsv}
\`;
  }
}

// シングルトンインスタンスを作成してエクスポート
export const reportService = new ReportService(supabase, callAiGateway);
