/**
 * AIにレポート生成を依頼するコアロジック
 * @param jsonData - フロントエンドでパース済みのデータ（JSON文字列）
 * @param userPrompt - ユーザーからの指示
 * @param aiApiKey - （将来的に利用）AIプロバイダーのAPIキー
 * @returns 生成されたレポート（Markdown形式）
 */
export async function generateReport(
  jsonData: string,
  userPrompt: string,
  aiApiKey?: string,
): Promise<string> {
  if (!jsonData || jsonData.trim() === '[]' || jsonData.trim() === '{}') {
    throw new Error('データが空です。');
  }
  if (!userPrompt) {
    throw new Error('ユーザーの指示がありません。');
  }

  // 実際のAI API呼び出しは未実装。MVPではモックを返すか、
  // 実際のAPIを実装するかはFounding Engineerに委ねる。
  const mockReport = `
# 売上分析レポート

## 1. 総括

ご指示いただいたデータに基づき、売上分析を行いました。
全体的に、部門Aの売上が好調に推移しています。

## 2. 課題

一方で、部門Bの売上が前月比で5%減少しており、対策が必要です。

## 3. 提案

部門Bのテコ入れとして、新商品の投入とターゲット顧客層の見直しを推奨します。
`;

  return Promise.resolve(mockReport);
}
