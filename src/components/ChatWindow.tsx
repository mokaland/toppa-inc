import { useState, useEffect, useRef } from 'react';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ChatWindow = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'こんにちは！ツミキリです。経営や事務作業のお手伝いをします。何でも聞いてください。' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { id: String(Date.now()), role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (data.response) {
        setMessages(prev => [...prev, {
          id: String(Date.now()),
          role: 'assistant',
          content: data.response,
        }]);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: String(Date.now()),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2 rounded-2xl whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-2xl animate-pulse">考え中...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t p-3 flex gap-2">
        <input
          type="text"
          className="flex-grow border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="メッセージを入力..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-5 rounded-full disabled:opacity-50 transition-colors"
          onClick={send}
          disabled={loading || !input.trim()}
        >
          送信
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
