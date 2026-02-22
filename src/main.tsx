import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function MinimalApp() {
  return (
    <div>
      <h1>Hello from Minimal App!</h1>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MinimalApp />
  </React.StrictMode>,
);
