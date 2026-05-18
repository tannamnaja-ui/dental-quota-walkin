import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, configAPI } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [booting,  setBooting]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    (async () => {
      // ถ้า login ไว้แล้ว → ไปหน้าหลักทันที
      if (localStorage.getItem('dental_user')) {
        navigate('/index.html', { replace: true });
        return;
      }
      // ถ้ายังไม่ตั้งค่า DB → ไปหน้า settings
      try {
        const res = await configAPI.get();
        if (!res.data.configured) {
          navigate('/settings', { replace: true });
          return;
        }
      } catch {
        navigate('/settings', { replace: true });
        return;
      }
      setBooting(false);
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('กรุณากรอก username และ password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login({ username: username.trim(), password });
      localStorage.setItem('dental_user', JSON.stringify(res.data.data));
      navigate('/index.html', { replace: true });
    } catch (err) {
      const code    = err.response?.data?.code;
      const message = err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
      setError(message);
      if (code === 'NO_DB_CONFIG') {
        setTimeout(() => navigate('/settings'), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, #e9d8fd 0%, #d6bcfa 40%, #c4b5fd 100%)' }}>
        <div className="flex flex-col items-center gap-3">
          <span style={{ fontSize: '3rem' }}>🦷</span>
          <p className="text-sm animate-pulse" style={{ color: '#6d28d9' }}>กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg, #e9d8fd 0%, #d6bcfa 40%, #c4b5fd 100%)' }}>

      {/* วงกลมประดับพื้นหลัง */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-30"
             style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #ddd6fe, transparent)' }} />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-4 shadow-xl"
               style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 32px rgba(124,58,237,0.25)' }}>
            <span style={{ fontSize: '2.8rem' }}>🦷</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#4c1d95' }}>
            ระบบโควตา Walk-in
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7c3aed' }}>แผนกทันตกรรม</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8"
             style={{
               background: 'rgba(255,255,255,0.75)',
               backdropFilter: 'blur(20px)',
               boxShadow: '0 20px 60px rgba(124,58,237,0.2), 0 4px 16px rgba(124,58,237,0.1)',
               border: '1px solid rgba(255,255,255,0.9)',
             }}>

          <h2 className="font-bold mb-6" style={{ color: '#4c1d95', fontSize: '1.1rem' }}>
            เข้าสู่ระบบ
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#6d28d9' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="กรอก username"
                autoFocus
                autoComplete="username"
                className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                style={{ background: 'rgba(237,233,254,0.6)', border: '1.5px solid #ddd6fe', color: '#3b0764' }}
                onFocus={e => { e.target.style.border = '1.5px solid #7c3aed'; e.target.style.background = 'rgba(237,233,254,0.9)'; }}
                onBlur={e  => { e.target.style.border = '1.5px solid #ddd6fe'; e.target.style.background = 'rgba(237,233,254,0.6)'; }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#6d28d9' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="กรอก password"
                autoComplete="current-password"
                className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                style={{ background: 'rgba(237,233,254,0.6)', border: '1.5px solid #ddd6fe', color: '#3b0764' }}
                onFocus={e => { e.target.style.border = '1.5px solid #7c3aed'; e.target.style.background = 'rgba(237,233,254,0.9)'; }}
                onBlur={e  => { e.target.style.border = '1.5px solid #ddd6fe'; e.target.style.background = 'rgba(237,233,254,0.6)'; }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl px-4 py-3"
                   style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <span className="shrink-0 mt-0.5" style={{ color: '#ef4444' }}>✕</span>
                <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all mt-2"
              style={loading ? {
                background: '#c4b5fd', cursor: 'not-allowed', boxShadow: 'none',
              } : {
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: '0 6px 20px rgba(109,40,217,0.4)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, #6d28d9, #5b21b6)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed, #6d28d9)'; }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  กำลังตรวจสอบ...
                </span>
              ) : 'เข้าสู่ระบบ'}
            </button>

          </form>
        </div>

        {/* Settings button */}
        <div className="text-center mt-5">
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(139,92,246,0.35)',
              color: '#5b21b6',
              boxShadow: '0 2px 10px rgba(109,40,217,0.12)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(109,40,217,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(109,40,217,0.12)';
            }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            ตั้งค่าการเชื่อมต่อฐานข้อมูล
          </button>
        </div>

      </div>
    </div>
  );
}
