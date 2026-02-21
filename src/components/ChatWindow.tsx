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

    const userMessage: Message = { role: 'user', content: input, timestamp: new Date().toISOString() };
    const newMessages: Message[] = [...messages, userMessage];
    
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
          messages: newMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        throw new Error(`APIエラー: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      
      if (data.response) {
        const assistantMessage: Message = { role: 'assistant', content: data.response, timestamp: new Date().toISOString() };
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
      } else {
        throw new Error('APIからのレスポンス形式が正しくありません。');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました。';
      setError(errorMessage);
      const errorBotMessage: Message = { role: 'assistant', content: `申し訳ありません、エラーが発生しました。時間を置いて再度お試しください。(詳細: ${errorMessage})`, timestamp: new Date().toISOString() };
      setMessages(prevMessages => [...prevMessages, errorBotMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-50">
      {/* Messages display area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                AI
              </div>
            )}

            <div className={`max-w-xl p-3 rounded-lg shadow-md ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
              <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              <div className={`text-xs text-right mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                You
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              AI
            </div>
            <div className="max-w-xl p-3 rounded-lg shadow-md bg-white text-gray-800">
              <div className="flex items-center">
                <div className="dot-flashing"></div>
              </div>
            </div>
          </div>
        )}

        {error && (
           <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
            <span className="font-medium">エラー:</span> {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="relative">
          <textarea
            className="w-full p-2 pr-20 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
            rows={2}
            placeholder="メッセージを入力..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || input.trim() === ''}
            className={`absolute right-2.5 bottom-2.5 bg-blue-500 text-white font-bold py-2 px-4 rounded-lg flex items-center
                        ${isLoading ? 'bg-blue-300 cursor-not-allowed' : 'hover:bg-blue-600'}
                        ${input.trim() === '' ? 'bg-gray-300 cursor-not-allowed' : ''}
                        transition-colors duration-200`}
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                <span>送信中</span>
              </>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
