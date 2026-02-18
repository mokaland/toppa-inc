import React from 'react';
import { useUserStore } from '../stores/userStore';
import CsvUpload from './CsvUpload';

const Dashboard: React.FC = () => {
  const { username, isLoggedIn } = useUserStore();

  if (!isLoggedIn) {
    return <p>Please log in.</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Welcome, {username}!</h1>
      <p className="text-lg mb-6">This is your dashboard.</p>
      <CsvUpload />
    </div>
  );
};

export default Dashboard;
