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
  if (!aiApiKey || typeof aiApiKey !== 'string' || !aiApiKey.startsWith('sk-')) {
    throw new Error('無効なAPIキーです。');
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

  // OpenAI APIを呼び出す
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenAI API Error:', errorBody);
    throw new Error(`AI APIとの連携に失敗しました (HTTP ${response.status})`);
  }

  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
      throw new Error('AIからの応答が予期せぬ形式です。');
  }
  
  return data.choices[0].message.content;
}
