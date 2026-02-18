// AI Gatewayのプレースホルダー実装
// 将来的には、OpenAI, Anthropic, Googleなどの複数のLLMを呼び出すためのロジックがここに入る。

/**
 * 指定されたプロンプトを使用してAIモデルを呼び出し、テキスト生成を行う
 * @param prompt AIに渡すプロンプト
 * @returns AIが生成したテキスト
 */
export const callAiGateway = async (prompt: string): Promise<string> => {
  console.log("AI Gateway called. (Placeholder)");
  // 実際のAPI呼び出しの代わりに、固定のモック応答を返す
  if (!prompt) {
    return Promise.resolve("エラー: プロンプトが空です。");
  }
  
  // ここに実際のLLM API呼び出しコードが入る
  // 例: const response = await openai.chat.completions.create(...)
  
  return Promise.resolve(\`## AI生成レポート（モック）

  ご依頼のありましたレポートを作成しました。

  ### 分析概要
  - **指示内容**: ${prompt.substring(0, 100)}...
  - **データ**: CSVデータに基づき分析しました。

  ### 結果
  - こちらはモック応答です。実際のAI Gatewayが実装されると、ここに分析結果が表示されます。
  \`);
};
