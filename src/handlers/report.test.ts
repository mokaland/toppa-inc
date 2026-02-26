import { Hono } from 'hono';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import reportHandler from './report';

import { supabase } from '../lib/supabaseClient';
// Define Env interface locally to match report.ts
interface Env {
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}
import { streamText } from 'hono/streaming';
import type { PostgrestQueryBuilder } from '@supabase/postgrest-js'; // Import for better typing of supabase mock

// Mock the GoogleGenerativeAI globally, and its generateContent will be controlled from beforeEach
vi.mock('@google/generative-ai', () => {
  // Use the mutable reference directly
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContentRef, // Use the global mutable ref
    model: "mock-model",
    apiKey: "mock-api-key",
    generationConfig: {},
    safetySettings: [],
    startChat: vi.fn(),
    countTokens: vi.fn(),
    onStreamGenerateContent: vi.fn(),
    requestOptions: {} as any,
    generateContentStream: vi.fn(),
    embedContent: vi.fn(),
    batchEmbedContents: vi.fn(),
  }));
  const GoogleGenerativeAI = vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));
  return { GoogleGenerativeAI };
});

vi.mock('../lib/supabaseClient', () => {
  const mockInsert = vi.fn();
  const mockFrom = vi.fn((_tableName: string) => ({
    insert: mockInsert,
    select: vi.fn(() => ({ data: [], error: null })),
    eq: vi.fn(() => ({ data: [], error: null })),
    order: vi.fn(() => ({ data: [], error: null })),
    limit: vi.fn(() => ({ data: [], error: null })),
    single: vi.fn(() => ({ data: [], error: null })),
  })) as unknown as PostgrestQueryBuilder<any, any, any, string, unknown>;

  return {
    supabase: {
      from: mockFrom,
    },
  };
});

vi.mock('hono/streaming', () => ({
  streamText: vi.fn((_c, callback) => {
    const mockStream = {
      write: vi.fn(() => Promise.resolve()), // Ensure write method always resolves
      writer: {} as any,
      encoder: {} as any,
      writable: {} as any,
      abortSubscribers: [],
      onAbort: vi.fn(),
      onClose: vi.fn(),
      pipe: vi.fn(),
      pipeTo: vi.fn(),
      cancel: vi.fn(),
      close: vi.fn(),
      ready: Promise.resolve(),
      responseReadable: {} as any,
      aborted: false,
      closed: false,
      writeln: vi.fn(),
      locked: false,
      signal: new AbortController().signal,
      sleep: vi.fn(),
      abort: vi.fn(),
    };
    callback(mockStream as any);
    return new Response('mocked stream', { status: 200 });
  }),
}));



const mockSupabaseFrom = vi.mocked(supabase.from);
const mockStreamText = vi.mocked(streamText); // Correctly mock streamText


let mockGenerateContentRef: ReturnType<typeof vi.fn>; // Mutable reference for generateContent mock




describe('report handler', () => {
    let app: Hono;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    const mockEnv: Env = {
      GEMINI_API_KEY: 'mock-gemini-api-key',
      SUPABASE_URL: 'mock-supabase-url',
      SUPABASE_ANON_KEY: 'mock-supabase-anon-key',
    };
  
    beforeEach(() => {
      vi.clearAllMocks();
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                  app = new Hono();
                  app.route('/report', reportHandler); // Mount the reportHandler Hono instance
            
                  mockGenerateContentRef = vi.fn(); // Re-initialize for each test
            
                  // Default mock for successful AI response
                  mockGenerateContentRef.mockResolvedValue({
                    response: {
                      text: () => 'Mock AI Report Content',
                    },
                  });
            
                  // Default mock for successful Supabase insert
                  // Use mockImplementation to simulate from().insert() chain
                  (mockSupabaseFrom as any).mockImplementation((_tableName: string) => {
                    const mockInsert = vi.fn().mockResolvedValue({ data: [{ id: 1, user_id: 'test-user-id', title: 'Mock AI Report' }], error: null });
                    return {
                      insert: mockInsert,
                      select: vi.fn(() => ({ data: [], error: null })),
                      eq: vi.fn(() => ({ data: [], error: null })),
                      order: vi.fn(() => ({ data: [], error: null })),
                      limit: vi.fn(() => ({ data: [], error: null })),
                      single: vi.fn(() => ({ data: [], error: null })),
                    };
                  });
            
                  // Reset mockStreamText implementation for each test
                  mockStreamText.mockImplementation((_c, callback) => {
                    const mockStream = {
                      write: vi.fn(() => Promise.resolve()), // Ensure write method always resolves
                      onAbort: vi.fn(),
                      onClose: vi.fn(),
                      pipe: vi.fn(),
                      pipeTo: vi.fn(),
                      cancel: vi.fn(),
                      close: vi.fn(),
                      ready: Promise.resolve(),
                      responseReadable: {} as any,
                      aborted: false,
                      closed: false,
                      writeln: vi.fn(),
                      locked: false,
                      signal: new AbortController().signal,
                      sleep: vi.fn(),
                      abort: vi.fn(),
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
    // Correct way to assert on the insert call after from('reports')
    const insertMock = (mockSupabaseFrom('reports') as any).insert;
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'test-user-id',
      title: expect.any(String),
      file_name: 'generated_report.md',
      prompt: expect.any(String),
      result: 'Mock AI Report Content',
    });
    expect(mockStreamText).toHaveBeenCalledTimes(1);
    // Verify the content passed to streamText callback
    const streamCallback = mockStreamText.mock.calls[0][1];
    const mockStreamInstance = {
      write: vi.fn(),
      writer: {} as any,
      encoder: {} as any,
      writable: {} as any,
      abortSubscribers: [],
      onAbort: vi.fn(),
      onClose: vi.fn(),
      pipe: vi.fn(),
      pipeTo: vi.fn(),
      cancel: vi.fn(),
      close: vi.fn(),
      ready: Promise.resolve(),
      // Added missing properties for StreamingApi
      responseReadable: {} as any,
      aborted: false,
      closed: false,
      writeln: vi.fn(),
      // Additional properties if needed
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
    expect((mockSupabaseFrom('reports') as any).insert).not.toHaveBeenCalled(); // Check insert on the result of from('reports')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Gemini API request failed:', expect.any(Error));
  });

  it('should return 500 if Supabase insert fails', async () => {
    // Mock only the insert call for this specific test case
    (mockSupabaseFrom as any).mockImplementation((_tableName: string) => {
      const mockInsert = vi.fn().mockResolvedValue({
        error: {
          message: 'Supabase insert error mock',
          code: '23505', // Example code
          details: 'mock details',
          hint: 'mock hint',
        } as any, // Cast to any to satisfy type expectations in mock
      });
      return {
        insert: mockInsert,
        select: vi.fn(() => ({ data: [], error: null })),
        eq: vi.fn(() => ({ data: [], error: null })),
        order: vi.fn(() => ({ data: [], error: null })),
        limit: vi.fn(() => ({ data: [], error: null })),
        single: vi.fn(() => ({ data: [], error: null })),
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
    expect((mockSupabaseFrom('reports') as any).insert).toHaveBeenCalledTimes(1); // Check insert on the result of from('reports')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Supabase insert failed:', expect.any(Error));
  });
});