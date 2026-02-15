import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 認証状態の監視
supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session);
  // 必要に応じて認証状態の変化に応じた処理を記述
});
