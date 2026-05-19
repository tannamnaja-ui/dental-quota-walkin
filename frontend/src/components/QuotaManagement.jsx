import React, { useState, useEffect, useRef } from 'react';
import { quotaAPI, doctorAPI } from '../services/api';

const today = new Date().toISOString().split('T')[0];

export default function QuotaManagement() {
  const [positions,      setPositions]      = useState([]);
  const [specialties,    setSpecialties]    = useState([]);
  const [doctors,        setDoctors]        = useState([]);

  // โหลดค่าจาก localStorage (จำค่าไว้ตลอดจนกว่าจะเปลี่ยน)
  const [selPosIds, setSelPosIds] = useState(() => {
    try {
      const saved = localStorage.getItem('quota_sel_positions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [formDate,       setFormDate]       = useState(today);
  const [formDoctorCode, setFormDoctorCode] = useState('');
  const [formSpecId,     setFormSpecId]     = useState('');
  const [formQuota,      setFormQuota]      = useState('');

  const [items,          setItems]          = useState([]);

  const [loadingPos,     setLoadingPos]     = useState(true);
  const [loadingDoc,     setLoadingDoc]     = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [alert,          setAlert]          = useState(null);
  const [showPosModal,   setShowPosModal]   = useState(false);
  const [tempPosIds,     setTempPosIds]     = useState([]);

  // แก้ไขรายการ
  const [editItem,       setEditItem]       = useState(null); // item ที่กำลังแก้ไข
  const [editDate,       setEditDate]       = useState('');
  const [editDoctorCode, setEditDoctorCode] = useState('');
  const [editSpecId,     setEditSpecId]     = useState('');
  const [editQuota,      setEditQuota]      = useState('');

  const listEndRef = useRef(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  /* บันทึกลง localStorage ทุกครั้งที่ selPosIds เปลี่ยน */
  useEffect(() => {
    localStorage.setItem('quota_sel_positions', JSON.stringify(selPosIds));
  }, [selPosIds]);

  /* โหลด positions + specialties ครั้งเดียว */
  useEffect(() => {
    Promise.all([doctorAPI.getPositions(), doctorAPI.getSpecialties()])
      .then(([posRes, specRes]) => {
        setPositions(posRes.data.data  || []);
        setSpecialties(specRes.data.data || []);
      })
      .catch(() => showAlert('error', 'โหลดข้อมูลพื้นฐานไม่สำเร็จ'))
      .finally(() => setLoadingPos(false));
  }, []);

  /* โหลดแพทย์เมื่อ selPosIds เปลี่ยน — ใช้ join เป็น key เพื่อ trigger effect */
  const selKey = selPosIds.join(',');
  useEffect(() => {
    if (selPosIds.length === 0) { setDoctors([]); return; }
    setLoadingDoc(true);
    doctorAPI.getHisDoctors(selPosIds)
      .then(res => setDoctors(res.data.data || []))
      .catch(() => showAlert('error', 'โหลดรายชื่อแพทย์ไม่สำเร็จ'))
      .finally(() => setLoadingDoc(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);

  /* auto-fill specialty เมื่อเลือกแพทย์ */
  useEffect(() => {
    if (!formDoctorCode) { setFormSpecId(''); return; }
    const doc = doctors.find(d => d.doctor_code === formDoctorCode);
    setFormSpecId(doc?.specialty_id ? String(doc.specialty_id) : '');
  }, [formDoctorCode, doctors]);

  /* toggle ตำแหน่งใน modal (temp) */
  const toggleTempPos = (id) => {
    setTempPosIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  /* เปิด modal พร้อม copy ค่าปัจจุบันเข้า temp */
  const openPosModal = () => {
    setTempPosIds([...selPosIds]);
    setShowPosModal(true);
  };

  /* ยืนยันการเลือก */
  const confirmPos = () => {
    setSelPosIds(tempPosIds);
    setFormDoctorCode('');
    setFormSpecId('');
    setShowPosModal(false);
  };

  /* เปิด edit modal */
  const openEdit = (it) => {
    setEditItem(it);
    setEditDate(it.date);
    setEditDoctorCode(it.doctor_code);
    setEditSpecId(
      it.specialty !== '—'
        ? String(specialties.find(s => s.name === it.specialty)?.dttm_group_id || '')
        : ''
    );
    setEditQuota(String(it.quota));
  };

  /* บันทึก edit */
  const saveEdit = () => {
    const quota = parseInt(editQuota);
    if (isNaN(quota) || quota < 0) { showAlert('error', 'กรุณากรอกโควตาเป็นตัวเลข ≥ 0'); return; }
    if (!editDoctorCode) { showAlert('error', 'กรุณาเลือกแพทย์'); return; }

    const doc  = doctors.find(d => d.doctor_code === editDoctorCode);
    const spec = specialties.find(s => String(s.dttm_group_id) === editSpecId);

    // ตรวจ duplicate (ยกเว้น item ตัวเอง)
    const dup = items.find(x =>
      x.id !== editItem.id &&
      x.doctor_code === editDoctorCode &&
      x.date === editDate
    );
    if (dup) { showAlert('error', 'แพทย์คนนี้มีในรายการวันที่นี้แล้ว'); return; }

    setItems(prev => prev.map(x =>
      x.id !== editItem.id ? x : {
        ...x,
        date:        editDate,
        doctor_code: editDoctorCode,
        doctor_name: doc?.doctor_name || editDoctorCode,
        specialty:   spec?.name || doc?.specialty || '—',
        quota,
      }
    ));
    setEditItem(null);
  };

  /* เพิ่มแถวลง list */
  const handleAdd = () => {
    if (!formDoctorCode) { showAlert('error', 'กรุณาเลือกแพทย์'); return; }
    const quota = parseInt(formQuota);
    if (isNaN(quota) || quota < 0) { showAlert('error', 'กรุณากรอกโควตาเป็นตัวเลข ≥ 0'); return; }

    const doc  = doctors.find(d => d.doctor_code === formDoctorCode);
    const spec = specialties.find(s => String(s.dttm_group_id) === formSpecId);

    if (items.some(it => it.doctor_code === formDoctorCode && it.date === formDate)) {
      showAlert('error', `${doc?.doctor_name} มีในรายการวันที่นี้แล้ว`);
      return;
    }

    setItems(prev => [...prev, {
      id:          Date.now(),
      date:        formDate,
      doctor_code: formDoctorCode,
      doctor_name: doc?.doctor_name || formDoctorCode,
      specialty:   spec?.name || doc?.specialty || '—',
      quota,
    }]);

    setFormDoctorCode('');
    setFormSpecId('');
    setFormQuota('');
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  /* บันทึกทั้งหมด */
  const handleSave = async () => {
    if (items.length === 0) { showAlert('error', 'ไม่มีรายการ กรุณาเพิ่มข้อมูลก่อน'); return; }
    setSaving(true);
    try {
      const byDate = {};
      items.forEach(it => {
        if (!byDate[it.date]) byDate[it.date] = [];
        byDate[it.date].push({
          doctor_id:        it.doctor_code,
          doctor_name:      it.doctor_name,
          specialty:        it.specialty !== '—' ? it.specialty : null,
          max_walkin_quota: it.quota,
        });
      });
      await Promise.all(
        Object.entries(byDate).map(([date, batch]) =>
          quotaAPI.setupBulk({ quota_date: date, items: batch })
        )
      );
      showAlert('success', `บันทึกสำเร็จ ${items.length} รายการ`);
      setItems([]);
    } catch {
      showAlert('error', 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const canAdd   = !!formDoctorCode && formQuota !== '' && !loadingDoc;
  const readyCnt = items.length;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-5">

      {/* Alert */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl shadow-xl text-white text-sm
          ${alert.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {alert.message}
        </div>
      )}

      {/* ── Modal แก้ไขรายการ ── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
             onClick={() => setEditItem(null)}>
          <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
               style={{ background: 'white' }}
               onClick={e => e.stopPropagation()}>

            {/* header */}
            <div className="flex items-center justify-between px-6 py-4"
                 style={{ borderBottom: '1px solid #ede9fe', background: '#f5f0ff' }}>
              <h3 className="font-bold" style={{ color: '#4c1d95' }}>แก้ไขรายการ</h3>
              <button type="button" onClick={() => setEditItem(null)}
                      className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ color: '#9ca3af', background: '#f3f4f6' }}>✕</button>
            </div>

            {/* body */}
            <div className="p-6 space-y-4">

              {/* วันที่ */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6d28d9' }}>วันที่</label>
                <input
                  type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  style={{ borderColor: '#ddd6fe', background: '#faf5ff', color: '#3b0764' }}
                />
              </div>

              {/* แพทย์ */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6d28d9' }}>แพทย์</label>
                {doctors.length > 0 ? (
                  <DoctorCombobox
                    doctors={doctors}
                    value={editDoctorCode}
                    onChange={setEditDoctorCode}
                    placeholder="ค้นหาแพทย์..."
                  />
                ) : (
                  <div className="border rounded-xl px-3 py-2.5 text-sm"
                       style={{ borderColor: '#ddd6fe', background: '#f9fafb', color: '#6b7280' }}>
                    {editItem.doctor_name}
                    <span className="ml-2 text-xs" style={{ color: '#a78bfa' }}>
                      (เลือกตำแหน่งเพื่อเปลี่ยนแพทย์)
                    </span>
                  </div>
                )}
              </div>

              {/* ความชำนาญ */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6d28d9' }}>
                  ความชำนาญ <span className="font-normal" style={{ color: '#c4b5fd' }}>(ไม่บังคับ)</span>
                </label>
                <select
                  value={editSpecId} onChange={e => setEditSpecId(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  style={{ borderColor: '#ddd6fe', background: '#faf5ff', color: '#3b0764' }}
                >
                  <option value="">— ไม่ระบุ —</option>
                  {specialties.map(s => (
                    <option key={s.dttm_group_id} value={String(s.dttm_group_id)}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* โควตา */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6d28d9' }}>โควตาสูงสุด</label>
                <input
                  type="number" min="0" value={editQuota}
                  onChange={e => setEditQuota(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  placeholder="0" autoFocus
                  className="w-full border rounded-xl px-3 py-2.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                  style={{ borderColor: '#ddd6fe', background: '#faf5ff', color: '#3b0764' }}
                />
              </div>
            </div>

            {/* footer */}
            <div className="flex justify-end gap-2 px-6 py-4"
                 style={{ borderTop: '1px solid #ede9fe', background: '#faf5ff' }}>
              <button type="button" onClick={() => setEditItem(null)}
                      className="px-5 py-2 rounded-xl text-sm font-medium cursor-pointer"
                      style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                ยกเลิก
              </button>
              <button type="button" onClick={saveEdit}
                      className="px-6 py-2 rounded-xl text-sm font-bold text-white cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        boxShadow: '0 3px 10px rgba(124,58,237,0.3)',
                      }}>
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal เลือกตำแหน่ง ── */}
      {showPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
             onClick={() => setShowPosModal(false)}>
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
               style={{ background: 'white', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
               onClick={e => e.stopPropagation()}>

            {/* modal header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0"
                 style={{ borderBottom: '1px solid #ede9fe', background: '#f5f0ff' }}>
              <div>
                <h3 className="font-bold" style={{ color: '#4c1d95' }}>เลือกตำแหน่ง</h3>
                <p className="text-xs mt-0.5" style={{ color: '#a78bfa' }}>
                  เลือกได้หลายตำแหน่ง · เลือกแล้ว {tempPosIds.length} ตำแหน่ง
                </p>
              </div>
              <button type="button" onClick={() => setShowPosModal(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{ color: '#9ca3af', background: '#f3f4f6', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {/* modal body */}
            <div className="overflow-y-auto p-5 flex-1">
              {loadingPos ? (
                <p className="text-center text-gray-400 py-8 animate-pulse">กำลังโหลด...</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {positions.map(p => {
                    const isActive = tempPosIds.includes(p.position_id);
                    return (
                      <button
                        key={p.position_id}
                        type="button"
                        onClick={() => toggleTempPos(p.position_id)}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                        style={isActive ? {
                          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                          color: 'white',
                          boxShadow: '0 3px 10px rgba(124,58,237,0.25)',
                          border: 'none',
                        } : {
                          background: '#f5f0ff',
                          color: '#6d28d9',
                          border: '1.5px solid #ddd6fe',
                        }}
                      >
                        {isActive ? '✓ ' : ''}{p.position_name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* modal footer */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0"
                 style={{ borderTop: '1px solid #ede9fe', background: '#faf5ff' }}>
              <button type="button"
                      onClick={() => setTempPosIds([])}
                      className="text-sm underline cursor-pointer"
                      style={{ color: '#a78bfa' }}>
                ล้างทั้งหมด
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPosModal(false)}
                        className="px-5 py-2 rounded-xl text-sm font-medium cursor-pointer"
                        style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  ยกเลิก
                </button>
                <button type="button" onClick={confirmPos}
                        className="px-6 py-2 rounded-xl text-sm font-bold text-white cursor-pointer transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                          boxShadow: '0 3px 10px rgba(124,58,237,0.3)',
                        }}>
                  ยืนยัน ({tempPosIds.length} ตำแหน่ง)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 1 · เลือกตำแหน่ง ── */}
      <section className="rounded-2xl p-5 shadow-sm"
               style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid #ede9fe' }}>

        <p className="text-sm font-bold mb-3" style={{ color: '#5b21b6' }}>
          1 · เลือกตำแหน่ง
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {/* ปุ่มเปิด modal */}
          <button
            type="button"
            onClick={openPosModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer"
            style={{
              background: selPosIds.length > 0
                ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                : '#f5f0ff',
              color: selPosIds.length > 0 ? 'white' : '#6d28d9',
              border: selPosIds.length > 0 ? 'none' : '1.5px solid #ddd6fe',
              boxShadow: selPosIds.length > 0 ? '0 3px 12px rgba(124,58,237,0.3)' : 'none',
            }}
          >
            🏥 {selPosIds.length > 0 ? `เลือกแล้ว ${selPosIds.length} ตำแหน่ง` : 'เลือกตำแหน่ง'}
            <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>▼</span>
          </button>

          {/* badges ตำแหน่งที่เลือก */}
          {selPosIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selPosIds.map(id => {
                const pos = positions.find(p => p.position_id === id);
                return pos ? (
                  <span key={id}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: '#ede9fe', color: '#5b21b6' }}>
                    {pos.position_name}
                    <button type="button"
                            onClick={() => {
                              setSelPosIds(prev => prev.filter(x => x !== id));
                              setFormDoctorCode('');
                            }}
                            className="cursor-pointer opacity-60 hover:opacity-100"
                            style={{ lineHeight: 1 }}>
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 2 · ฟอร์มเพิ่มรายการ ── */}
      <section className="rounded-2xl p-5 shadow-sm"
               style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid #ede9fe' }}>

        <p className="text-sm font-bold mb-4" style={{ color: '#5b21b6' }}>
          2 · เพิ่มรายการโควตา
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">

          {/* วันที่ */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6d28d9' }}>วันที่</label>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              style={{ borderColor: '#ddd6fe', background: '#faf5ff', color: '#3b0764' }}
            />
          </div>

          {/* เลือกแพทย์ */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6d28d9' }}>
              เลือกแพทย์
              {loadingDoc && <span className="ml-1 text-xs animate-pulse" style={{ color: '#a78bfa' }}>กำลังโหลด...</span>}
            </label>
            <DoctorCombobox
              doctors={doctors}
              value={formDoctorCode}
              onChange={setFormDoctorCode}
              disabled={selPosIds.length === 0 || loadingDoc}
              placeholder={selPosIds.length === 0 ? '— เลือกตำแหน่งก่อน —' : `ค้นหาแพทย์ (${doctors.length} คน)`}
            />
          </div>

          {/* ความชำนาญ */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6d28d9' }}>
              ความชำนาญ
              <span className="ml-1 font-normal" style={{ color: '#c4b5fd' }}>(ไม่บังคับ)</span>
            </label>
            <select
              value={formSpecId}
              onChange={e => setFormSpecId(e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              style={{ borderColor: '#ddd6fe', background: '#faf5ff', color: '#3b0764' }}
            >
              <option value="">— ไม่ระบุ —</option>
              {specialties.map(s => (
                <option key={s.dttm_group_id} value={String(s.dttm_group_id)}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* โควตา */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6d28d9' }}>โควตาสูงสุด</label>
            <input
              type="number"
              min="0"
              value={formQuota}
              onChange={e => setFormQuota(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canAdd && handleAdd()}
              placeholder="0"
              className="w-full border rounded-xl px-3 py-2.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
              style={{ borderColor: '#ddd6fe', background: '#faf5ff', color: '#3b0764' }}
            />
          </div>
        </div>

        {/* preview */}
        {formDoctorCode && (() => {
          const doc = doctors.find(d => d.doctor_code === formDoctorCode);
          return doc ? (
            <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2"
                 style={{ background: '#f5f0ff', border: '1px solid #ddd6fe' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                   style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}>
                {doc.doctor_name?.charAt(0)}
              </div>
              <span className="text-sm font-medium" style={{ color: '#4c1d95' }}>{doc.doctor_name}</span>
              {doc.specialty && <span className="text-xs" style={{ color: '#7c3aed' }}>· {doc.specialty}</span>}
            </div>
          ) : null;
        })()}

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="px-8 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
          style={canAdd ? {
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
            cursor: 'pointer',
          } : {
            background: '#d1d5db',
            cursor: 'not-allowed',
          }}
        >
          + เพิ่มข้อมูล
        </button>
      </section>

      {/* ── 3 · รายการที่สะสม ── */}
      {readyCnt > 0 && (
        <section className="rounded-2xl shadow-sm overflow-hidden"
                 style={{ border: '1px solid #ede9fe' }}>

          <div className="flex items-center justify-between px-5 py-3"
               style={{ background: '#f5f0ff', borderBottom: '1px solid #ede9fe' }}>
            <p className="text-sm font-bold" style={{ color: '#5b21b6' }}>
              3 · รายการที่จะบันทึก
            </p>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: '#ede9fe', color: '#7c3aed' }}>
              {readyCnt} รายการ
            </span>
          </div>

          <table className="w-full text-sm" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <thead style={{ background: '#faf5ff', borderBottom: '1px solid #ede9fe' }}>
              <tr>
                {['#', 'วันที่', 'ชื่อแพทย์', 'ความชำนาญ', 'โควตา', 'จัดการ'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold"
                      style={{ color: '#7c3aed' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} style={{ borderTop: '1px solid #f3e8ff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {new Date(it.date + 'T00:00:00').toLocaleDateString('th-TH', {
                      day: 'numeric', month: 'short', year: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{it.doctor_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{it.specialty}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold px-2.5 py-1 rounded-lg text-xs"
                          style={{ background: '#ede9fe', color: '#7c3aed' }}>
                      {it.quota} คิว
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => openEdit(it)}
                              className="text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              style={{ color: '#7c3aed', background: '#ede9fe' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#ddd6fe'}
                              onMouseLeave={e => e.currentTarget.style.background = '#ede9fe'}>
                        แก้ไข
                      </button>
                      <button type="button" onClick={() => setItems(p => p.filter(x => x.id !== it.id))}
                              className="text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              style={{ color: '#ef4444', background: '#fee2e2' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}>
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
               style={{ background: '#f5f0ff', borderTop: '1px solid #ede9fe' }}>
            <p className="text-xs text-gray-500">กด "แก้ไข" เพื่อแก้ไข หรือ "ลบ" เพื่อเอาออกจากรายการ</p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 rounded-xl font-bold text-sm text-white flex items-center gap-2 transition-all"
              style={saving ? {
                background: '#d1d5db', cursor: 'not-allowed',
              } : {
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
                cursor: 'pointer',
              }}
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  กำลังบันทึก...
                </>
              ) : `💾 บันทึกข้อมูล (${readyCnt} รายการ)`}
            </button>
          </div>
        </section>
      )}

      <div ref={listEndRef} />
    </div>
  );
}

function DoctorCombobox({ doctors, value, onChange, disabled, placeholder }) {
  const [search,  setSearch]  = useState('');
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);

  const selectedDoc = doctors.find(d => d.doctor_code === value);

  const filtered = search.trim()
    ? doctors.filter(d => d.doctor_name.toLowerCase().includes(search.toLowerCase()))
    : doctors;

  // ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFocus = () => {
    if (disabled) return;
    setFocused(true);
    setSearch('');
    setOpen(true);
  };

  const handleChange = (e) => {
    setSearch(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange('');
  };

  const handleSelect = (doc) => {
    onChange(doc.doctor_code);
    setSearch('');
    setOpen(false);
    setFocused(false);
  };

  const displayValue = focused ? search : (selectedDoc?.doctor_name || '');

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full border rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ borderColor: open ? '#a78bfa' : '#ddd6fe', background: '#faf5ff', color: '#3b0764' }}
        />
        {/* arrow icon */}
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs"
              style={{ color: '#a78bfa' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 rounded-xl shadow-xl overflow-hidden"
             style={{ border: '1.5px solid #ddd6fe', background: 'white', maxHeight: '14rem' }}>

          {/* จำนวนผลลัพธ์ */}
          {search.trim() && (
            <div className="px-3 py-1.5 text-xs border-b"
                 style={{ color: '#a78bfa', borderColor: '#ede9fe', background: '#faf5ff' }}>
              พบ {filtered.length} รายการ
            </div>
          )}

          <div className="overflow-y-auto" style={{ maxHeight: '12rem' }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-center" style={{ color: '#9ca3af' }}>
                ไม่พบแพทย์ที่ค้นหา
              </div>
            ) : (
              filtered.map(doc => {
                const isSelected = doc.doctor_code === value;
                // highlight ส่วนที่ตรงกับ search
                const name = doc.doctor_name;
                const idx  = search.trim()
                  ? name.toLowerCase().indexOf(search.toLowerCase())
                  : -1;

                return (
                  <button
                    key={doc.doctor_code}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); handleSelect(doc); }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
                    style={{
                      background: isSelected ? '#f5f0ff' : 'white',
                      borderBottom: '1px solid #f3e8ff',
                      color: '#1f2937',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f0ff'}
                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? '#f5f0ff' : 'white'}
                  >
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: isSelected
                            ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)'
                            : 'linear-gradient(135deg,#c4b5fd,#a78bfa)' }}>
                      {name.charAt(0)}
                    </span>
                    <span className="flex-1 truncate">
                      {idx >= 0 ? (
                        <>
                          {name.slice(0, idx)}
                          <mark style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: '2px', padding: '0 1px' }}>
                            {name.slice(idx, idx + search.length)}
                          </mark>
                          {name.slice(idx + search.length)}
                        </>
                      ) : name}
                    </span>
                    {isSelected && (
                      <span style={{ color: '#7c3aed', fontSize: '0.75rem' }}>✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
