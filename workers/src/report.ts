/**
 * AIにレポート生成を依頼するコアロジック
 * @param jsonData - フロントエンドでパース済みのデータ（JSON文字列）
 * @param userPrompt - ユーザーからの指示
 * @param aiApiKey - AIプロバイダーのAPIキー
 * @returns 生成されたレポート（Markdown形式）
 */
export async function generateReport(
  jsonData: string,
  userPrompt: string,
  aiApiKey: string,
): Promise<string> {
  if (!jsonData || jsonData.trim() === '[]' || jsonData.trim() === '{}') {
    throw new Error('データが空です。');
  }
  if (!userPrompt) {
    throw new Error('ユーザーの指示がありません。');
  }

  const systemPrompt = `あなたは中小企業の経営者を支援する優秀な経営コンサルタントです。
提供されたJSONデータを分析し、経営者の意思決定に役立つレポートを作成してください。
レポートは必ずMarkdown形式で、以下の構成を守ってください。

1.  **総括**: 分析結果の要点
2.  **インサイト**: データから読み取れる具体的な洞察や傾向
3.  **アクションプラン**: 次に取るべき具体的な行動提案

専門用語を避け、平易な言葉で記述してください。`;

  const userMessage = `以下のデータと指示に基づいてレポートを作成してください。

### データ (JSON)
\`\`\`json
${jsonData}
\`\`\`

### 指示
${userPrompt}
`;

  // TODO: 実際のAIプロバイダーのAPIを呼び出す
  // Founding Engineerのカルロスがこの部分を実装する
  // 以下はfetchを使った呼び出しのサンプルコード
  /*
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${aiApiKey}\`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(\`AI APIエラー: \${response.status} \${errorBody}\`);
  }

  const data = await response.json();
  const report = data.choices[0].message.content;
  
  return report;
  */
  
  // 現状はモックレポートを返す
  const mockReport = `
# 売上分析レポート (AI生成)

## 1. 総括
ご指示のあったデータに基づき、売上分析を行いました。
分析の結果、特定の傾向が確認できました。

## 2. インサイト
- **部門A:** 売上が安定して好調です。
- **部門B:** 売上が減少傾向にあります。

## 3. アクションプラン
- **推奨事項:** 部門Bの製品ラインナップ見直し、または新しいマーケティング戦略の立案を推奨します。
`;

  return Promise.resolve(mockReport);
}
