import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QuotaManagement from '../components/QuotaManagement';
import QueueList       from '../components/QueueList';
import DailyQuota      from '../components/DailyQuota';

const TABS = [
  { id: 'queue',      label: 'โควต้าวันนี้'  },
  { id: 'dailyquota', label: 'โควตาแต่ละวัน' },
  { id: 'quota',      label: 'ตั้งค่าโควตา'  },
];

const MIN_SIZE = 80;
const MAX_SIZE = 200;
const DEFAULT_SIZE = 150;

function getFontSizePct() {
  const saved = localStorage.getItem('dental_font_size');
  if (saved) return parseInt(saved);
  return DEFAULT_SIZE;
}

export default function MainApp() {
  const navigate   = useNavigate();
  const [activeTab,   setActiveTab]   = useState('queue');
  const [user,        setUser]        = useState(null);
  const [showFont,    setShowFont]    = useState(false);
  const [fontSize,    setFontSize]    = useState(getFontSizePct);
  const fontPanelRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('dental_user');
    if (!stored) { navigate('/', { replace: true }); return; }
    setUser(JSON.parse(stored));
  }, []);

  /* ปิด panel เมื่อคลิกนอก */
  useEffect(() => {
    if (!showFont) return;
    const handler = (e) => {
      if (fontPanelRef.current && !fontPanelRef.current.contains(e.target)) {
        setShowFont(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFont]);

  /* apply font size ทุกครั้งที่ค่าเปลี่ยน */
  useEffect(() => {
    const val = `${fontSize}%`;
    document.documentElement.style.fontSize = val;
    localStorage.setItem('dental_font_size', val);
  }, [fontSize]);

  const handleLogout = () => {
    localStorage.removeItem('dental_user');
    navigate('/', { replace: true });
  };

  const resetFont = () => setFontSize(DEFAULT_SIZE);

  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: '#f5f0ff' }}>

      {/* Header */}
      <header className="text-white shadow-md" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight">ระบบโควตา Walk-in — แผนกทันตกรรม</h1>
            <p className="text-xs mt-0.5" style={{ color: '#ddd6fe' }}>{today}</p>
          </div>

          <div className="flex items-center gap-2">
            {user.name && (
              <span className="hidden sm:block text-sm" style={{ color: '#ede9fe' }}>{user.name}</span>
            )}

            {/* ── ปุ่มขนาดตัวอักษร ── */}
            <div className="relative" ref={fontPanelRef}>
              <button
                type="button"
                onClick={() => setShowFont(v => !v)}
                title="ตั้งค่าขนาดตัวอักษร"
                className="flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  background: showFont ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
                  borderColor: 'rgba(255,255,255,0.3)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = showFont ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>Aa</span>
                <span style={{ opacity: 0.8 }}>{fontSize}%</span>
              </button>

              {/* dropdown panel */}
              {showFont && (
                <div className="absolute right-0 top-full mt-2 z-50 rounded-2xl shadow-2xl p-5"
                     style={{
                       background: 'white',
                       border: '1px solid #ede9fe',
                       width: '17rem',
                       boxShadow: '0 8px 32px rgba(109,40,217,0.18)',
                     }}>

                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold" style={{ color: '#5b21b6' }}>ขนาดตัวอักษร</p>
                    <button type="button" onClick={resetFont}
                            className="text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                            style={{ background: '#f5f0ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                      รีเซ็ต ({DEFAULT_SIZE}%)
                    </button>
                  </div>

                  {/* preview */}
                  <div className="mb-4 px-3 py-2.5 rounded-xl text-center"
                       style={{ background: '#f5f0ff', border: '1px solid #ede9fe' }}>
                    <span style={{ fontSize: '1rem', color: '#5b21b6', fontWeight: 600 }}>ตัวอย่างข้อความ Aa Bb</span>
                  </div>

                  {/* slider */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-2" style={{ color: '#9ca3af' }}>
                      <span>เล็ก ({MIN_SIZE}%)</span>
                      <span className="font-bold" style={{ color: '#7c3aed' }}>{fontSize}%</span>
                      <span>ใหญ่ ({MAX_SIZE}%)</span>
                    </div>
                    <input
                      type="range"
                      min={MIN_SIZE}
                      max={MAX_SIZE}
                      step={5}
                      value={fontSize}
                      onChange={e => setFontSize(Number(e.target.value))}
                      className="w-full cursor-pointer"
                      style={{ accentColor: '#7c3aed' }}
                    />
                  </div>

                  {/* quick buttons */}
                  <div className="flex gap-2">
                    {[80, 100, 120, 150, 175, 200].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFontSize(v)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                        style={fontSize === v ? {
                          background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                          color: 'white',
                        } : {
                          background: '#f5f0ff',
                          color: '#6d28d9',
                          border: '1px solid #ddd6fe',
                        }}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ปุ่ม logout */}
            <button
              onClick={handleLogout}
              className="text-xs border px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b shadow-sm" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-6xl mx-auto px-4 flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-purple-600 hover:border-purple-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="py-6">
        {activeTab === 'queue'      && <QueueList />}
        {activeTab === 'dailyquota' && <DailyQuota />}
        {activeTab === 'quota'      && <QuotaManagement />}
      </main>

    </div>
  );
}
