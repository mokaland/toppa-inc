import { Hono } from 'hono';
import { getSupabaseClient } from '../utils/supabase';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/auth/user', async (c) => {
  const supabase = getSupabaseClient(c.env);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ user });
});

export default app;