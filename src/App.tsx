
import { useState } from 'react';
import ChatWindow from './components/ChatWindow';
import CsvUpload from './components/CsvUpload';
import DocumentGenerator from './components/DocumentGenerator';

type Tab = 'chat' | 'csv' | 'docs';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

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
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">ツミキリ</h1>
            <p className="text-gray-500 text-sm">中小企業の"詰み"をAIで突破する</p>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="max-w-5xl mx-auto px-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
