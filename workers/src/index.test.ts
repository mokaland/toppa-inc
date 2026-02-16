import { Hono } from 'hono';
import { expect, test, vi } from 'vitest';
import app from './index'; // index.ts から app をインポート

// Supabaseクライアントのモック
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({ data: [{ id: 'mock-id', user_id: 'test-user', role: 'user', content: 'hello' }], error: null })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({ data: [{ id: 'mock-id-1', user_id: 'test-user', role: 'user', content: 'msg1' }], error: null })),
      })),
    })),
  })),
};

// env 関数のモック
vi.mock('hono/adapter', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    env: vi.fn(() => ({
      SUPABASE_URL: 'http://mock.supabase.url',
      SUPABASE_ANON_KEY: 'mock-anon-key',
    })),
  };
});

// createClient のモック
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));


test('POST /api/chat should return AI response', async () => {
  const res = await app.request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'test-user', message: 'Hello AI' }),
  });
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.userMessage.content).toBe('Hello AI');
  expect(json.aiMessage.content).toContain('AIアシスタントからの応答');
});

test('POST /api/chat should return 400 if userId or message is missing', async () => {
  const res = await app.request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello AI' }), // userId missing
  });
  expect(res.status).toBe(400);
  const json = await res.json();
  expect(json.error).toBe('userId and message are required');
});

test('GET /api/chat/history should return chat history', async () => {
  const res = await app.request('http://localhost/api/chat/history?userId=test-user', {
    method: 'GET',
  });
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.history).toHaveLength(1);
  expect(json.history[0].content).toBe('msg1');
});

test('GET /api/chat/history should return 400 if userId is missing', async () => {
  const res = await app.request('http://localhost/api/chat/history', {
    method: 'GET',
  });
  expect(res.status).toBe(400);
  const json = await res.json();
  expect(json.error).toBe('userId is required');
});
