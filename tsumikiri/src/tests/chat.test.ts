import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { getRuntime } from '@hono/node-server/runtime';
import { SupabaseClient } from '@supabase/supabase-js';
import { default as chatApi } from '../api/chat'; // chat API router
import { default as authApi } from '../api/auth'; // auth API router (for authentication middleware)

// Mock Supabase Client
vi.mock('@supabase/supabase-js', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(() => ({ data: { user: { id: 'test-user-id' } }, error: null })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ data: [{ id: 'message-id-1', content: 'test message' }], error: null })),
      select: vi.fn(() => ({ data: [{ id: 'message-id-1', content: 'hello' }], error: null })),
    })),
  };
  return { createClient: vi.fn(() => mockSupabaseClient), SupabaseClient: vi.fn(() => mockSupabaseClient) };
});

// Mock AI Provider (OpenAI)
vi.mock('openai', () => {
  return {
    OpenAI: vi.fn(() => ({
      chat: {
        completions: {
          create: vi.fn(() => ({
            choices: [{ message: { content: 'AI response' } }],
          })),
        },
      },
    })),
  };
});

// Create a test Hono app
const app = new Hono();
app.use('*', async (c, next) => {
  // Mock authentication middleware
  c.set('userId', 'test-user-id');
  await next();
});
app.route('/api/chat', chatApi);
app.route('/api/auth', authApi); // Mount authApi if needed for full integration test

describe('Chat Feature Integration Tests', () => {
  let supabase: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = require('@supabase/supabase-js').createClient();
  });

  it('should allow authenticated user to send message and receive AI response', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello AI' }),
    });

    const res = await app.request(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toBe('AI response');
    expect(supabase.from('chat_messages').insert).toHaveBeenCalledTimes(2); // user message + AI response
  });

  it('should store and retrieve chat history correctly', async () => {
    // Simulate sending a message first
    const sendReq = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'History test' }),
    });
    await app.request(sendReq);

    const historyReq = new Request('http://localhost/api/chat/history', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await app.request(historyReq);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.history)).toBe(true);
    expect(json.history.length).toBeGreaterThan(0); // Should contain at least the simulated message
    expect(supabase.from('chat_messages').select).toHaveBeenCalledWith('*');
  });

  it('should prevent unauthenticated access to chat API', async () => {
    // Modify the mock auth middleware to return no user
    const unauthenticatedApp = new Hono();
    unauthenticatedApp.use('*', async (c, next) => {
      c.set('userId', undefined); // No user ID
      await next();
    });
    unauthenticatedApp.route('/api/chat', chatApi);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Unauthorized access' }),
    });

    const res = await unauthenticatedApp.request(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });
});
