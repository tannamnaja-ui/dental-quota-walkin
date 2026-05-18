import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage      from './pages/LoginPage';
import DbSettingsPage from './pages/DbSettingsPage';
import MainApp        from './pages/MainApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<LoginPage />} />
        <Route path="/settings"   element={<DbSettingsPage />} />
        <Route path="/index.html" element={<MainApp />} />
        {/* เส้นทางอื่นๆ ทั้งหมดกลับไปที่หน้า login */}
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
