
/**
 * AIサービスとの連携を担当するモジュール
 */

/**
 * プロンプトを受け取り、AIが生成したレポート（Markdown形式）を返す
 * @param prompt AIに送信するプロンプト文字列
 * @returns AIによって生成されたレポート文字列
 */
export const generateReport = async (prompt: string): Promise<string> => {
  console.log('--- AI Service (Mock) ---');
  console.log('Received prompt:', prompt.substring(0, 200) + '...'); // Log first 200 chars
  console.log('-------------------------');

  // 実際のAPI呼び出しの代わりに、固定のMarkdown文字列を返す
  // これにより、APIキーなしで開発を進められる
  const mockReport = `# 月次売上レポート

## 概要

今月の売上は全体的に好調で、特にプロダクトAの売上が大幅に増加しました。

## 部門別売上

| 部門 | 売上（円） | 前月比 |
|---|---|---|
| 営業1部 | 15,000,000 | +15% |
| 営業2部 | 12,500,000 | +8% |
| オンライン | 8,000,000 | +30% |

## 考察

オンライン部門の売上増加は、先月実施したマーケティングキャンペーンが功を奏したと考えられます。
`;

  // ネットワーク遅延をシミュレート
  await new Promise(resolve => setTimeout(resolve, 1500));

  return mockReport;
};
