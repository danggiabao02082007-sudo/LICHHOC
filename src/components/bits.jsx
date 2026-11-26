// Khối giao diện dùng chung cho các trang lịch học
import { cx, Select, Button } from './ui.jsx';
import { DAYN, timeOf, colorOf } from '../lib/time.js';

/** Một buổi học */
export function ClassCard({ c, periods, state, onClick, compact }) {
  const t = timeOf(c, periods);
  return (
    <button onClick={onClick} className={cx('w-full text-left rounded-2xl p-3 text-white shadow-soft bg-gradient-to-br relative overflow-hidden transition',
      colorOf(c.code || c.name), state === 'past' && 'opacity-45 saturate-50', state === 'now' && 'ring-4 ring-amber-300 scale-[1.01]', onClick && 'active:scale-[.98]')}>
      {state === 'now' && <span className="absolute top-2 right-2 rounded-full bg-white/90 text-rose-600 text-[11px] font-extrabold px-2 py-0.5 animate-pulse">● ĐANG HỌC</span>}
      {state === 'next' && <span className="absolute top-2 right-2 rounded-full bg-white/90 text-indigo-700 text-[11px] font-extrabold px-2 py-0.5">TIẾP THEO</span>}
      <div className="font-extrabold leading-tight pr-20">{c.name || c.code}</div>
      <div className={cx('text-sm opacity-95 mt-1 flex flex-wrap gap-x-3 gap-y-0.5', compact && 'text-xs')}>
        {t.start && <span>🕐 {t.start}{t.end && ` – ${t.end}`}</span>}
        {c.p1 && <span>Tiết {c.p1}{c.p2 && c.p2 !== c.p1 ? `–${c.p2}` : ''}</span>}
        {c.room && <span className="font-bold">📍 {c.room}</span>}
        {!compact && c.code && <span className="opacity-80">{c.code}{c.group ? ` · ${c.group}` : ''}</span>}
      </div>
    </button>
  );
}

export function ClassDetail({ c, periods }) {
  const t = timeOf(c, periods);
  const rows = [['Môn học', c.name], ['Mã môn', c.code], ['Lớp / nhóm', c.group], ['Số tín chỉ', c.credits], ['Thời gian', `${DAYN[c.day] || ''}${c.p1 ? `, tiết ${c.p1}${c.p2 && c.p2 !== c.p1 ? '–' + c.p2 : ''}` : ''}${t.start ? ` (${t.start}${t.end ? ' – ' + t.end : ''})` : ''}`],
    ['Phòng', c.room], ['Giảng viên', c.teacher], ['Ngày học', c.start ? `${c.start.split('-').reverse().join('/')} → ${(c.end || '').split('-').reverse().join('/')}` : ''], ['Loại', c.type]].filter(r => r[1]);
  const extra = Object.entries(c.raw || {}).filter(([k, v]) => !rows.some(r => String(r[1]) === v));
  return (
    <div className="space-y-1 text-sm">
      {rows.map(([k, v]) => <div key={k} className="flex gap-3 py-1 border-b"><span className="w-28 shrink-0 text-slate-500">{k}</span><b>{v}</b></div>)}
      {extra.length > 0 && <details className="pt-2"><summary className="text-xs text-slate-500 cursor-pointer">Cột khác trên portal</summary>
        {extra.map(([k, v]) => <div key={k} className="flex gap-3 py-1 border-b text-xs"><span className="w-28 shrink-0 text-slate-500">{k}</span><span>{v}</span></div>)}</details>}
      {!t.start && c.p1 && <p className="text-xs text-amber-700 mt-2">Chưa biết giờ của tiết {c.p1}. Vào Cài đặt → Giờ tiết học để nhập.</p>}
    </div>
  );
}

export function TermPicker({ terms, value, onChange }) {
  if (!terms || terms.length < 2) return null;
  return <Select value={value} onChange={e => onChange(e.target.value)} className="!w-auto !py-1.5 text-sm !text-slate-800 !bg-white">
    {terms.map(t => <option key={t} value={t}>{t || 'Chưa rõ học kỳ'}</option>)}</Select>;
}

export function NoData({ what, go }) {
  return (
    <div className="card relative overflow-hidden rounded-3xl bg-white/95 p-6 text-center shadow-soft">
      <div className="text-5xl floaty">🔄</div>
      <p className="font-bold mt-2">Chưa có {what}.</p>
      <p className="text-sm text-slate-600 mt-1">Đồng bộ từ portal trường bằng tiện ích trên máy tính, hoặc dán nội dung trang portal vào app.</p>
      <Button color="violet" className="mt-4" onClick={() => go('sync')}>🔄 Đi tới Đồng bộ</Button>
    </div>
  );
}
