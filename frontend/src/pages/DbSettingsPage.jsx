import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { configAPI } from '../services/api';

const DEFAULT_PORT = { postgresql: '5432', mysql: '3306' };

export default function DbSettingsPage() {
  const navigate = useNavigate();
  const [dbType,      setDbType]      = useState('postgresql');
  const [form,        setForm]        = useState({ host: 'localhost', port: '5432', database: '', user: '', password: '' });
  const [testing,     setTesting]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [testResult,  setTestResult]  = useState(null);
  const [saveError,   setSaveError]   = useState('');
  const [tables,      setTables]      = useState(null);
  const [checkingTbl, setCheckingTbl] = useState(false);
  const [creatingTbl, setCreatingTbl] = useState(null);

  useEffect(() => {
    // โหลด config + ตรวจสอบตารางพร้อมกันในพื้นหลัง
    configAPI.get().then(res => {
      if (res.data.configured && res.data.data) {
        const c = res.data.data;
        setDbType(c.type || 'postgresql');
        setForm({
          host:     c.host     || 'localhost',
          port:     String(c.port || DEFAULT_PORT[c.type] || '5432'),
          database: c.database || '',
          user:     c.user     || '',
          password: c.password || '',
        });
        // ตรวจสอบตารางอัตโนมัติเมื่อมี config
        checkTablesAuto();
      }
    }).catch(() => {});
  }, []);

  const checkTablesAuto = () => {
    setCheckingTbl(true);
    configAPI.checkTables()
      .then(res => setTables(res.data.data))
      .catch(() => setTables([]))
      .finally(() => setCheckingTbl(false));
  };

  const checkTables = () => {
    setTables(null);
    checkTablesAuto();
  };

  const handleCreateTable = async (tableName) => {
    setCreatingTbl(tableName);
    try {
      await configAPI.createTable(tableName);
      await checkTables(); // refresh สถานะ
    } catch {
      alert(`สร้างตาราง ${tableName} ไม่สำเร็จ`);
    } finally {
      setCreatingTbl(null);
    }
  };

  const handleTypeChange = (type) => {
    setDbType(type);
    setForm(prev => ({ ...prev, port: DEFAULT_PORT[type] }));
    setTestResult(null);
  };

  const handleField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setTestResult(null);
    setSaveError('');
  };

  const handleTest = async () => {
    if (!form.host || !form.port || !form.database || !form.user) {
      setTestResult({ success: false, message: 'กรุณากรอกข้อมูลให้ครบก่อนทดสอบ' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await configAPI.test({ type: dbType, ...form });
      setTestResult({ success: true, message: res.data.message });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.message || 'ทดสอบไม่สำเร็จ' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!form.host || !form.port || !form.database || !form.user) {
      setSaveError('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await configAPI.save({ type: dbType, ...form });
      navigate('/'); // กลับหน้า login
    } catch (err) {
      setSaveError(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gray-50 border-b px-6 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500
                         hover:bg-gray-200 hover:text-gray-700 transition-all"
              title="กลับหน้า Login"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-base font-bold text-gray-800">ตั้งค่าการเชื่อมต่อฐานข้อมูล</h2>
              <p className="text-xs text-gray-500 mt-0.5">ใช้สำหรับตรวจสอบข้อมูลเจ้าหน้าที่ (ตาราง officer)</p>
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* DB Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทฐานข้อมูล</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
                  { id: 'mysql',      label: 'MySQL',      icon: '🐬' },
                ].map(db => (
                  <button
                    key={db.id}
                    onClick={() => handleTypeChange(db.id)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold
                                border-2 transition-all ${
                      dbType === db.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span>{db.icon}</span> {db.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Host + Port */}
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">IP Server / Host</label>
                <input
                  type="text"
                  value={form.host}
                  onChange={e => handleField('host', e.target.value)}
                  placeholder="192.168.1.x หรือ localhost"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
                <input
                  type="number"
                  value={form.port}
                  onChange={e => handleField('port', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Database */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Database</label>
              <input
                type="text"
                value={form.database}
                onChange={e => handleField('database', e.target.value)}
                placeholder="ชื่อ database เช่น hosxp_pg"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                value={form.user}
                onChange={e => handleField('user', e.target.value)}
                placeholder="username ของฐานข้อมูล"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => handleField('password', e.target.value)}
                placeholder="ถ้าไม่ต้องการเปลี่ยนให้เว้นว่าง"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${
                testResult.success
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50   border-red-200   text-red-700'
              }`}>
                <span className="shrink-0 font-bold">{testResult.success ? '✓' : '✕'}</span>
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Save Error */}
            {saveError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                <span>✕</span> {saveError}
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleTest}
                disabled={testing}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  testing
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-blue-500 text-blue-600 hover:bg-blue-50 active:scale-95'
                }`}
              >
                {testing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    กำลังทดสอบ...
                  </span>
                ) : '🔌 ทดสอบการเชื่อมต่อ'}
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md ${
                  saving
                    ? 'bg-gray-300 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200'
                }`}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    กำลังบันทึก...
                  </span>
                ) : '💾 บันทึกข้อมูลการเชื่อมต่อ'}
              </button>
            </div>

          </div>
        </div>

        {/* ── ตรวจสอบตาราง ── */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mt-4">
          <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800">ตรวจสอบตารางในฐานข้อมูล</h3>
              <p className="text-xs text-gray-500 mt-0.5">ตาราง dent_* ที่ระบบต้องใช้งาน</p>
            </div>
            <button
              type="button"
              onClick={checkTables}
              disabled={checkingTbl}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                         border-2 border-blue-400 text-blue-600 hover:bg-blue-50 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingTbl ? (
                <><span className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />ตรวจสอบ...</>
              ) : '🔍 ตรวจสอบตาราง'}
            </button>
          </div>

          <div className="p-5 space-y-3">
            {[
              { name: 'dent_doctors',     label: 'dent_doctors',     desc: 'รายชื่อแพทย์ (sync จาก HIS)' },
              { name: 'dent_daily_quota', label: 'dent_daily_quota', desc: 'โควตา Walk-in รายวัน' },
              { name: 'dent_walkin_queue',label: 'dent_walkin_queue',desc: 'คิว Walk-in' },
            ].map(tbl => {
              const info    = tables?.find(t => t.table === tbl.name);
              const exists  = info?.exists ?? null;
              const creating = creatingTbl === tbl.name;

              return (
                <div key={tbl.name}
                     className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background: exists === true ? '#f0fdf4' : exists === false ? '#fff7ed' : '#f9fafb',
                              border: `1px solid ${exists === true ? '#bbf7d0' : exists === false ? '#fed7aa' : '#e5e7eb'}` }}>

                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '1.1rem' }}>
                      {exists === true ? '✅' : exists === false ? '⚠️' : '⬜'}
                    </span>
                    <div>
                      <p className="text-sm font-bold font-mono" style={{ color: '#1f2937' }}>{tbl.label}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{tbl.desc}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCreateTable(tbl.name)}
                    disabled={exists !== false || creating}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={exists === false && !creating ? {
                      background: 'linear-gradient(135deg,#f97316,#ea580c)',
                      color: 'white',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(234,88,12,0.35)',
                    } : {
                      background: '#e5e7eb',
                      color: '#9ca3af',
                      cursor: 'not-allowed',
                    }}
                  >
                    {creating ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        กำลังสร้าง...
                      </span>
                    ) : exists === true ? '✓ มีแล้ว'
                      : exists === false ? '+ เพิ่มตาราง'
                      : 'เพิ่มตาราง'}
                  </button>
                </div>
              );
            })}

            {tables === null && checkingTbl && (
              <p className="text-center text-xs text-gray-400 py-2 animate-pulse">
                กำลังตรวจสอบตาราง...
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-4 opacity-70">
          ข้อมูลการเชื่อมต่อจะถูกเก็บไว้ที่ server เท่านั้น
        </p>
      </div>
    </div>
  );
}
