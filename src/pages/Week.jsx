import { useState } from 'react';
import { useStudy } from '../lib/data.js';
import { Card, Button, Loading, ErrorBox, Empty, Modal, cx } from '../components/ui.jsx';
import { ClassCard, ClassDetail, TermPicker, NoData } from '../components/bits.jsx';
import { iso, addDays, mondayOf, classesOn, classState, fmt, fmtShort, DAYS, DAYN, timeOf, colorOf } from '../lib/time.js';
import { buildIcs } from '../lib/ics.js';

export default function Week({ go }) {
  const S = useStudy();
  const [mon, setMon] = useState(() => mondayOf(iso()));
  const [term, setTerm] = useState(null);
  const [open, setOpen] = useState(null);
  if (S.loading) return <Loading />;
  if (S.error) return <ErrorBox error={S.error} />;
  const snap = S.pick('tkb', term ?? undefined);
  if (!snap) return <NoData what="thời khóa biểu" go={go} />;
  const periods = S.settings.periods, rows = snap.rows, today = iso();
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(mon, i));
  const per = days.map(d => classesOn(rows, d));
  const maxP = Math.max(10, ...rows.map(c => Math.ceil(c.p2 || c.p1 || 0)));
  const showSun = per[6].length > 0, cols = showSun ? 7 : 6;
  const noDates = rows.every(c => !c.start);
  const exportIcs = () => {
    const blob = new Blob([buildIcs({ tkb: rows, exams: S.pick('lichthi')?.rows || [], periods, term: snap.term })], { type: 'text/calendar' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lich-hoc-${(snap.term || 'hcmus').replace(/\s+/g, '-')}.ics`; a.click();
  };
  return (
    <div className="space-y-4">
      <Card title={`Tuần ${fmtShort(days[0])} – ${fmtShort(days[6])}`} icon="📅" accent="from-sky-500 to-cyan-400"
        right={<TermPicker terms={S.terms.filter(t => S.snaps.some(s => s.kind === 'tkb' && s.term === t))} value={snap.term} onChange={setTerm} />}>
        <div className="flex items-center gap-2">
          <button onClick={() => setMon(addDays(mon, -7))} className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white font-bold" aria-label="Tuần trước">◀</button>
          <button onClick={() => setMon(mondayOf(today))} className="flex-1 rounded-2xl bg-sky-50 py-2.5 font-bold text-sky-800">{mon === mondayOf(today) ? '📍 Tuần này' : '↩ Về tuần này'}</button>
          <button onClick={() => setMon(addDays(mon, 7))} className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white font-bold" aria-label="Tuần sau">▶</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">{per.flat().length} buổi trong tuần</span>
          {noDates && <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">Portal không ghi ngày bắt đầu/kết thúc: mọi tuần hiện giống nhau</span>}
          <Button small color="ghost" onClick={exportIcs}>📆 Thêm vào lịch điện thoại (.ics)</Button>
        </div>
      </Card>

      {/* Máy tính: lưới tiết × thứ */}
      <div className="hidden lg:block card relative overflow-hidden rounded-3xl bg-white/95 shadow-soft p-3">
        <div className="grid gap-1" style={{ gridTemplateColumns: `64px repeat(${cols}, minmax(0,1fr))`, gridTemplateRows: `40px repeat(${maxP}, 46px)` }}>
          <div />
          {days.slice(0, cols).map((d, i) => <div key={d} className={cx('rounded-xl text-center text-sm font-bold grid place-items-center', d === today ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-700')}>{DAYS[i + 2]} · {fmtShort(d)}</div>)}
          {Array.from({ length: maxP }, (_, k) => <div key={k} className="text-[11px] text-slate-500 text-right pr-2 leading-tight pt-1" style={{ gridColumn: 1, gridRow: k + 2 }}>
            <b>Tiết {k + 1}</b><br />{periods[k]?.[0] || ''}</div>)}
          {per.slice(0, cols).flatMap((list, i) => list.map((c, j) => (
            <button key={i + '-' + j} onClick={() => setOpen(c)} title={c.name}
              className={cx('rounded-xl p-1.5 text-left text-white text-xs bg-gradient-to-br overflow-hidden shadow hover:brightness-110', colorOf(c.code || c.name),
                days[i] < today && 'opacity-50', days[i] === today && classState(c, periods, list) === 'now' && 'ring-4 ring-amber-300')}
              style={{ gridColumn: i + 2, gridRow: `${Math.floor(c.p1 || 1) + 1} / span ${Math.max(1, Math.ceil(c.p2 || c.p1 || 1) - Math.floor(c.p1 || 1) + 1)}` }}>
              <div className="font-bold leading-tight line-clamp-2">{c.name || c.code}</div>
              {c.room && <div className="font-extrabold mt-0.5">📍 {c.room}</div>}
              <div className="opacity-90">{timeOf(c, periods).start}{timeOf(c, periods).end && `–${timeOf(c, periods).end}`}</div>
            </button>)))}
        </div>
      </div>

      {/* Điện thoại: danh sách theo ngày */}
      <div className="lg:hidden space-y-3">
        {days.map((d, i) => (per[i].length || d === today) && (
          <div key={d} className={cx('card relative overflow-hidden rounded-3xl bg-white/95 shadow-soft p-3', d === today && 'ring-2 ring-indigo-400')}>
            <div className="flex items-center gap-2 mb-2"><b className={cx(d === today && 'text-indigo-700')}>{DAYN[i + 2]}</b><span className="text-sm text-slate-500">{fmt(d)}</span>
              {d === today && <span className="ml-auto rounded-full bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5">HÔM NAY</span>}</div>
            <div className="space-y-2">{per[i].length ? per[i].map((c, j) => <ClassCard key={j} c={c} periods={periods} state={d === today ? classState(c, periods, per[i]) : d < today ? 'past' : null} onClick={() => setOpen(c)} />)
              : <p className="text-sm text-slate-500">Không có lịch học</p>}</div>
          </div>))}
        {!per.flat().length && <Card><Empty icon="🏖️" text="Tuần này không có lịch học" /></Card>}
      </div>
      <p className="text-xs text-slate-600 bg-white/80 rounded-xl px-3 py-2">Dữ liệu lấy từ portal lúc {new Date(snap.captured_at).toLocaleString('vi-VN')}. Giờ của từng tiết sửa ở Cài đặt nếu chưa đúng với trường.</p>
      {open && <Modal title="Chi tiết buổi học" onClose={() => setOpen(null)}><ClassDetail c={open} periods={periods} /></Modal>}
    </div>
  );
}
