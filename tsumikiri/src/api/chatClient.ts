// tsumikiri/src/api/chatClient.ts

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessage(message: string, userId: string): Promise<ChatMessage> {
  // ここではモックとして固定の応答を返す
  console.log(`Sending message: "${message}" from user: ${userId}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ role: 'assistant', content: `AIからの応答: ${message}` });
    }, 500);
  });
}

export async function getChatHistory(userId: string): Promise<ChatMessage[]> {
  // ここではモックとして固定の履歴を返す
  console.log(`Getting chat history for user: ${userId}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { role: 'user', content: 'こんにちは' },
        { role: 'assistant', content: '何かお手伝いできることはありますか？' },
      ]);
    }, 300);
  });
}
