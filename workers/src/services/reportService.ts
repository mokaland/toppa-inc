import { supabase } from '../lib/supabaseClient';
import { callAiGateway } from './aiGateway'; // 将来的に実装するAI Gatewayサービス
import Papa from 'papaparse';

/**
 * レポート生成に関するビジネスロックを扱うサービスクラス
 */
export class ReportService {
  // ... (既存のクラス実装は省略) ...
  private supabaseClient;
  private aiGateway;

  constructor(supabaseClient: typeof supabase, aiGateway: typeof callAiGateway) {
    this.supabaseClient = supabaseClient;
    this.aiGateway = aiGateway;
  }

  public async createReport(file: File, prompt: string, userId: string) {
    if (!file || !prompt || !userId) {
      throw new Error('File, prompt, and userId are required.');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `${userId}/source/${timestamp}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await this.supabaseClient.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error('Failed to upload file to storage.');
    }
    const storagePath = uploadData.path;
    const csvData = await file.text();
    // ...
  }
}


/**
 * CSV文字列をJSON文字列に変換する。
 * ヘッダー行をキーとして使用する。
 * @param csvData CSV形式の文字列
 * @returns JSON形式の文字列
 * @throws Error CSVの解析に失敗した場合
 */
export function csvToJson(csvData: string): string {
  if (!csvData || typeof csvData !== 'string' || csvData.trim() === '') {
    return JSON.stringify([]);
  }

  const results = Papa.parse(csvData, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  if (results.errors.length > 0) {
    // 致命的なエラーのみをスローする
    const criticalError = results.errors.find(e => e.type === 'FieldMismatch');
    if (criticalError) {
       console.error('CSV Parsing Critical Error:', criticalError);
       throw new Error(`CSVの解析に失敗しました: ${criticalError.message}`);
    }
  }

  return JSON.stringify(results.data);
}
