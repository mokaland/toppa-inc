import React from 'react';

const ChatWindow = () => {
  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">Chat</h1>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <p>Chat messages will appear here.</p>
      </div>
      <div className="p-4 border-t">
        <input type="text" placeholder="Type a message..." className="w-full p-2 border rounded" />
      </div>
    </div>
  );
};

export default ChatWindow;
