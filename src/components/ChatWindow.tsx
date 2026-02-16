import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'こんにちは！何かお手伝いできることはありますか？' },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      const newUserMessage: ChatMessage = {
        id: String(messages.length + 1),
        role: 'user',
        content: inputMessage,
      };
      setMessages((prevMessages) => [...prevMessages, newUserMessage]);
      setInputMessage('');

      // モックAPI呼び出し (非同期処理をシミュレート)
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機

      const assistantResponse: ChatMessage = {
        id: String(messages.length + 2),
        role: 'assistant',
        content: `「${inputMessage}」についてですね。少々お待ちください。`, // モック応答
      };
      setMessages((prevMessages) => [...prevMessages, assistantResponse]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg p-4">
      <div className="flex-grow overflow-y-auto mb-4 space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`${
                message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              } p-3 rounded-lg max-w-xs`}
            >
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex">
        <input
          type="text"
          className="flex-grow border border-gray-300 rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="メッセージを入力..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
        />
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-r-lg"
          onClick={handleSendMessage}
        >
          送信
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
