// src/main.tsx
/**
 * @author マルコ・ロッシ
 * @date 2026-02-17
 * @status 作成済
 * @description Reactアプリケーションのエントリーポイント。
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App'; // App.tsxをインポート
import './index.css'; // Tailwind CSSの読み込みを想定

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
