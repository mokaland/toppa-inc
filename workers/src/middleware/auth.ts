import { MiddlewareHandler } from 'hono';
import { getSupabaseClient } from '../lib/supabase';

// Honoのコンテキストにuserプロパティを追加するための型定義
declare module 'hono' {
  interface ContextVariableMap {
    user: any; // SupabaseのUser型をインポートするのが望ましいが、シンプルにするためanyを使用
  }
}

/**
 * ユーザー認証を行うHonoミドルウェア
 * AuthorizationヘッダーのJWTを検証し、成功すればc.set('user', user)でユーザー情報を格納する
 */
export const authMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header is missing or invalid.' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const supabase = getSupabaseClient(c);

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return c.json({ error: 'Invalid token or user not found.', details: error?.message }, 401);
    }

    c.set('user', data.user);
    await next();
  };
};
