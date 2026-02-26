import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import reportHandler from './report';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabaseClient';
// Define Env interface locally to match report.ts
interface Env {
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}
import { streamText } from 'hono/streaming';
import type { PostgrestQueryBuilder } from '@supabase/postgrest-js'; // Import for better typing of supabase mock


// Mock the GoogleGenerativeAI
vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
    // Add minimal properties to satisfy GenerativeModel interface if needed by TS
    model: "mock-model",
    apiKey: "mock-api-key",
    generationConfig: {},
    safetySettings: [],
    startChat: vi.fn(), // Required by GenerativeModel
    countTokens: vi.fn(), // Required by GenerativeModel
    onStreamGenerateContent: vi.fn(), // Required by GenerativeModel
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
    // Add other PostgrestQueryBuilder methods if used in report.ts (e.g., select, update, delete)
    // For now, only insert is relevant and needed for typing.
    select: vi.fn(() => ({ data: [], error: null })),
    eq: vi.fn(() => ({ data: [], error: null })),
    order: vi.fn(() => ({ data: [], error: null })),
    limit: vi.fn(() => ({ data: [], error: null })),
    single: vi.fn(() => ({ data: [], error: null })),
  })) as unknown as PostgrestQueryBuilder<any, any, any, string, unknown>; // Cast to satisfy PostgrestQueryBuilder type

  return {
    supabase: {
      from: mockFrom,
    },
  };
});

vi.mock('hono/streaming', () => ({
  streamText: vi.fn((_c, callback) => {
    const mockStream = {
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
    callback(mockStream as any);
    return new Response('mocked stream', { status: 200 });
  }),
}));


const mockedGoogleGenerativeAI = vi.mocked(GoogleGenerativeAI);
const mockSupabaseFrom = vi.mocked(supabase.from);
const mockStreamText = vi.mocked(streamText); // Correctly mock streamText


let mockGenerateContent: ReturnType<typeof vi.fn>;


describe('report handler', () => {
  let mockC: any;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;


  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    jsonSpy = vi.fn();
    statusSpy = vi.fn((statusCode) => ({ json: jsonSpy, status: statusCode })); // Mock status chainable


    mockC = {
      req: {
        json: vi.fn(),
      },
      env: {
        GEMINI_API_KEY: 'mock-gemini-api-key',
        SUPABASE_URL: 'mock-supabase-url',
        SUPABASE_ANON_KEY: 'mock-supabase-anon-key',
      } as Env,
      json: jsonSpy,
      status: statusSpy, // Direct status mock
    };

    mockGenerateContent = vi.fn();
    mockedGoogleGenerativeAI.mockImplementation(() => ({
      apiKey: 'mock-api-key', // Added missing apiKey property
      getGenerativeModel: vi.fn(() => ({
        generateContent: mockGenerateContent,
        // Match the mockGetGenerativeModel in vi.mock block
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
      })),
    }));

    // Default mock for successful AI response
    mockGenerateContent.mockResolvedValue({
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
                write: vi.fn(),

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
      callback(mockStream as any);
      return new Response('mocked stream', { status: 200 });
    });

  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should successfully generate a report and save it to Supabase', async () => {
    const mockCsvData = [{ column1: 'data1' }];
    const mockUserInstruction = 'Generate a summary.';
    const mockUserId = 'test-user-id';

    mockC.req.json.mockResolvedValueOnce({
      csvData: mockCsvData,
      userInstruction: mockUserInstruction,
      user_id: mockUserId,
    });

    // Directly call the handler function, not app.request
    const handler = (reportHandler as any).post; // Access the post method
    await handler('/generate', mockC); // Pass the route and mocked context

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('reports');
    // Correct way to assert on the insert call after from('reports')
    const insertMock = (mockSupabaseFrom('reports') as any).insert;
    expect(insertMock).toHaveBeenCalledWith({
      user_id: mockUserId,
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
    const mockCsvData = [{ column1: 'data1' }];
    const mockUserInstruction = 'Generate a summary.';

    mockC.req.json.mockResolvedValueOnce({
      csvData: mockCsvData,
      userInstruction: mockUserInstruction,
      user_id: undefined,
    });

    const handler = (reportHandler as any).post;
    await handler('/generate', mockC);

    expect(mockC.json).toHaveBeenCalledWith({ error: 'User ID is required' }, 400);
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(mockSupabaseFrom).not.toHaveBeenCalled(); // Changed to check mockSupabaseFrom directly
  });

  it('should return 500 if Gemini API request fails', async () => {
    mockC.req.json.mockResolvedValueOnce({
      csvData: [{ column1: 'data1' }],
      userInstruction: 'Generate a summary.',
      user_id: 'test-user-id',
    });
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini API error'));

    const handler = (reportHandler as any).post;
    await handler('/generate', mockC);

    expect(mockC.json).toHaveBeenCalledWith({ error: 'レポートの生成に失敗しました。もう一度お試しください' }, 500);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('reports'); // Changed to check mockSupabaseFrom directly
    expect((mockSupabaseFrom('reports') as any).insert).not.toHaveBeenCalled(); // Check insert on the result of from('reports')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Gemini API request failed:', expect.any(Error));
  });

  it('should return 500 if Supabase insert fails', async () => {
    mockC.req.json.mockResolvedValueOnce({
      csvData: [{ column1: 'data1' }],
      userInstruction: 'Generate a summary.',
      user_id: 'test-user-id',
    });

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


    const handler = (reportHandler as any).post;
    await handler('/generate', mockC);

    expect(mockC.json).toHaveBeenCalledWith({ error: 'レポート履歴の保存に失敗しました。' }, 500);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('reports');
    expect((mockSupabaseFrom('reports') as any).insert).toHaveBeenCalledTimes(1); // Check insert on the result of from('reports')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Supabase insert failed:', expect.any(Error));
  });
});