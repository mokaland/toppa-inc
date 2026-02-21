import { useState, useEffect, useRef } from 'react';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

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
        const errorData = await response.json().catch(() => ({ message: 'サーバーから有効なエラーレスポンスがありませんでした。' }));
        throw new Error(errorData.message || `HTTPエラー: ${response.status}`);
      }

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.response, timestamp: new Date().toISOString() }]);
    } catch (err: any) {
      setError(err.message || '不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-gray-50 rounded-lg shadow-inner">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg px-4 py-2 break-words mb-2 ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white rounded-t-xl rounded-bl-xl'
                : 'bg-gray-200 text-gray-800 rounded-t-xl rounded-br-xl'
            }`}>
              {msg.content.split('\\n').map((line, i) => <p key={i}>{line}</p>)}
              <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-lg px-4 py-2 rounded-xl bg-gray-200 text-gray-800">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        {error && (
           <div className="flex justify-center">
             <div className="max-w-lg w-full px-4 py-3 rounded-xl bg-red-100 text-red-700">
               <strong>エラー:</strong> {error}
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t">
        <div className="flex items-center space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="メッセージを入力... (Shift+Enterで改行)"
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed self-end"
            disabled={isLoading}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
