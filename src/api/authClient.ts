
// src/api/authClient.ts


const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.error('Supabaseクライアントの初期化に失敗しました:', error);
  throw new Error('Supabaseクライアントの初期化に失敗しました。環境変数を確認してください。');
}

/**
 * ユーザーを登録します。
 * @param email - ユーザーのメールアドレス
 * @param password - ユーザーのパスワード
 * @returns ユーザーセッションまたはエラー
 */
import { createClient, SupabaseClient, AuthResponse, Session } from '@supabase/supabase-js';

// ... (rest of the file)

export async function signUp(email: string, password: string): Promise<AuthResponse['data']> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('サインアップエラー:', error);
    throw error;
  }
}

/**
 * ユーザーをログインさせます。
 * @param email - ユーザーのメールアドレス
 * @param password - ユーザーのパスワード
 * @returns ユーザーセッションまたはエラー
 */
export async function signIn(email: string, password: string): Promise<AuthResponse['data']> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('サインインエラー:', error);
    throw error;
  }
}

/**
 * 現在のユーザーセッションを取得します。
 * @returns ユーザーセッションまたはnull
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('セッション取得エラー:', error);
    return null;
  }
}

/**
 * ユーザーをログアウトさせます。
 * @returns 成功またはエラー
 */
export async function signOut(): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('サインアウトエラー:', error);
    throw error;
  }
}

export default supabase;
