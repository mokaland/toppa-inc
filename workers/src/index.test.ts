import { expect, test, vi } from 'vitest';
import { createWorkerApp } from './index'; // createWorkerApp をインポート
import { supabaseMiddleware } from './middleware/supabase';
import { authMiddleware } from './middleware/auth';
import { Hono } from 'hono'; // Import Hono

// モックの環境変数
const mockBindings = {
  SUPABASE_URL: 'http://mock.supabase.url',
  SUPABASE_ANON_KEY: 'mock-anon-key',
  OPENAI_API_KEY: 'mock-openai-key',
};

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: vi.fn(async () => ({
          choices: [{ message: { content: 'AIアシスタントからの応答' } }],
        })),
      },
    };
  },
}));
// supabaseMiddlewareとauthMiddlewareをモックする
vi.mock('./middleware/supabase', () => ({
  supabaseMiddleware: vi.fn(async (c, next) => {
    c.set('supabase', mockSupabase);
    await next();
  }),
}));

vi.mock('./middleware/auth', () => ({
  authMiddleware: vi.fn(async (c, next) => {
    c.set('user', { id: 'test-user-id' }); // モックユーザーを設定
    await next();
  }),
}));

// テスト用のHonoアプリケーションを作成し、createWorkerAppをマウント
const testApp = new Hono();
testApp.use('*', async (c, next) => {
  c.env = mockBindings; // c.env にモックの環境変数を設定
  await next();
});
testApp.route('/', createWorkerApp(mockBindings)); // createWorkerApp をルートにマウント

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

// createClient のモック
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));


test('POST /api/chat should return AI response', async () => {
  const res = await testApp.request('http://localhost/api/chat', {
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
  const res = await testApp.request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello AI' }), // userId missing
  });
  expect(res.status).toBe(400);
  const json = await res.json();
  expect(json.error).toBe('userId and message are required');
});

test('GET /api/chat/history should return chat history', async () => {
  const res = await testApp.request('http://localhost/api/chat/history?userId=test-user', {
    method: 'GET',
  });
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.history).toHaveLength(1);
  expect(json.history[0].content).toBe('msg1');
});

test('GET /api/chat/history should return 400 if userId is missing', async () => {
  const res = await testApp.request('http://localhost/api/chat/history', {
    method: 'GET',
  });
  expect(res.status).toBe(400);
  const json = await res.json();
  expect(json.error).toBe('userId is required');
});
