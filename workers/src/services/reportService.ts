// workers/src/services/reportService.ts

/**
 * CSVデータのプレビューと統計情報を生成し、AIへのプロンプトを作成します。
 * この関数は、Cloudflare WorkersのEdge環境で実行されることを想定しており、
 * 依存ライブラリなしで動作するように設計されています。
 *
 * @param csvData CSV形式の文字列データ。改行コードは '\n' を想定。
 * @param userInstruction ユーザーからのレポート生成に関する指示。
 * @returns AI (LLM) に送信するための整形済みプロンプト文字列。
 */
export const createReportPrompt = (csvData: string, userInstruction: string): string => {
  const lines = csvData.trim().split('\n');
  if (lines.length === 0 || lines[0] === '') {
    // TODO: エラーハンドリングを強化し、呼び出し元にエラーオブジェクトを返すようにする
    return "CSVデータが空です。";
  }
  const headers = lines[0].split(',');
  const rows = lines.length > 1 ? lines.slice(1).map(line => line.split(',')) : [];

  const rowCount = rows.length;
  const columnCount = headers.length;

  // パフォーマンスを考慮し、大規模データの場合はプレビュー行数を制限する
  const preview = lines.slice(0, 4).join('\n');

  const prompt = `あなたはプロのデータアナリストです。以下のCSVデータとユーザーからの指示に基づいて、洞察に満ちたレポートをMarkdown形式で生成してください。

## ユーザーの指示
${userInstruction}

## データ概要
- ファイル形式: CSV
- データ件数: ${rowCount}件
- カラム数: ${columnCount}個
- カラム名: ${headers.join(', ')}

## データプレビュー (先頭3行)
\`\`\`csv
${preview}
\`\`\`

## 指示
上記のデータ概要とプレビューを元に、ユーザーの指示に沿った分析レポートを生成してください。レポートは必ずMarkdown形式で出力し、必要に応じてテーブルやリスト、強調表現（太字など）を使用してください。
`.trim();

  return prompt;
};
