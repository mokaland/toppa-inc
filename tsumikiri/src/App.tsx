import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Chat from './pages/Chat';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading application...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/chat" replace />} />
        <Route path="/chat" element={session ? <Chat /> : <Navigate to="/auth" replace />} />
        <Route path="*" element={<Navigate to={session ? "/chat" : "/auth"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
