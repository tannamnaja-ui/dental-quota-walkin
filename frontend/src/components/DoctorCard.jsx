import React from 'react';

export default function DoctorCard({ doctor, onSelect, isSelected, isRegistering }) {
  const notConfigured = !doctor.quota_id || doctor.max_walkin_quota === 0;
  const isFull        = !notConfigured && doctor.current_walkin_count >= doctor.max_walkin_quota;
  const isDisabled    = notConfigured || isFull || isRegistering;

  const progressPct = doctor.max_walkin_quota > 0
    ? Math.min((doctor.current_walkin_count / doctor.max_walkin_quota) * 100, 100)
    : 0;

  // ระดับสีแถบ progress
  const barColor = isFull         ? 'bg-red-500'
                 : progressPct > 70 ? 'bg-yellow-500'
                 :                    'bg-purple-500';

  // สีกรอบการ์ด
  const borderColor = isSelected      ? 'shadow-lg ring-2'
                    : isFull           ? ''
                    : notConfigured    ? ''
                    :                    'hover:shadow-lg';

  const cardStyle = isSelected
    ? { border: '2px solid #8b5cf6', boxShadow: '0 0 0 3px #ddd6fe', background: 'rgba(255,255,255,0.95)' }
    : isFull
    ? { border: '2px solid #fca5a5', background: '#fff5f5' }
    : notConfigured
    ? { border: '2px solid #e5e7eb', background: '#f9fafb' }
    : { border: '2px solid #ede9fe', background: 'rgba(255,255,255,0.9)' };

  return (
    <div className={`rounded-xl shadow-md p-5 transition-all ${borderColor}`} style={cardStyle}
         onMouseEnter={e => { if (!isSelected && !isFull && !notConfigured) e.currentTarget.style.borderColor = '#c4b5fd'; }}
         onMouseLeave={e => { if (!isSelected && !isFull && !notConfigured) e.currentTarget.style.borderColor = '#ede9fe'; }}>

      {/* หัวการ์ด: avatar + ชื่อ + badge สถานะ */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-lg shrink-0`}
               style={{ background: isFull ? '#f87171' : notConfigured ? '#9ca3af' : 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}>
            {doctor.doctor_name?.replace(/^ทพ[ญ]?\.\s*/, '').charAt(0) || 'D'}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm leading-tight">{doctor.doctor_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{doctor.specialty || '-'}</p>
          </div>
        </div>

        {notConfigured ? (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">ไม่รับ Walk-in</span>
        ) : isFull ? (
          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">โควตาเต็ม</span>
        ) : (
          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full shrink-0">รับได้</span>
        )}
      </div>

      {/* แสดงจำนวนโควตา */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">Walk-in วันนี้</span>
          <span className="text-sm font-bold"
                style={{ color: isFull ? '#dc2626' : notConfigured ? '#9ca3af' : '#7c3aed' }}>
            {doctor.current_walkin_count} / {doctor.max_walkin_quota}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {!notConfigured && (
          <p className="text-right text-xs text-gray-400 mt-1">
            เหลือ {Math.max(doctor.max_walkin_quota - doctor.current_walkin_count, 0)} คิว
          </p>
        )}
      </div>

      {/* ปุ่มเลือกแพทย์ */}
      <button
        onClick={() => !isDisabled && onSelect(doctor)}
        disabled={isDisabled}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
          isDisabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white cursor-pointer active:scale-95'
        }`}
        style={isDisabled ? {} : {
          background: isSelected
            ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
            : 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
          boxShadow: isSelected ? '0 4px 12px rgba(109,40,217,0.4)' : '0 2px 8px rgba(139,92,246,0.3)',
        }}
      >
        {isSelected      ? '✓ เลือกแล้ว'
         : isFull        ? 'โควตาเต็ม'
         : notConfigured ? 'ไม่รับ Walk-in'
         :                 'เลือกแพทย์'}
      </button>
    </div>
  );
}
