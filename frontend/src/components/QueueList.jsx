import React, { useState, useEffect, useCallback, useRef } from 'react';
import { quotaAPI } from '../services/api';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function QueueList() {
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [quotas,       setQuotas]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [countdown,    setCountdown]    = useState(30);
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [usingId,      setUsingId]      = useState(null); // quota_id ที่กำลัง submit

  const isToday      = selectedDate === todayStr();
  const countdownRef = useRef(null);

  /* ── ใช้โควตา 1 ── */
  const handleUseQuota = async (quotaId) => {
    setUsingId(quotaId);
    try {
      await quotaAPI.use(quotaId);
      // อัปเดต local state ทันทีโดยไม่รอ refetch
      setQuotas(prev => prev.map(q =>
        q.quota_id === quotaId
          ? { ...q, current_walkin_count: q.current_walkin_count + 1 }
          : q
      ));
    } catch { /* quota full หรือ error — refetch เพื่อ sync */ fetchData(true); }
    finally   { setUsingId(null); }
  };

  /* ── fetch ── */
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const quotaRes = await quotaAPI.get(selectedDate);
      setQuotas((quotaRes.data.data || []).filter(q => q.quota_id));
      setLastRefresh(new Date());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  /* โหลดทันทีเมื่อ selectedDate เปลี่ยน */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* auto-refresh ทุก 30 วินาที เฉพาะวันปัจจุบัน */
  useEffect(() => {
    if (!isToday) { setCountdown(30); return; }

    setCountdown(30);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchData(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [isToday, fetchData]);



  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">

      {/* ── Header ── */}
      <div className="rounded-2xl p-5 shadow-sm"
           style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid #ede9fe' }}>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#5b21b6' }}>
              โควต้าวันนี้
            </h2>
            {lastRefresh && (
              <p className="text-xs mt-0.5" style={{ color: '#a78bfa' }}>
                อัปเดต {lastRefresh.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                {isToday && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{ background: '#ede9fe', color: '#7c3aed' }}>
                    🔄 {countdown}s
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm font-semibold shrink-0" style={{ color: '#6d28d9' }}>วันที่:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              style={{ borderColor: '#ddd6fe', background: '#faf5ff', color: '#3b0764' }}
            />
            <button type="button" onClick={() => setSelectedDate(todayStr())}
                    className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    style={isToday ? {
                      background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: 'white',
                    } : {
                      background: '#f5f0ff', color: '#6d28d9', border: '1.5px solid #ddd6fe',
                    }}>
              วันนี้
            </button>
            <button type="button" onClick={() => fetchData()}
                    className="px-3 py-2 rounded-xl text-xs cursor-pointer border"
                    style={{ borderColor: '#ddd6fe', color: '#7c3aed', background: '#faf5ff' }}>
              ↻ รีเฟรช
            </button>
          </div>
        </div>
      </div>

      {/* ── Dashboard แพทย์ ── */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm animate-pulse">กำลังโหลดข้อมูล...</div>
      ) : quotas.length === 0 ? (
        <div className="text-center py-16 rounded-2xl"
             style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid #ede9fe', color: '#a78bfa' }}>
          <div style={{ fontSize: '2.5rem' }}>📋</div>
          <p className="mt-3 text-sm">ยังไม่มีการตั้งค่าโควตาสำหรับวันที่นี้</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: '#7c3aed' }}>
            โควตาแพทย์ — {quotas.length} คน
          </p>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {quotas.map(q => {
              const pct    = q.max_walkin_quota > 0
                ? Math.min((q.current_walkin_count / q.max_walkin_quota) * 100, 100)
                : 0;
              const isFull = q.current_walkin_count >= q.max_walkin_quota && q.max_walkin_quota > 0;
              const barColor = isFull         ? '#ef4444'
                             : pct > 70       ? '#f59e0b'
                             :                  '#8b5cf6';
              const initials = q.doctor_name
                ?.replace(/^(ทพ[ญ]?|ทญ|นพ|พญ)\.\s*/i, '').trim().charAt(0) || '?';

              const isUsing = usingId === q.quota_id;

              return (
                <div key={q.quota_id}
                     className="rounded-2xl p-4 shadow-sm transition-all flex flex-col"
                     style={{
                       background: isFull ? '#fef2f2' : 'rgba(255,255,255,0.92)',
                       border: `2px solid ${isFull ? '#fca5a5' : '#ede9fe'}`,
                     }}>

                  {/* header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                         style={{
                           background: isFull
                             ? 'linear-gradient(135deg,#f87171,#ef4444)'
                             : 'linear-gradient(135deg,#a78bfa,#7c3aed)',
                           fontSize: '1rem',
                         }}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate leading-tight"
                         style={{ fontSize: '0.82rem' }}>
                        {q.doctor_name}
                      </p>
                      <p className="text-gray-400 truncate" style={{ fontSize: '0.7rem' }}>
                        {q.specialty || 'ทันตกรรม'}
                      </p>
                    </div>
                  </div>

                  {/* quota numbers */}
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs text-gray-400">Walk-in</span>
                    <div className="text-right">
                      <span className="font-bold" style={{ fontSize: '1.2rem', color: isFull ? '#dc2626' : '#7c3aed' }}>
                        {q.current_walkin_count}
                      </span>
                      <span className="text-gray-400 text-xs">/{q.max_walkin_quota}</span>
                    </div>
                  </div>

                  {/* progress bar */}
                  <div className="w-full rounded-full h-2 mb-2" style={{ background: '#f3f4f6' }}>
                    <div className="h-2 rounded-full transition-all duration-700"
                         style={{ width: `${pct}%`, background: barColor }} />
                  </div>

                  {/* status + ปุ่มใช้โควตา */}
                  <div className="mt-auto pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs"
                            style={{ color: isFull ? '#dc2626' : pct > 70 ? '#d97706' : '#16a34a' }}>
                        {isFull ? '⛔ โควตาเต็ม'
                         : pct > 70 ? `⚠️ เหลือ ${q.max_walkin_quota - q.current_walkin_count} คิว`
                         : `✓ เหลือ ${q.max_walkin_quota - q.current_walkin_count} คิว`}
                      </span>
                      <span className="text-xs font-bold" style={{ color: '#9ca3af' }}>
                        {Math.round(pct)}%
                      </span>
                    </div>

                    {isFull ? (
                      <div className="w-full py-2 rounded-xl text-center text-sm font-bold"
                           style={{ background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5' }}>
                        คิวเต็มแล้ว
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUseQuota(q.quota_id)}
                        disabled={isUsing || !isToday}
                        className="w-full py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95 cursor-pointer"
                        style={isUsing ? {
                          background: '#c4b5fd', cursor: 'not-allowed',
                        } : !isToday ? {
                          background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed',
                        } : {
                          background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                          boxShadow: '0 3px 10px rgba(124,58,237,0.3)',
                        }}
                      >
                        {isUsing ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                                  style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                            กำลังบันทึก...
                          </span>
                        ) : '+ ใช้โควต้า'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

