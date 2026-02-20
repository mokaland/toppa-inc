
import { useEffect, useState } from 'react';
import ChatWindow from './components/ChatWindow';
import CsvUpload from './components/CsvUpload';
import DocumentGenerator from './components/DocumentGenerator';
import Login from './components/Login';
import { useAuthStore } from './stores/authStore';

type Tab = 'chat' | 'csv' | 'docs';

function App() {
  const { user, checkUser, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  // 未認証の場合はログイン画面を表示
  if (!user) {
    return <Login />;
  }

  // 認証済みの場合はメインのダッシュボードを表示
  const tabs: { key: Tab; label: string }[] = [
    { key: 'chat', label: 'AIチャット' },
    { key: 'csv', label: 'レポート生成' },
    { key: 'docs', label: '書類作成' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatWindow />;
      case 'csv':
        return <CsvUpload />;
      case 'docs':
        return <DocumentGenerator />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-indigo-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ツミキリ</h1>
            <p className="text-indigo-200 text-sm">中小企業の"詰み"をAIで突破する</p>
          </div>
          <button
            onClick={logout}
            className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* タブナビゲーション */}
      <nav className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main>
        <div className="max-w-5xl mx-auto py-6 px-4">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
