import React, { useState, useEffect, useRef } from 'react';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

// メッセージの型定義
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'こんにちは！経営に関するお悩みがあれば、お気軽にご相談ください。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          messages: newMessages.map(msg => ({ role: msg.role, content: msg.content }))
        }),
      });

      if (!res.ok) {
        throw new Error('APIからの応答がありませんでした。しばらくしてから再度お試しください。');
      }

      const data = await res.json();
      if (!data.response) {
        throw new Error('無効なレスポンス形式です。');
      }
      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prevMessages => [...prevMessages, assistantMessage]);

    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: error instanceof Error ? error.message : '不明なエラーが発生しました。'
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white rounded-lg shadow-md">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">AIチャット</h1>
      </div>
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {messages.map((msg, index) => (
          <div key={index} className={`my-2 flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-lg whitespace-pre-wrap \${
              msg.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="my-2 flex justify-start">
            <div className="p-3 rounded-lg max-w-lg bg-gray-200 text-gray-800">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse bg-gray-400 rounded-full h-2 w-2"></div>
                <div className="animate-pulse bg-gray-400 rounded-full h-2 w-2 delay-75"></div>
                <div className="animate-pulse bg-gray-400 rounded-full h-2 w-2 delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-white">
        <div className="flex">
          <input
            type="text"
            placeholder={isLoading ? "AIが応答中です..." : "メッセージを入力..."}
            className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-r-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
