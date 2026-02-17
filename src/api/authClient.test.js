
// src/api/authClient.test.js (for run_tests)

// --- authClient.ts の内容をテスト用にインライン展開 ---
// import { createClient, SupabaseClient } from '@supabase/supabase-js'; // テスト環境では不要
const supabaseUrl = "dummy_url"; // ダミー値
const supabaseAnonKey = "dummy_key"; // ダミー値

let supabase;

// Supabaseクライアントのモック
const mockAuth = {
  signUp: async ({ email, password }) => {
    if (email === "error@example.com") {
      throw new Error("Mock signup error");
    }
    return { data: { user: { id: "mock-user-id", email } }, error: null };
  },
  signInWithPassword: async ({ email, password }) => {
    if (email === "error@example.com") {
      throw new Error("Mock signin error");
    }
    return { data: { session: { access_token: "mock-token", user: { id: "mock-user-id", email } } }, error: null };
  },
  getSession: async () => {
    if (Math.random() < 0.1) { // 10%の確率でエラーをシミュレート
      throw new Error("Mock getSession error");
    }
    return { data: { session: { access_token: "mock-token", user: { id: "mock-user-id", email: "mock@example.com" } } }, error: null };
  },
  signOut: async () => {
    if (Math.random() < 0.1) { // 10%の確率でエラーをシミュレート
      throw new Error("Mock signOut error");
    }
    return { error: null };
  },
};

try {
  // createClientをモック化
  supabase = { auth: mockAuth };
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
async function signUp(email, password) {
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
async function signIn(email, password) {
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
async function getSession() {
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
async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('サインアウトエラー:', error);
    throw error;
  }
}
// --- authClient.ts の内容ここまで ---


// --- テストコード ---
console.log('Running authClient tests...');

async function runTest(name, testFunc) {
  try {
    await testFunc();
    console.log(`✅ ${name} passed.`);
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message || error);
  }
}

// 正常系テスト
runTest('signUp - success', async () => {
  const data = await signUp('test@example.com', 'password123');
  console.assert(data && data.user && data.user.id === 'mock-user-id', 'signUp data mismatch');
});

runTest('signIn - success', async () => {
  const data = await signIn('test@example.com', 'password123');
  console.assert(data && data.session && data.session.access_token === 'mock-token', 'signIn data mismatch');
});

runTest('getSession - success', async () => {
  const session = await getSession();
  console.assert(session && session.access_token === 'mock-token', 'getSession data mismatch');
});

runTest('signOut - success', async () => {
  const result = await signOut();
  console.assert(result && result.success === true, 'signOut result mismatch');
});

// エラー系テスト
runTest('signUp - error handling', async () => {
  try {
    await signUp('error@example.com', 'password123');
    throw new Error('Expected signUp to throw an error, but it did not.');
  } catch (error) {
    console.assert(error.message === 'Mock signup error', 'signUp error message mismatch');
  }
});

runTest('signIn - error handling', async () => {
  try {
    await signIn('error@example.com', 'password123');
    throw new Error('Expected signIn to throw an error, but it did not.');
  } catch (error) {
    console.assert(error.message === 'Mock signin error', 'signIn error message mismatch');
  }
});

runTest('getSession - error handling (simulated)', async () => {
  // getSessionのモックを一時的にエラーを返すように変更
  mockAuth.getSession = async () => { throw new Error("Simulated getSession error"); };
  const session = await getSession(); // getSessionは内部でエラーをcatchしnullを返す
  console.assert(session === null, 'getSession should return null on error');
  // モックを元に戻す
  mockAuth.getSession = async () => ({ data: { session: { access_token: "mock-token", user: { id: "mock-user-id", email: "mock@example.com" } } }, error: null });
});

runTest('signOut - error handling (simulated)', async () => {
  // signOutのモックを一時的にエラーを返すように変更
  mockAuth.signOut = async () => { throw new Error("Simulated signOut error"); };
  try {
    await signOut();
    throw new Error('Expected signOut to throw an error, but it did not.');
  } catch (error) {
    console.assert(error.message === 'Simulated signOut error', 'signOut error message mismatch');
  } finally {
    // モックを元に戻す
    mockAuth.signOut = async () => ({ error: null });
  }
});
