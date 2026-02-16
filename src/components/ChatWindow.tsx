import React from 'react';

const ChatWindow: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg p-4">
      <div className="flex-grow overflow-y-auto mb-4">
        {/* Chat messages will go here */}
        <div className="flex justify-start mb-2">
          <div className="bg-gray-200 p-3 rounded-lg max-w-xs">
            <p className="text-sm">こんにちは！何かお手伝いできることはありますか？</p>
          </div>
        </div>
        <div className="flex justify-end mb-2">
          <div className="bg-blue-500 text-white p-3 rounded-lg max-w-xs">
            <p className="text-sm">はい、〇〇について教えてください。</p>
          </div>
        </div>
      </div>
      <div className="flex items-center">
        <input
          type="text"
          placeholder="メッセージを入力..."
          className="flex-grow border border-gray-300 rounded-lg p-2 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          送信
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
