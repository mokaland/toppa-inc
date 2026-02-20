import React from 'react';

// propsの型を定義
interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  // 本来はここにフォームとログインロジックが入る
  // ビルドを通すために、クリックでログイン成功をシミュレートするボタンを置く
  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">ログイン</h2>
        <p className="text-center text-gray-600">現在、認証機能は開発中です。</p>
        <button
          onClick={onLoginSuccess} // propsで受け取った関数を呼び出す
          className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          ダッシュボードへ進む (開発用)
        </button>
      </div>
    </div>
  );
};

export default Login;
