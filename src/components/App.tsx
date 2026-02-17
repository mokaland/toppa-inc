// src/components/App.tsx
/**
 * @author マルコ・ロッシ
 * @date 2026-02-17
 * @status 作成済
 * @description アプリケーションのルートコンポーネント。
 */
import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-blue-600">
        TOPPA Inc. Tsumikiri App
      </h1>
    </div>
  );
};

export default App;
