import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Context } from 'hono';

// 環境変数の型定義をインポートまたは定義
type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

let supabase: SupabaseClient;

/**
 * Supabaseクライアントのシングルトンインスタンスを取得または作成する
 * @param c Honoのコンテキスト
 * @returns SupabaseClientのインスタンス
 */
export const getSupabaseClient = (c: Context<{ Bindings: Bindings }>): SupabaseClient => {
  if (supabase) {
    return supabase;
  }

  const url = c.env.SUPABASE_URL;
  const key = c.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL or Key is not defined in environment variables.');
  }

  supabase = createClient(url, key, {
    auth: {
      persistSession: false, // Cloudflare Workersではセッションの永続化は不要
      autoRefreshToken: false,
      detectSessionInUrl: false,
    }
  });

  return supabase;
};
