
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createMiddleware } from 'hono/factory';

// 環境変数の型定義
type Env = {
  Bindings: {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
  },
  Variables: {
    supabase: SupabaseClient;
  }
}

// Supabaseクライアントを初期化してコンテキストにセットするミドルウェア
export const supabaseMiddleware = createMiddleware<Env>(async (c, next) => {
  if (c.get('supabase')) {
    // 既にクライアントがセットされていれば何もしない
    await next();
    return;
  }

  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_ANON_KEY,
    {
      auth: {
        // Cloudflare Workersのようなエッジ環境では、デフォルトのストレージ(localStorage)が使えないため無効化する
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  c.set('supabase', supabase);
  await next();
});
