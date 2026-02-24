import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { AuthResponse, Session } from '@supabase/supabase-js';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:8000');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'dummy-key');

const mockSignUp = vi.fn<(email: string, password: string) => Promise<AuthResponse['data']>>();
const mockSignInWithPassword = vi.fn<({ email, password }: { email: string; password: string }) => Promise<AuthResponse['data']>> ();
const mockGetSession = vi.fn<() => Promise<{ data: { session: Session | null }, error: Error | null }>> ();
const mockSignOut = vi.fn<() => Promise<{ error: Error | null }>> ();

vi.doMock('@supabase/supabase-js', async (importOriginal) => {
  const original = await importOriginal<typeof import('@supabase/supabase-js')>();
  return {
    ...original,
    createClient: vi.fn(() => ({
      auth: {
        signUp: mockSignUp,
        signInWithPassword: mockSignInWithPassword,
        getSession: mockGetSession,
        signOut: mockSignOut,
      },
    })),
  };
});

let signUp: (email: string, password: string) => Promise<AuthResponse['data']>;
let signIn: (email: string, password: string) => Promise<AuthResponse['data']>;
let getSession: () => Promise<Session | null>;
let signOut: () => Promise<{ success: boolean }>;

describe('authClient', () => {
  beforeAll(async () => {
    // Dynamically import authClient after mocks are set up
    const authClientModule = await import('./authClient');
    signUp = authClientModule.signUp;
    signIn = authClientModule.signIn;
    getSession = authClientModule.getSession;
    signOut = authClientModule.signOut;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockReset();
    mockSignInWithPassword.mockReset();
    mockGetSession.mockReset();
    mockSignOut.mockReset();
  });

  it('signUp should successfully register a user', async () => {
        mockSignUp.mockResolvedValueOnce({ user: { id: 'mock-user-id', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() }, session: null });

    const data = await signUp('test@example.com', 'password123');
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(data.user?.id).toEqual('mock-user-id');
    expect(data.user?.email).toEqual('test@example.com');
  });

  it('signUp should throw an error on failure', async () => {
        mockSignUp.mockResolvedValueOnce({ user: null, session: null });

    await expect(signUp('error@example.com', 'password123')).rejects.toThrow('Mock signup error');
  });

  it('signIn should successfully log in a user', async () => {
        mockSignInWithPassword.mockResolvedValueOnce({ user: { id: 'mock-user-id', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() }, session: { access_token: 'mock-token', token_type: 'bearer', expires_in: 3600, expires_at: Date.now() / 1000 + 3600, refresh_token: 'mock-refresh-token', user: { id: 'mock-user-id', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() } } });

    const data = await signIn('test@example.com', 'password123');
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(data.session?.access_token).toBe('mock-token');
  });

  it('signIn should throw an error on failure', async () => {
        mockSignInWithPassword.mockResolvedValueOnce({ user: null, session: null });

    await expect(signIn('error@example.com', 'password123')).rejects.toThrow('Mock signin error');
  });

  it('getSession should return a session if available', async () => {
        mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'mock-token', token_type: 'bearer', expires_in: 3600, expires_at: Date.now() / 1000 + 3600, refresh_token: 'mock-refresh-token', user: { id: 'mock-user-id', email: 'mock@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() } } }, error: null });

    const session = await getSession();
    expect(mockGetSession).toHaveBeenCalled();
    expect(session?.access_token).toBe('mock-token');
  });

  it('getSession should return null on error', async () => {
        mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Mock getSession error') });

    const session = await getSession();
    expect(mockGetSession).toHaveBeenCalled();
    expect(session).toBeNull();
  });

  it('signOut should successfully log out a user', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });

    const result = await signOut();
    expect(mockSignOut).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('signOut should throw an error on failure', async () => {
    mockSignOut.mockResolvedValueOnce({ error: new Error('Mock signOut error') });

    await expect(signOut()).rejects.toThrow('Mock signOut error');
  });
});
