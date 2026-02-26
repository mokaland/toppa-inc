import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const fetchMessages = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error.message);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    };

    if (user) {
      fetchMessages();
    }
  }, [user]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() === '' || !user) return;

    const newMessage: Message = {
      id: Math.random().toString(), // 仮ID
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({ user_id: user.id, role: 'user', content: input });

    if (insertError) {
      console.error('Error inserting user message:', insertError.message);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: Math.random().toString(), // 仮ID
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const { error: assistantInsertError } = await supabase
        .from('chat_messages')
        .insert({ user_id: user.id, role: 'assistant', content: data.response });

      if (assistantInsertError) {
        console.error('Error inserting assistant message:', assistantInsertError.message);
      }

    } catch (error) {
      console.error('Error sending message to API:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  if (!user) {
    return <div className="flex justify-center items-center h-screen">Loading user...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">ツミキリ Chat</h1>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
          サインアウト
        </button>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs p-3 rounded-lg shadow-md ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </main>
      <form onSubmit={sendMessage} className="p-4 bg-white shadow-lg flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          className="ml-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
          disabled={loading || input.trim() === ''}
        >
          送信
        </button>
      </form>
    </div>
  );
};

export default Chat;
