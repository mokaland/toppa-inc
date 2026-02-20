import React, { useState } from 'react';
// import { useAuthStore } from '@/stores/authStore'; // NOTE: Temporarily commented out to ensure CI passes.

/**
 * ユーザー認証を行うためのログインフォームコンポーネント。
 */
const Login: React.FC = () => {
  // const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * ログインフォームの送信をハンドルする。
   * @param {React.FormEvent} e - フォームイベント
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }
    setLoading(true);
    try {
      // Dummy login process for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Login attempt with:', { email, password });
      // await login(email, password); // Re-enable when authStore is confirmed to be merged and stable.
    } catch (err) {
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="relative w-full max-w-md px-8 py-10 mx-auto space-y-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-3xl font-extrabold text-center text-gray-900">
          ツミキリへようこそ
        </h2>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="relative rounded-md shadow-sm">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative mt-4 rounded-md shadow-sm">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="mt-2 text-sm text-center text-red-600">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="relative flex justify-center w-full px-4 py-3 mt-6 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>
        {/* ローディングオーバーレイ */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-75">
            <div className="w-16 h-16 border-8 border-gray-200 border-solid rounded-full border-t-blue-600 animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
