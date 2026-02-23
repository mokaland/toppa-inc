import React, { useState } from 'react';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

// メッセージの型定義
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// シンプルなスピナーアイコン
const SpinnerIcon = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'こんにちは！経営に関するお悩みがあれば、お気軽にご相談ください。', timestamp: new Date().toLocaleTimeString() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input, timestamp: new Date().toLocaleTimeString() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          messages: newMessages
        }),
      });

      if (!res.ok) {
        throw new Error(`APIエラー: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      if (data.response) {
        setMessages([...newMessages, { role: 'assistant', content: data.response, timestamp: new Date().toLocaleTimeString() }]);
      } else {
        throw new Error('APIからのレスポンスにコンテンツが含まれていません。');
      }
    } catch (e: unknown) {
      setError((e instanceof Error) ? e.message : 'メッセージの送信中に不明なエラーが発生しました。');
      setMessages(messages); // Restore previous messages on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4">
      {/* メッセージ表示エリア */}
      <div className="flex-grow overflow-y-auto mb-4 p-4 bg-white rounded-lg shadow-inner">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center font-bold text-white text-sm mr-3">
                AI
              </div>
            )}
            <div className={`max-w-[70%] p-3 rounded-lg shadow-md break-words ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
              <div className="text-xs text-gray-400 mb-1">{msg.timestamp}</div>
              <p>{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-white text-sm ml-3">
                You
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start mb-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center font-bold text-white text-sm mr-3">
                AI
            </div>
            <div className="max-w-[70%] p-3 rounded-lg bg-gray-200 text-gray-800 shadow-md">
              <SpinnerIcon />
            </div>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          <p><strong>エラー:</strong> {error}</p>
        </div>
      )}

      {/* 入力フォーム */}
      <div className="flex-shrink-0 flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="メッセージを入力..."
          className="flex-grow p-3 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white p-3 rounded-r-lg hover:bg-blue-600 disabled:bg-blue-300"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? <SpinnerIcon /> : '送信'}
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
