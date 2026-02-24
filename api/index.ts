import { Hono } from 'hono';
import { cors } from 'hono/cors';
import report from '../src/handlers/report';
import csvUpload from '../src/handlers/csvUpload';

interface Env {
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.route('/api/reports', report);
app.route('/api/csv', csvUpload);

export default app;
