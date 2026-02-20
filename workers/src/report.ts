import { OpenAI } from 'openai';

/**
 * AIにレポート生成を依頼するコアロジック
 * @param jsonData - フロントエンドでパース済みのデータ（JSON文字列）
 * @param userPrompt - ユーザーからの指示
 * @param apiKey - AIプロバイダーのAPIキー
 * @returns 生成されたレポート（Markdown形式）
 */
export async function generateReport(
  jsonData: string,
  userPrompt: string,
  apiKey: string,
): Promise<string> {
  if (!jsonData || jsonData.trim() === '[]' || jsonData.trim() === '{}') {
    throw new Error('データが空です。');
  }
  if (!userPrompt) {
    throw new Error('ユーザーの指示がありません。');
  }
  if (!apiKey) {
    throw new Error('APIキーが提供されていません。');
  }

  const systemPrompt = `あなたは中小企業の経営者を支援する優秀な経営コンサルタントです。\n提供されたJSONデータを分析し、経営者の意思決定に役立つレポートを作成してください。\nレポートは必ずMarkdown形式で、以下の構成を守ってください。\n\n1.  **総括**: 分析結果の要点\n2.  **インサイト**: データから読み取れる具体的な洞察や傾向\n3.  **アクションプラン**: 次に取るべき具体的な行動提案\n\n専門用語を避け、平易な言葉で記述してください。`;

  const userMessage = `以下のデータと指示に基づいてレポートを作成してください。\n\n### データ (JSON)\n\`\`\`json\n${jsonData}\n\`\`\`\n\n### 指示\n${userPrompt}\n`;

  // OpenAIクライアントの初期化
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const report = response.choices[0]?.message?.content;

    if (!report) {
      throw new Error('AIからのレスポンスにレポート内容が含まれていませんでした。');
    }

    return report;
  } catch (error) {
    console.error('OpenAI API request failed:', error);
    // エラー情報をより詳細にラップして再スロー
    if (error instanceof Error) {
        throw new Error(`AI APIリクエストに失敗しました: ${error.message}`);
    }
    throw new Error('AI APIリクエスト中に不明なエラーが発生しました。');
  }
}
