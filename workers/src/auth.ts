import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { createClient } from '@supabase/supabase-js';

const auth = new Hono();

auth.post('/signup', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string }>(c);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { email, password } = await c.req.json();

  // Supabaseでのユーザー登録処理（スタブ）
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ message: 'ユーザー登録リクエストを送信しました。メールを確認してください。', user: data.user });
});

auth.post('/login', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string }>(c);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { email, password } = await c.req.json();

  // Supabaseでのログイン処理（スタブ）
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return c.json({ error: error.message }, 401);
  }

  return c.json({ message: 'ログイン成功', user: data.user, session: data.session });
});

export default auth;