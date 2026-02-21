import { useState, useEffect, useRef } from 'react';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// スピナーアイコンのSVGコンポーネント
const LoadingSpinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'こんにちは！ツミキリです。経営や事務作業のお手伝いをします。何でも聞いてください。', timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) {
      return;
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: input, timestamp: new Date().toISOString() }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          messages: newMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
      }

      const data = await response.json();
      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: data.response, timestamp: new Date().toISOString() }]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました。';
      setError('メッセージの送信に失敗しました。時間をおいて再度お試しください。');
      // ユーザーが入力したメッセージを復元
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-50 rounded-lg shadow-inner">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl lg:max-w-2xl px-4 py-2 rounded-2xl ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
         {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-lg px-4 py-3 rounded-lg bg-white text-gray-800 shadow-sm flex items-center">
                <div className="animate-pulse flex space-x-2">
                    <div className="rounded-full bg-gray-300 h-2 w-2"></div>
                    <div className="rounded-full bg-gray-300 h-2 w-2"></div>
                    <div className="rounded-full bg-gray-300 h-2 w-2"></div>
                </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="p-2 text-center text-red-500 bg-red-100 border-t border-red-200">
          <p>{error}</p>
        </div>
      )}

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力... (Shift+Enterで改行)"
            className="w-full p-3 pr-28 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || input.trim() === ''}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200`}
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                <span>送信中...</span>
              </>
            ) : (
              '送信'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
