// workers/utils/auth.ts
import { createClient } from '@supabase/supabase-js';
import { Context } from 'hono';

// 環境変数からSupabaseのURLとAnonキーを取得
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Supabaseクライアントを初期化
export const getSupabaseClient = (token?: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is not defined in environment variables.');
  }

  // 認証トークンがある場合は、そのトークンでクライアントを作成
  if (token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false, // Workersではセッションを永続化しない
      },
    });
  }

  // 認証トークンがない場合は、匿名クライアントを作成
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
};

// HonoのContextから認証済みユーザーを取得するヘルパー関数
export const getAuthenticatedUser = async (c: Context) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const supabase = getSupabaseClient(token);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return user;
};