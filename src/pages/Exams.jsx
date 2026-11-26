import { useState } from 'react';
import { useStudy } from '../lib/data.js';
import { Card, Loading, ErrorBox, Empty, Modal, cx } from '../components/ui.jsx';
import { TermPicker, NoData } from '../components/bits.jsx';
import { fmt, untilText, daysUntil, DAYN, dowOf } from '../lib/time.js';

export default function Exams({ go }) {
  const S = useStudy();
  const [term, setTerm] = useState(null); const [open, setOpen] = useState(null); const [past, setPast] = useState(false);
  if (S.loading) return <Loading />;
  if (S.error) return <ErrorBox error={S.error} />;
  const snap = S.pick('lichthi', term ?? undefined);
  if (!snap) return <NoData what="lịch thi" go={go} />;
  const rows = [...snap.rows].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '').localeCompare(b.time || ''));
  const up = rows.filter(e => !e.date || daysUntil(e.date) >= 0), done = rows.filter(e => e.date && daysUntil(e.date) < 0);
  const next = up.find(e => e.date);
  const Item = ({ e }) => {
    const n = e.date ? daysUntil(e.date) : null;
    return (
      <button onClick={() => setOpen(e)} className={cx('w-full text-left flex items-center gap-3 p-3 rounded-2xl ring-1 transition hover:shadow', n != null && n < 0 ? 'bg-slate-50 ring-slate-200 opacity-60' : n != null && n <= 3 ? 'bg-rose-50 ring-rose-200' : 'bg-white ring-orange-100')}>
        <div className={cx('w-16 shrink-0 rounded-2xl text-center py-2 font-extrabold text-white bg-gradient-to-b', n != null && n <= 3 && n >= 0 ? 'from-rose-500 to-red-600' : 'from-orange-400 to-amber-500')}>
          {e.date ? <><div className="text-[10px] opacity-90">{DAYN[dowOf(e.date)].replace('Thứ ', 'T').replace('Chủ nhật', 'CN')}</div><div className="text-xl leading-none">{e.date.slice(8, 10)}</div><div className="text-[10px]">tháng {+e.date.slice(5, 7)}</div></> : <div className="text-xs py-2">Chưa rõ ngày</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold">{e.name || e.code}</div>
          <div className="text-sm text-slate-700 flex flex-wrap gap-x-3">{(e.time || e.timeText) && <span>🕐 {e.time || e.timeText}</span>}{e.room && <b>📍 {e.room}</b>}{e.seat && <span>SBD {e.seat}</span>}{e.form && <span>{e.form}</span>}</div>
        </div>
        {e.date && <span className={cx('text-xs font-extrabold whitespace-nowrap', n <= 3 && n >= 0 ? 'text-rose-600' : 'text-slate-600')}>{untilText(e.date)}</span>}
      </button>);
  };
  return (
    <div className="space-y-4">
      {next && <div className="card relative overflow-hidden rounded-3xl p-5 text-white shadow-soft bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400">
        <div className="absolute -right-3 -bottom-6 text-8xl opacity-20">📝</div>
        <div className="font-bold opacity-95">Môn thi gần nhất</div>
        <div className="text-2xl font-extrabold mt-1">{next.name || next.code}</div>
        <div className="mt-1">{DAYN[dowOf(next.date)]}, {fmt(next.date)}{next.time && ` lúc ${next.time}`}{next.room && ` · phòng ${next.room}`}</div>
        <div className="mt-3 inline-block rounded-2xl bg-white/25 px-4 py-2 text-xl font-extrabold">{daysUntil(next.date) === 0 ? '🔥 Hôm nay thi' : `⏳ ${untilText(next.date)}`}</div>
      </div>}
      <Card title={`Lịch thi ${snap.term}`} icon="📝" accent="from-rose-500 to-orange-400" right={<TermPicker terms={S.terms.filter(t => S.snaps.some(s => s.kind === 'lichthi' && s.term === t))} value={snap.term} onChange={setTerm} />}>
        <div className="space-y-2">{up.length ? up.map((e, i) => <Item key={i} e={e} />) : <Empty icon="🎉" text="Đã thi xong hết các môn trong học kỳ này" />}</div>
        {done.length > 0 && <button onClick={() => setPast(!past)} className="mt-3 text-sm font-bold text-slate-600">{past ? '▲ Ẩn' : '▼ Xem'} {done.length} môn đã thi</button>}
        {past && <div className="space-y-2 mt-2">{done.map((e, i) => <Item key={i} e={e} />)}</div>}
      </Card>
      <p className="text-xs text-slate-600 bg-white/80 rounded-xl px-3 py-2">Lấy từ portal lúc {new Date(snap.captured_at).toLocaleString('vi-VN')}. Có thông báo đẩy: tối hôm trước và sáng ngày thi. Luôn đối chiếu lại portal trước khi đi thi.</p>
      {open && <Modal title="Chi tiết lịch thi" onClose={() => setOpen(null)}>
        <div className="space-y-1 text-sm">{[['Môn', open.name], ['Mã môn', open.code], ['Lớp/nhóm', open.group], ['Ngày thi', open.date && `${DAYN[dowOf(open.date)]}, ${fmt(open.date)}`], ['Giờ', open.time || open.timeText],
          ['Phòng', open.room], ['Hình thức', open.form], ['Số báo danh', open.seat], ['Thời lượng', open.duration]].filter(r => r[1]).map(([k, v]) => <div key={k} className="flex gap-3 py-1 border-b"><span className="w-28 text-slate-500">{k}</span><b>{v}</b></div>)}
          {Object.entries(open.raw || {}).length > 0 && <details className="pt-2"><summary className="text-xs text-slate-500 cursor-pointer">Cột gốc trên portal</summary>
            {Object.entries(open.raw).map(([k, v]) => <div key={k} className="flex gap-3 py-1 border-b text-xs"><span className="w-28 text-slate-500">{k}</span><span>{v}</span></div>)}</details>}
        </div></Modal>}
    </div>
  );
}
