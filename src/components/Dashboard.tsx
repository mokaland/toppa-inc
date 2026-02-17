import React from 'react';
import { useUserStore } from '../stores/userStore';

const Dashboard: React.FC = () => {
  const { username, isLoggedIn } = useUserStore();

  if (!isLoggedIn) {
    return <p>Please log in.</p>;
  }

  return (
    <div>
      <h1>Welcome, {username}!</h1>
      <p>This is your dashboard.</p>
    </div>
  );
};

export default Dashboard;
