import { vi } from 'vitest';

// Mock Vite environment variables for client-side tests
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:8000');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');
vi.stubEnv('VITE_API_URL', 'http://localhost:8787/api');
