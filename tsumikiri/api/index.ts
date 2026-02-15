import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { supabase } from '../src/lib/supabase'; // assuming relative path

const app = new Hono();

app.use(cors());

app.get('/', (c) => {
  return c.json({ message: 'Hello Hono!' });
});

// Example of using Supabase client in a worker
app.get('/test-supabase', async (c) => {
  const { data, error } = await supabase.from('chat_messages').select('*').limit(1);
  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json({ data });
});

export default app;