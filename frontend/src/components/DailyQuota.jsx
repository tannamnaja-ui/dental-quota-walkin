import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { quotaAPI } from '../services/api';

const toThaiDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

export default function DailyQuota() {
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate,   setSelectedDate]   = useState(today);
  const [quotas,         setQuotas]         = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [alert,          setAlert]          = useState(null);

  // inline edit
  const [editingId,  setEditingId]  = useState(null);
  const [editValue,  setEditValue]  = useState('');

  // confirm delete
  const [deletingId, setDeletingId] = useState(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchQuota = useCallback(async () => {
    setLoading(true);
    try {
      const res = await quotaAPI.get(selectedDate);
      // แสดงเฉพาะ record ที่มี quota_id (ตั้งค่าแล้ว)
      setQuotas((res.data.data || []).filter(q => q.quota_id));
    } catch {
      showAlert('error', 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchQuota(); }, [fetchQuota]);

  /* ── Edit ── */
  const startEdit = (q) => {
    setEditingId(q.quota_id);
    setEditValue(String(q.max_walkin_quota));
    setDeletingId(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditValue(''); };

  const saveEdit = async (quotaId) => {
    const val = parseInt(editValue);
    if (isNaN(val) || val < 0) { showAlert('error', 'กรุณากรอกตัวเลข ≥ 0'); return; }
    try {
      await quotaAPI.update(quotaId, val);
      showAlert('success', 'อัปเดตโควตาสำเร็จ');
      setEditingId(null);
      fetchQuota();
    } catch {
      showAlert('error', 'อัปเดตไม่สำเร็จ');
    }
  };

  /* ── Delete ── */
  const confirmDelete = async (quotaId) => {
    try {
      await quotaAPI.delete(quotaId);
      showAlert('success', 'ลบโควตาสำเร็จ');
      setDeletingId(null);
      setQuotas(prev => prev.filter(q => q.quota_id !== quotaId));
    } catch {
      showAlert('error', 'ลบไม่สำเร็จ');
    }
  };

  /* ── Export Excel ── */
  const exportExcel = () => {
    if (quotas.length === 0) { showAlert('error', 'ไม่มีข้อมูลสำหรับส่งออก'); return; }

    const rows = quotas.map((q, i) => ({
      'ลำดับ':         i + 1,
      'ชื่อแพทย์':     q.doctor_name,
      'ความเชี่ยวชาญ': q.specialty || '',
      'โควต้าที่ใช้ไปแล้ว':   q.current_walkin_count,
      'โควตาสูงสุด':   q.max_walkin_quota,
      'อัปเดตล่าสุด':  q.updated_at
        ? new Date(q.updated_at).toLocaleString('th-TH')
        : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // ปรับความกว้างคอลัมน์
    ws['!cols'] = [
      { wch: 6 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'โควตา');
    XLSX.writeFile(wb, `quota_${selectedDate}.xlsx`);
  };

  const filledCount  = quotas.length;
  const totalMax     = quotas.reduce((s, q) => s + (q.max_walkin_quota || 0), 0);
  const totalCurrent = quotas.reduce((s, q) => s + (q.current_walkin_count || 0), 0);

  return (
    <div className="max-w-5xl mx-auto p-4">

      {/* Alert */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl shadow-xl text-white text-sm
          ${alert.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {alert.message}
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl p-5 mb-5 shadow-sm"
           style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid #ede9fe' }}>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#5b21b6' }}>
              โควตาแต่ละวัน
            </h2>
            {!loading && quotas.length > 0 && (
              <p className="text-xs mt-0.5" style={{ color: '#a78bfa' }}>
                {toThaiDate(selectedDate)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* date picker */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold shrink-0" style={{ color: '#6d28d9' }}>
                วันที่:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setEditingId(null); setDeletingId(null); }}
                className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                style={{ borderColor: '#ddd6fe', background: '#faf5ff', color: '#3b0764' }}
              />
            </div>

            {/* refresh */}
            <button type="button" onClick={fetchQuota}
                    className="text-xs px-3 py-2 rounded-xl border cursor-pointer transition-colors"
                    style={{ borderColor: '#ddd6fe', color: '#7c3aed', background: '#faf5ff' }}>
              ↻ รีเฟรช
            </button>

            {/* export */}
            <button
              type="button"
              onClick={exportExcel}
              disabled={quotas.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all"
              style={quotas.length === 0 ? {
                background: '#d1d5db', cursor: 'not-allowed',
              } : {
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                boxShadow: '0 3px 10px rgba(22,163,74,0.3)',
              }}
            >
              📥 ส่งออก Excel
            </button>
          </div>
        </div>

        {/* summary chips */}
        {!loading && quotas.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #ede9fe' }}>
            <Chip label="รายการทั้งหมด" value={`${filledCount} รายการ`} color="#ede9fe" text="#5b21b6" />
            <Chip label="โควตารวม"      value={`${totalMax} คิว`}       color="#ddd6fe" text="#6d28d9" />
            <Chip label="โควต้าที่ใช้ไปแล้ว"  value={`${totalCurrent} คิว`}   color="#fef3c7" text="#d97706" />
            <Chip label="เหลือ"         value={`${Math.max(totalMax - totalCurrent, 0)} คิว`}
                  color="#dcfce7" text="#16a34a" />
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-24 text-gray-400 text-sm animate-pulse">กำลังโหลดข้อมูล...</div>
      ) : quotas.length === 0 ? (
        <div className="text-center py-24 rounded-2xl"
             style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid #ede9fe', color: '#a78bfa' }}>
          <div style={{ fontSize: '2.5rem' }}>📋</div>
          <p className="mt-3 text-sm">ไม่มีการตั้งค่าโควตาในวันที่ {toThaiDate(selectedDate)}</p>
          <p className="text-xs mt-1 text-gray-400">ไปที่เมนู "ตั้งค่าโควตา" เพื่อเพิ่มข้อมูล</p>
        </div>
      ) : (
        <div className="rounded-2xl shadow-sm overflow-hidden"
             style={{ border: '1px solid #ede9fe' }}>
          <table className="w-full text-sm" style={{ background: 'rgba(255,255,255,0.92)' }}>
            <thead style={{ background: '#f5f0ff', borderBottom: '1px solid #ede9fe' }}>
              <tr>
                {['#', 'ชื่อแพทย์', 'ความเชี่ยวชาญ', 'โควต้าที่ใช้ไปแล้ว', 'โควตาสูงสุด', 'อัปเดต', 'จัดการ'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                      style={{ color: '#7c3aed' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotas.map((q, idx) => {
                const isPast     = selectedDate < today;
                const isEditing  = editingId  === q.quota_id;
                const isDeleting = deletingId === q.quota_id;
                const isFull     = q.current_walkin_count >= q.max_walkin_quota && q.max_walkin_quota > 0;
                const pct        = q.max_walkin_quota > 0
                  ? Math.min((q.current_walkin_count / q.max_walkin_quota) * 100, 100)
                  : 0;

                return (
                  <tr key={q.quota_id}
                      style={{
                        borderTop: '1px solid #f3e8ff',
                        background: isEditing  ? '#faf5ff'
                                  : isDeleting ? '#fff5f5'
                                  : '',
                      }}>
                    {/* # */}
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>

                    {/* ชื่อแพทย์ */}
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {q.doctor_name}
                    </td>

                    {/* ความเชี่ยวชาญ */}
                    <td className="px-4 py-3 text-xs text-gray-500">{q.specialty || '—'}</td>

                    {/* โควต้าที่ใช้ไปแล้ว + bar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs whitespace-nowrap"
                              style={{ color: isFull ? '#dc2626' : '#7c3aed' }}>
                          {q.current_walkin_count}
                        </span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 shrink-0">
                          <div className="h-1.5 rounded-full"
                               style={{
                                 width: `${pct}%`,
                                 background: isFull ? '#ef4444' : pct > 70 ? '#f59e0b' : '#8b5cf6',
                               }} />
                        </div>
                      </div>
                    </td>

                    {/* โควตาสูงสุด (editable) */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number" min="0"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  saveEdit(q.quota_id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                          className="w-20 border rounded-lg px-2 py-1 text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                          style={{ borderColor: '#a78bfa', background: 'white', color: '#3b0764' }}
                        />
                      ) : (
                        <span className="font-bold px-2.5 py-1 rounded-lg text-xs"
                              style={{ background: '#ede9fe', color: '#7c3aed' }}>
                          {q.max_walkin_quota} คิว
                        </span>
                      )}
                    </td>

                    {/* อัปเดต */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {q.updated_at
                        ? new Date(q.updated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>

                    {/* จัดการ */}
                    <td className="px-4 py-3">
                      {isPast ? (
                        <span className="text-xs" style={{ color: '#9ca3af' }}>วันที่ผ่านมาแล้วไม่สามารถแก้ไขได้</span>
                      ) : isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => saveEdit(q.quota_id)}
                                  className="text-xs px-2.5 py-1 rounded-lg cursor-pointer font-semibold"
                                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: 'white' }}>
                            บันทึก
                          </button>
                          <button type="button" onClick={cancelEdit}
                                  className="text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                                  style={{ background: '#f3f4f6', color: '#6b7280' }}>
                            ยกเลิก
                          </button>
                        </div>
                      ) : isDeleting ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-500 font-medium">ยืนยันลบ?</span>
                          <button type="button" onClick={() => confirmDelete(q.quota_id)}
                                  className="text-xs px-2.5 py-1 rounded-lg cursor-pointer font-semibold"
                                  style={{ background: '#ef4444', color: 'white' }}>
                            ลบ
                          </button>
                          <button type="button" onClick={() => setDeletingId(null)}
                                  className="text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                                  style={{ background: '#f3f4f6', color: '#6b7280' }}>
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => startEdit(q)}
                                  className="text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                                  style={{ background: '#ede9fe', color: '#7c3aed' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#ddd6fe'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#ede9fe'}>
                            แก้ไข
                          </button>
                          <button type="button" onClick={() => { setDeletingId(q.quota_id); setEditingId(null); }}
                                  className="text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                                  style={{ background: '#fee2e2', color: '#ef4444' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}>
                            ลบ
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* footer */}
          {selectedDate >= today && (
            <div className="px-5 py-3 text-xs text-gray-400 text-right"
                 style={{ borderTop: '1px solid #ede9fe', background: '#faf5ff' }}>
              กด Enter เพื่อบันทึก · Esc เพื่อยกเลิกการแก้ไข
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, color, text }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
         style={{ background: color, color: text }}>
      <span className="opacity-70">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
