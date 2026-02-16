import React, { useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'こんにちは！何かお手伝いできることはありますか？' },
    { id: '2', role: 'user', content: 'はい、〇〇について教えてください。' },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage: ChatMessage = {
        id: String(messages.length + 1),
        role: 'user',
        content: inputMessage,
      };
      setMessages([...messages, newMessage]);
      setInputMessage('');
      // ここでAPI呼び出しなどのロジックを追加
      // 例: sendToApi(inputMessage).then(response => setMessages(prev => [...prev, response]));
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
      </div>
      <div className="flex items-center">
        <input
          type="text"
          placeholder="メッセージを入力..."
          className="flex-grow border border-gray-300 rounded-lg p-2 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={handleSendMessage}
        >
          送信
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
