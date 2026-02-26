import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { Hono } from 'hono';

interface Message {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

type Variables = {
  userId: string | undefined;
}

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
}

const mockGetUser = vi.fn(() => ({ data: { user: { id: 'test-user-id' } }, error: null }));

const mockInsert = vi.fn(() => ({
  data: { id: 'message-id-1', user_id: 'test-user-id', role: 'user', content: 'test message', created_at: new Date().toISOString() },
  error: null,
}));

interface MockQueryChain {
  eq: ReturnType<typeof vi.fn<[string, string], MockQueryChain>>;
  order: ReturnType<typeof vi.fn<[string, { ascending: boolean }], { data: Message[]; error: null }>>;
  select: ReturnType<typeof vi.fn<[string], MockQueryChain>>;
}

const mockSelect = vi.fn((_columns: string) => mockQueryChain);

const mockQueryChain: MockQueryChain = {
  eq: vi.fn((_column: string, _value: string) => mockQueryChain),
  order: vi.fn((_column: string, _options: { ascending: boolean }) => ({
    data: [{
      id: 'message-id-1',
      user_id: 'test-user-id',
      role: 'user',
      content: 'hello',
      created_at: new Date().toISOString()
    }],
    error: null
  }) as { data: Message[]; error: null } ),
  select: mockSelect,
};

const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn((tableName: string) => {
    if (tableName === 'user_settings') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: { openai_api_key: 'mock-openai-key' }, error: null })),
          })),
        })),
      };
    } else if (tableName === 'chat_messages') {
      return {
        insert: mockInsert,
        ...mockQueryChain,
      };
    }
    return { /* default mock for other tables if needed */ };
  }),
};

vi.doMock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
  SupabaseClient: vi.fn(),
}));

const originalFetch = global.fetch;
vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => {
  if (url === 'https://api.openai.com/v1/chat/completions') {
    return Promise.resolve({
      ok: true,
      status: 200,
      body: new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const createChunk = (content: string) => `data: ${JSON.stringify({
            choices: [{
              delta: { content: content }
            }]
          })}\n\n`;
          controller.enqueue(encoder.encode(createChunk('AI response')));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      }),
      json: () => Promise.resolve({ response: 'AI response' }),
      text: () => Promise.resolve('AI response'),
    });
  }
  return originalFetch(url, options);
}));

// Mock AI Provider (OpenAI)
vi.mock('openai', () => {
  return {
    OpenAI: vi.fn(() => ({
      chat: {
        completions: {
          create: vi.fn(async ({ stream }: { stream: boolean }) => {
            if (stream) {
              // For streaming, return an async iterable
              return (async function* () {
                yield {
                  choices: [{
                    delta: {
                      content: 'AI response'
                    }
                  }]
                };
              })();
            }
            // For non-streaming, return a single object
            return {
              choices: [{
                message: { content: 'AI response' }
              }]
            };
          }),
        },
      },
    })),
  };
});

// Create a test Hono app
const app = new Hono<{ Variables: Variables, Bindings: Bindings }>();
app.use('*', async (c, next) => {
  c.set('userId', 'test-user-id');
  c.env = {
    SUPABASE_URL: 'mock-supabase-url',
    SUPABASE_ANON_KEY: 'mock-supabase-anon-key',
    GEMINI_API_KEY: 'mock-gemini-key',
    OPENAI_API_KEY: 'mock-openai-key',
  };
  await next();
});
let chatApi: typeof import('../../api/chat').default;


describe('Chat Feature Integration Tests', () => {

  beforeAll(async () => {
    // Dynamically import chatApi after mocks are set up
    const chatModule = await import('../../api/chat');
    chatApi = chatModule.default;
    app.route('/api/chat', chatApi);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetUser.mockClear();
    mockInsert.mockClear();
    mockSelect.mockClear();
    mockQueryChain.eq.mockClear();
    mockQueryChain.order.mockClear();
  });

  it('should allow authenticated user to send message and receive AI response', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello AI' }] }),
    });

    const res = await app.request(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toBe('AI response');
    expect(mockInsert).toHaveBeenCalledTimes(2); // user message + AI response
  });

  it('should store and retrieve chat history correctly', async () => {
    // Simulate sending a message first
    const sendReq = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'History test' }] }),
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
    expect(mockSelect).toHaveBeenCalledWith('*');
  });

  it('should prevent unauthenticated access to chat API', async () => {
    // Modify the mock auth middleware to return no user
    const unauthenticatedApp = new Hono<{ Variables: Variables, Bindings: Bindings }>();
    unauthenticatedApp.use('*', async (c, next) => {
      c.set('userId', undefined); // No user ID
      c.env = {
        SUPABASE_URL: 'mock-supabase-url',
        SUPABASE_ANON_KEY: 'mock-supabase-anon-key',
        GEMINI_API_KEY: 'mock-gemini-key',
        OPENAI_API_KEY: 'mock-openai-key',
      };
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
