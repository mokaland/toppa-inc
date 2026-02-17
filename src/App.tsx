// 作成者: CTO マルコ・ロッシ
// 日付: 2026-02-17
// ステータス: 提案

import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

const Home = () => <div><h1>Home Page</h1><Link to="/about">Go to About</Link></div>;
const About = () => <div><h1>About Page</h1><Link to="/">Go to Home</Link></div>;
const NotFound = () => <div><h1>404 Not Found</h1></div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
