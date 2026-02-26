import { Hono } from 'hono';
import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import reportHandler from './report';


// Define Env interface locally to match report.ts
interface Env {
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}
import { streamText } from 'hono/streaming';

vi.mock('hono/streaming', () => ({ streamText: vi.fn() }));

const mockStreamText = vi.mocked(streamText); // Correctly mock streamText

// Define a minimal interface for the mocked GoogleGenerativeAI model
interface MockGenerativeModel {
  generateContent: typeof mockGenerateContentRef;
}

// Define a minimal interface for the mocked Supabase client's `from` method return
interface MockPostgrestFilterBuilder {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

interface MockSupabaseError {
  message: string;
  code: string;
  details: string;
  hint: string;
}

interface MockStreamingApi {
  write: ReturnType<typeof vi.fn>;
  writer?: WritableStreamDefaultWriter<unknown>; // Make optional and use specific type if possible, or any if not critical for test logic
  encoder?: TextEncoder; // Make optional
  writable?: WritableStream<unknown>; // Make optional
  abortSubscribers: unknown[];
  onAbort: ReturnType<typeof vi.fn>;
  onClose: ReturnType<typeof vi.fn>;
  pipe: ReturnType<typeof vi.fn>;
  pipeTo: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  ready: Promise<void>;
  responseReadable?: ReadableStream<unknown>; // Make optional
  aborted: boolean;
  closed: boolean;
  writeln: ReturnType<typeof vi.fn>;
  locked: boolean;
  signal: AbortSignal;
  sleep: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
}

let mockSupabaseFrom: MockedFunction<(tableName: string) => MockPostgrestFilterBuilder>;
let mockGenerateContentRef: ReturnType<typeof vi.fn>; // Mutable reference for generateContent mock

// Mock the GoogleGenerativeAI globally, and its generateContent will be controlled from beforeEach
vi.mock('@google/generative-ai', () => {
  const mockGetGenerativeModel = vi.fn((): MockGenerativeModel => ({
    generateContent: mockGenerateContentRef,
  }));
  const GoogleGenerativeAI = vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));
  return { GoogleGenerativeAI };
});

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((tableName: string) => mockSupabaseFrom(tableName)),
  },
}));



describe('report handler', () => {
    let app: Hono;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    const mockEnv: Env = {
      GEMINI_API_KEY: 'mock-gemini-api-key',
      SUPABASE_URL: 'mock-supabase-url',
      SUPABASE_ANON_KEY: 'mock-supabase-anon-key',
    };
  
    let capturedInsertMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                  app = new Hono();
                  app.route('/report', reportHandler); // Mount the reportHandler Hono instance
            
                  mockGenerateContentRef = vi.fn(); // Re-initialize for each test
                  capturedInsertMock = vi.fn().mockResolvedValue({ data: [{ id: 1, user_id: 'test-user-id', title: 'Mock AI Report' }], error: null });
                  mockSupabaseFrom = vi.fn((_tableName: string) => {
                    return {
                      insert: capturedInsertMock,
                      select: vi.fn(() => ({} as MockPostgrestFilterBuilder)),
                      eq: vi.fn(() => ({} as MockPostgrestFilterBuilder)),
                      order: vi.fn(() => ({} as MockPostgrestFilterBuilder)),
                      limit: vi.fn(() => ({} as MockPostgrestFilterBuilder)),
                      single: vi.fn(() => ({} as MockPostgrestFilterBuilder)),
                    };
                  }) as MockedFunction<(tableName: string) => MockPostgrestFilterBuilder>;
            
                  // Default mock for successful AI response
                  mockGenerateContentRef.mockResolvedValue({
                    response: {
                      text: () => 'Mock AI Report Content',
                    },
                  });
            
                  // Reset mockStreamText implementation for each test
                  mockStreamText.mockImplementation((_c, callback) => {
                    const mockStream: MockStreamingApi = {
                      write: vi.fn(() => Promise.resolve()), // Ensure write method always resolves
                      onAbort: vi.fn(),
                      onClose: vi.fn(),
                      pipe: vi.fn(),
                      pipeTo: vi.fn(),
                      cancel: vi.fn(),
                      close: vi.fn(),
                      ready: Promise.resolve(),
                      aborted: false,
                      closed: false,
                      writeln: vi.fn(),
                      locked: false,
                      signal: new AbortController().signal,
                      sleep: vi.fn(),
                      abort: vi.fn(),
                      abortSubscribers: [], // Added to satisfy MockStreamingApi
                    };
                    callback(mockStream as any);
                    return new Response('mocked stream', { status: 200 });
                  });
                });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });


  it('should successfully generate a report and save it to Supabase', async () => {
    const res = await app.request('/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csvData: [{ column1: 'data1' }],
        userInstruction: 'Generate a summary.',
        user_id: 'test-user-id',
      }),
    }, mockEnv);

    expect(res.status).toBe(200);
    expect(mockGenerateContentRef).toHaveBeenCalledTimes(1);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('reports');
    expect(capturedInsertMock).toHaveBeenCalledWith({
      user_id: 'test-user-id',
      title: expect.any(String),
      file_name: 'generated_report.md',
      prompt: expect.any(String),
      result: 'Mock AI Report Content',
    });
    expect(mockStreamText).toHaveBeenCalledTimes(1);
    // Verify the content passed to streamText callback
    const streamCallback = mockStreamText.mock.calls[0][1];
    const mockStreamInstance: MockStreamingApi = {
      write: vi.fn(),
      abortSubscribers: [],
      onAbort: vi.fn(),
      onClose: vi.fn(),
      pipe: vi.fn(),
      pipeTo: vi.fn(),
      cancel: vi.fn(),
      close: vi.fn(),
      ready: Promise.resolve(),
      aborted: false,
      closed: false,
      writeln: vi.fn(),
      locked: false,
      signal: new AbortController().signal,
      sleep: vi.fn(),
      abort: vi.fn(),
    };
    await streamCallback(mockStreamInstance as any);
    expect(mockStreamInstance.write).toHaveBeenCalledWith(JSON.stringify({ report: 'Mock AI Report Content' }));
  });

  it('should return 400 if user_id is missing', async () => {
    const res = await app.request('/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csvData: [{ column1: 'data1' }],
        userInstruction: 'Generate a summary.',
        user_id: undefined,
      }),
    }, mockEnv);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'User ID is required' });
    expect(mockGenerateContentRef).not.toHaveBeenCalled();
    expect(mockSupabaseFrom).not.toHaveBeenCalled(); // Changed to check mockSupabaseFrom directly
  });

  it('should return 500 if Gemini API request fails', async () => {
    mockGenerateContentRef.mockRejectedValueOnce(new Error('Gemini API error'));

    const res = await app.request('/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csvData: [{ column1: 'data1' }],
        userInstruction: 'Generate a summary.',
        user_id: 'test-user-id',
      }),
    }, mockEnv);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'レポートの生成に失敗しました。もう一度お試しください' });
    expect(mockGenerateContentRef).toHaveBeenCalledTimes(1);
    expect(mockSupabaseFrom).not.toHaveBeenCalled(); // Supabase should not be called on Gemini API failure
    expect(capturedInsertMock).not.toHaveBeenCalled(); // Check insert on the result of from('reports')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Gemini API request failed:', expect.any(Error));
  });

  it('should return 500 if Supabase insert fails', async () => {
    // Mock only the insert call for this specific test case
    mockSupabaseFrom.mockImplementation((_tableName: string) => {
      capturedInsertMock.mockResolvedValueOnce({
        error: {
          message: 'Supabase insert error mock',
          code: '23505', // Example code
          details: 'mock details',
          hint: 'mock hint',
        } as MockSupabaseError,
      });
      return {
        insert: capturedInsertMock,
        select: vi.fn(() => ({} as MockPostgrestFilterBuilder)),
        eq: vi.fn(() => ({} as MockPostgrestFilterBuilder)),
        order: vi.fn(() => ({} as MockPostgrestFilterBuilder)),
        limit: vi.fn(() => ({} as MockPostgrestFilterBuilder)),
        single: vi.fn(() => ({} as MockPostgrestFilterBuilder)),
      };
    });

    const res = await app.request('/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csvData: [{ column1: 'data1' }],
        userInstruction: 'Generate a summary.',
        user_id: 'test-user-id',
      }),
    }, mockEnv);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'レポート履歴の保存に失敗しました。' });
    expect(mockGenerateContentRef).toHaveBeenCalledTimes(1);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('reports');
    expect(capturedInsertMock).toHaveBeenCalledTimes(1); // Check insert on the result of from('reports')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Supabase insert failed:', expect.objectContaining({
      message: 'Supabase insert error mock',
      code: '23505',
      details: 'mock details',
      hint: 'mock hint',
    }));
  });
});
