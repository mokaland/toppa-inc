import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, getChatHistory } from '../../src/api/chat';

describe('chat API client', () => {
  // Mock the global fetch function
  global.fetch = vi.fn();

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('sendMessage should send the correct request and return AI response', async () => {
    const mockAiResponseContent = 'こんにちは、AIアシスタントです。';
    const mockResponse = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockAiResponseContent) })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    };

    (global.fetch as vi.Mock).mockResolvedValueOnce(mockResponse);

    const userId = 'test-user-1';
    const message = 'こんにちは';
    const result = await sendMessage(userId, message);

    expect(global.fetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message }),
    });
    expect(result.role).toBe('assistant');
    expect(result.content).toBe(mockAiResponseContent);
    expect(result.userId).toBe(userId);
  });

  it('getChatHistory should send the correct request and return history', async () => {
    const mockHistory = [
      { id: '1', userId: 'test-user-1', role: 'user', content: '質問1', createdAt: '2026-02-16T00:00:00Z' },
      { id: '2', userId: 'test-user-1', role: 'assistant', content: '回答1', createdAt: '2026-02-16T00:00:01Z' },
    ];
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ history: mockHistory }),
    };

    (global.fetch as vi.Mock).mockResolvedValueOnce(mockResponse);

    const userId = 'test-user-1';
    const result = await getChatHistory(userId);

    expect(global.fetch).toHaveBeenCalledWith(`/api/chat/history?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(mockHistory);
  });

  it('sendMessage should throw an exception on error', async () => {
    const mockErrorResponse = {
      ok: false,
      status: 500,
    };
    (global.fetch as vi.Mock).mockResolvedValueOnce(mockErrorResponse);

    const userId = 'test-user-1';
    const message = 'エラーメッセージ';

    await expect(sendMessage(userId, message)).rejects.toThrow('Failed to send message');
  });

  it('getChatHistory should throw an exception on error', async () => {
    const mockErrorResponse = {
      ok: false,
      status: 500,
    };
    (global.fetch as vi.Mock).mockResolvedValueOnce(mockErrorResponse);

    const userId = 'test-user-1';

    await expect(getChatHistory(userId)).rejects.toThrow('Failed to get chat history');
  });
});
