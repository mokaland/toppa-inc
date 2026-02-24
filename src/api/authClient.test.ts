import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock('./authClient', () => ({
  signUp: mockSignUp,
  signIn: mockSignIn,
  getSession: mockGetSession,
  signOut: mockSignOut,
  default: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  },
}));

// モックされた関数をインポート
import { signUp, signIn, getSession, signOut } from './authClient';

describe('authClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockReset();
    mockSignIn.mockReset();
    mockGetSession.mockReset();
    mockSignOut.mockReset();
  });

  it('signUp should successfully register a user', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'mock-user-id', email: 'test@example.com' } }, error: null });

    const data = await signUp('test@example.com', 'password123');
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(data.user).toEqual({ id: 'mock-user-id', email: 'test@example.com' });
  });

  it('signUp should throw an error on failure', async () => {
    mockSignUp.mockResolvedValueOnce({ data: null, error: new Error('Mock signup error') });

    await expect(signUp('error@example.com', 'password123')).rejects.toThrow('Mock signup error');
  });

  it('signIn should successfully log in a user', async () => {
    mockSignIn.mockResolvedValueOnce({ data: { session: { access_token: 'mock-token', user: { id: 'mock-user-id', email: 'test@example.com' } } }, error: null });

    const data = await signIn('test@example.com', 'password123');
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(data.session?.access_token).toBe('mock-token');
  });

  it('signIn should throw an error on failure', async () => {
    mockSignIn.mockResolvedValueOnce({ data: null, error: new Error('Mock signin error') });

    await expect(signIn('error@example.com', 'password123')).rejects.toThrow('Mock signin error');
  });

  it('getSession should return a session if available', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'mock-token', user: { id: 'mock-user-id', email: 'mock@example.com' } } }, error: null });

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
