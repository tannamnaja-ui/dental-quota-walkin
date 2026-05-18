import React, { useState, useEffect, useCallback } from 'react';
import DoctorCard from './DoctorCard';
import { quotaAPI, walkinAPI } from '../services/api';

export default function WalkinRegistration() {
  const [doctors,         setDoctors]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedDoctor,  setSelectedDoctor]  = useState(null);
  const [hn,              setHn]              = useState('');
  const [chiefComplaint,  setChiefComplaint]  = useState('');
  const [isRegistering,   setIsRegistering]   = useState(false);
  const [alert,           setAlert]           = useState(null); // { type, message }
  const [lastQueue,       setLastQueue]       = useState(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 6000);
  };

  const fetchQuota = useCallback(async () => {
    try {
      const res = await quotaAPI.get();
      setDoctors(res.data.data);
    } catch {
      // ไม่แสดง error ระหว่าง auto-refresh เพื่อไม่รบกวน UX
    } finally {
      setLoading(false);
    }
  }, []);

  // ดึงข้อมูลตอนโหลด และ auto-refresh ทุก 15 วินาที
  useEffect(() => {
    fetchQuota();
    const interval = setInterval(fetchQuota, 15000);
    return () => clearInterval(interval);
  }, [fetchQuota]);

  // หากแพทย์ที่เลือกกลายเป็นโควตาเต็ม ให้ล้างการเลือกและแจ้งเตือน
  useEffect(() => {
    if (!selectedDoctor) return;
    const updated = doctors.find(d => d.doctor_id === selectedDoctor.doctor_id);
    if (updated && updated.current_walkin_count >= updated.max_walkin_quota) {
      setSelectedDoctor(null);
      showAlert('error', `โควตาของ ${updated.doctor_name} เพิ่งเต็ม กรุณาเลือกแพทย์ท่านอื่น`);
    }
  }, [doctors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) { showAlert('error', 'กรุณาเลือกแพทย์ก่อน'); return; }
    if (!hn.trim())       { showAlert('error', 'กรุณากรอก HN คนไข้');    return; }

    setIsRegistering(true);
    try {
      const res = await walkinAPI.register({
        hn:              hn.trim(),
        doctor_id:       selectedDoctor.doctor_id,
        chief_complaint: chiefComplaint.trim() || null,
      });

      const { queue } = res.data.data;
      setLastQueue(queue);
      showAlert('success', `ลงทะเบียนสำเร็จ! หมายเลขคิว: ${queue.queue_number}`);

      setHn('');
      setChiefComplaint('');
      setSelectedDoctor(null);
      fetchQuota(); // อัปเดตโควตาทันที
    } catch (err) {
      const code    = err.response?.data?.code;
      const message = err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';

      showAlert('error', message);

      // หากโควตาเต็ม ให้รีเฟรชทันทีเพื่อล็อกปุ่มของแพทย์คนนั้น
      if (code === 'QUOTA_FULL') {
        setSelectedDoctor(null);
        fetchQuota();
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">

      {/* Alert floating */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl shadow-xl text-white transition-all ${
          alert.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          <p className="font-semibold text-sm">{alert.type === 'success' ? '✓ สำเร็จ' : '✕ ไม่สำเร็จ'}</p>
          <p className="text-sm mt-1 opacity-95">{alert.message}</p>
        </div>
      )}

      {/* ฟอร์มลงทะเบียน */}
      <div className="rounded-xl shadow p-5 mb-6" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #ede9fe' }}>
        <h2 className="text-base font-bold mb-4" style={{ color: '#5b21b6' }}>ข้อมูลคนไข้</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#6d28d9' }}>
                HN คนไข้ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={hn}
                onChange={e => setHn(e.target.value)}
                placeholder="กรอก HN"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                style={{ borderColor: '#ddd6fe', background: '#faf5ff' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#6d28d9' }}>อาการสำคัญ</label>
              <input
                type="text"
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                placeholder="อาการที่มาพบแพทย์ (ถ้ามี)"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                style={{ borderColor: '#ddd6fe', background: '#faf5ff' }}
              />
            </div>
          </div>

          {/* แสดงแพทย์ที่เลือก */}
          {selectedDoctor && (
            <div className="mb-4 p-3 rounded-lg flex items-center justify-between"
                 style={{ background: '#f3e8ff', border: '1px solid #ddd6fe' }}>
              <span className="text-sm" style={{ color: '#5b21b6' }}>
                แพทย์ที่เลือก: <strong>{selectedDoctor.doctor_name}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="text-xs underline"
                style={{ color: '#a78bfa' }}
              >
                ยกเลิกการเลือก
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isRegistering || !selectedDoctor}
            className={`w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-all ${
              isRegistering || !selectedDoctor
                ? 'bg-gray-300 cursor-not-allowed'
                : 'active:scale-95'
            }`}
            style={isRegistering || !selectedDoctor ? {} : {
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
            }}
          >
            {isRegistering ? 'กำลังลงทะเบียน...' : 'ยืนยันการลงทะเบียน Walk-in'}
          </button>
        </form>
      </div>

      {/* หัวข้อรายการแพทย์ */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold" style={{ color: '#5b21b6' }}>เลือกแพทย์ที่ต้องการพบ</h2>
        <button
          onClick={fetchQuota}
          className="text-xs flex items-center gap-1"
          style={{ color: '#8b5cf6' }}
        >
          ↻ รีเฟรช
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">กำลังโหลดข้อมูล...</div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          ยังไม่มีการตั้งค่าโควตาสำหรับวันนี้ กรุณาติดต่อผู้ดูแลระบบ
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map(doctor => (
            <DoctorCard
              key={doctor.doctor_id}
              doctor={doctor}
              onSelect={setSelectedDoctor}
              isSelected={selectedDoctor?.doctor_id === doctor.doctor_id}
              isRegistering={isRegistering}
            />
          ))}
        </div>
      )}
    </div>
  );
}
