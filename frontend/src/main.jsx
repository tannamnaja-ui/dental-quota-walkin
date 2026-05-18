import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ใช้ขนาดตัวอักษรที่บันทึกไว้ทันทีก่อน render
const savedSize = localStorage.getItem('dental_font_size');
if (savedSize) document.documentElement.style.fontSize = savedSize;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
