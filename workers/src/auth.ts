
// workers/src/auth.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 環境変数からSupabaseの設定をロードするヘルパー関数（Cloudflare Workers向け）
export function getSupabaseClient(env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }): SupabaseClient {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        throw new Error('Supabase URL and Anon Key are required environment variables.');
    }
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

/**
 * ユーザー登録処理
 * @param {SupabaseClient} supabase - Supabaseクライアントインスタンス
 * @param {string} email - ユーザーのメールアドレス
 * @param {string} password - ユーザーのパスワード
 * @returns {Promise<{ user: any | null, error: any | null }>}
 */
export async function signUpUser(supabase: SupabaseClient, email: string, password: string): Promise<{ user: any | null, error: any | null }> {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Error signing up user:', error.message);
        return { user: null, error: error };
    }

    return { user: data.user, error: null };
}

/**
 * ユーザーログイン処理
 * @param {SupabaseClient} supabase - Supabaseクライアントインスタンス
 * @param {string} email - ユーザーのメールアドレス
 * @param {string} password - ユーザーのパスワード
 * @returns {Promise<{ user: any | null, error: any | null }>}
 */
export async function signInUser(supabase: SupabaseClient, email: string, password: string): Promise<{ user: any | null, error: any | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Error signing in user:', error.message);
        return { user: null, error: error };
    }

    return { user: data.user, error: null };
}

/**
 * ユーザーログアウト処理
 * @param {SupabaseClient} supabase - Supabaseクライアントインスタンス
 * @returns {Promise<{ error: any | null }>}
 */
export async function signOutUser(supabase: SupabaseClient): Promise<{ error: any | null }> {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Error signing out user:', error.message);
        return { error: error };
    }

    return { error: null };
}

// 他の認証関連ヘルパー関数もここに追加する
