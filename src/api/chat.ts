interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export async function sendMessage(userId: string, message: string): Promise<ChatMessage> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, message }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  const reader = response.body?.getReader();
  let result = '';
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    result += new TextDecoder().decode(value);
  }

  return {
    id: 'ai-response-' + Date.now().toString(),
    userId,
    role: 'assistant',
    content: result,
    createdAt: new Date().toISOString(),
  };
}

export async function getChatHistory(userId: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/chat/history?userId=${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get chat history');
  }

  const data = await response.json();
  return data.history;
}