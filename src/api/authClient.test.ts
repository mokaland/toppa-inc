import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUp, signIn, getSession, signOut } from './authClient';

// Mock Supabase client
const mockAuth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: mockAuth,
  })),
}));

describe('authClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signUp should successfully register a user', async () => {
    mockAuth.signUp.mockResolvedValueOnce({ data: { user: { id: 'mock-user-id', email: 'test@example.com' } }, error: null });

    const data = await signUp('test@example.com', 'password123');
    expect(mockAuth.signUp).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(data.user).toEqual({ id: 'mock-user-id', email: 'test@example.com' });
  });

  it('signUp should throw an error on failure', async () => {
    mockAuth.signUp.mockResolvedValueOnce({ data: null, error: new Error('Mock signup error') });

    await expect(signUp('error@example.com', 'password123')).rejects.toThrow('Mock signup error');
  });

  it('signIn should successfully log in a user', async () => {
    mockAuth.signInWithPassword.mockResolvedValueOnce({ data: { session: { access_token: 'mock-token', user: { id: 'mock-user-id', email: 'test@example.com' } } }, error: null });

    const data = await signIn('test@example.com', 'password123');
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(data.session?.access_token).toBe('mock-token');
  });

  it('signIn should throw an error on failure', async () => {
    mockAuth.signInWithPassword.mockResolvedValueOnce({ data: null, error: new Error('Mock signin error') });

    await expect(signIn('error@example.com', 'password123')).rejects.toThrow('Mock signin error');
  });

  it('getSession should return a session if available', async () => {
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: { access_token: 'mock-token', user: { id: 'mock-user-id', email: 'mock@example.com' } } }, error: null });

    const session = await getSession();
    expect(mockAuth.getSession).toHaveBeenCalled();
    expect(session?.access_token).toBe('mock-token');
  });

  it('getSession should return null on error', async () => {
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Mock getSession error') });

    const session = await getSession();
    expect(mockAuth.getSession).toHaveBeenCalled();
    expect(session).toBeNull();
  });

  it('signOut should successfully log out a user', async () => {
    mockAuth.signOut.mockResolvedValueOnce({ error: null });

    const result = await signOut();
    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('signOut should throw an error on failure', async () => {
    mockAuth.signOut.mockResolvedValueOnce({ error: new Error('Mock signOut error') });

    await expect(signOut()).rejects.toThrow('Mock signOut error');
  });
});
