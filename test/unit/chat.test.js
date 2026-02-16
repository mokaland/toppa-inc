const { sendMessage, getChatHistory } = require('../../src/api/chat');

describe('chat API client', () => {
  global.fetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sendMessageが正しいリクエストを送信し、AI応答を返すこと', async () => {
    const mockAiResponseContent = 'こんにちは、AIアシスタントです。';
    const mockResponse = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockAiResponseContent) })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    };

    fetch.mockResolvedValueOnce(mockResponse);

    const userId = 'test-user-1';
    const message = 'こんにちは';
    const result = await sendMessage(userId, message);

    expect(fetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message }),
    });
    expect(result.role).toBe('assistant');
    expect(result.content).toBe(mockAiResponseContent);
    expect(result.userId).toBe(userId);
  });

  it('getChatHistoryが正しいリクエストを送信し、履歴を返すこと', async () => {
    const mockHistory = [
      { id: '1', userId: 'test-user-1', role: 'user', content: '質問1', createdAt: '2026-02-16T00:00:00Z' },
      { id: '2', userId: 'test-user-1', role: 'assistant', content: '回答1', createdAt: '2026-02-16T00:00:01Z' },
    ];
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ history: mockHistory }),
    };

    fetch.mockResolvedValueOnce(mockResponse);

    const userId = 'test-user-1';
    const result = await getChatHistory(userId);

    expect(fetch).toHaveBeenCalledWith(`/api/chat/history?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(mockHistory);
  });

  it('sendMessageがエラー時に例外をスローすること', async () => {
    const mockErrorResponse = {
      ok: false,
      status: 500,
    };
    fetch.mockResolvedValueOnce(mockErrorResponse);

    const userId = 'test-user-1';
    const message = 'エラーメッセージ';

    await expect(sendMessage(userId, message)).rejects.toThrow('Failed to send message');
  });

  it('getChatHistoryがエラー時に例外をスローすること', async () => {
    const mockErrorResponse = {
      ok: false,
      status: 500,
    };
    fetch.mockResolvedValueOnce(mockErrorResponse);

    const userId = 'test-user-1';

    await expect(getChatHistory(userId)).rejects.toThrow('Failed to get chat history');
  });
});