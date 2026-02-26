
import { createMiddleware } from 'hono/factory';
import { SupabaseClient, User } from '@supabase/supabase-js';

// 環境変数の型定義
type Env = {
  Variables: {
    supabase: SupabaseClient;
    user: User | null; // SupabaseのUser型をインポートできないためanyで代用
  }
}

/**
 * ユーザー認証を行い、コンテキストにユーザー情報をセットするミドルウェア
 *
 * 事前に supabaseMiddleware が適用されている必要がある。
 * ヘッダーに 'Authorization: Bearer <SUPABASE_JWT>' が必要。
 */
export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or malformed token' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const supabase = c.get('supabase');

  if (!supabase) {
    // このエラーは通常、supabaseMiddlewareが先に適用されていれば発生しない
    console.error('Internal Server Error: Supabase client not found in context. Ensure supabaseMiddleware is applied before authMiddleware.');
    return c.json({ error: 'Internal Server Error: Supabase client not found' }, 500);
  }

  // Supabaseにトークンを渡し、ユーザー情報を検証する
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }

  // 検証成功後、ユーザー情報をコンテキストにセットして次の処理へ
  c.set('user', data.user);
  await next();
});
