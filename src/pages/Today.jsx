import { useEffect, useState } from 'react';
import { supabase, q } from '../lib/supabase.js';
import { useStudy } from '../lib/data.js';
import { Card, Stat, Loading, ErrorBox, Empty, Modal, useLoad, cx } from '../components/ui.jsx';
import { ClassCard, ClassDetail, NoData } from '../components/bits.jsx';
import { iso, addDays, classesOn, classState, timeOf, minsTo, fmt, untilText, daysUntil, DAYN, dowOf, ago, dt, mondayOf } from '../lib/time.js';
import { gpa, rank10 } from '../lib/portal.js';
import { effectiveTheme, daysTo } from '../lib/theme.js';

const GREET = {
  xmas: ['🎅', 'from-red-600 via-rose-600 to-emerald-600', 'Giáng sinh', 'Giáng sinh an lành! 🎄', 'Chúc mừng mùa lễ hội! 🎉', '🎁🦌🛷'],
  tet: ['🧧', 'from-red-700 via-red-600 to-amber-500', 'Tết Nguyên Đán', 'Chúc mừng năm mới! 🧧', 'Chúc mừng năm mới! 🧧', '🌼🌸🧨'],
  le304: ['⭐', 'from-red-700 via-red-600 to-yellow-500', 'ngày 30/4', 'Mừng ngày Giải phóng miền Nam 30/4 ⭐', 'Mừng ngày Quốc tế Lao động 1/5 💪', '⭐🕊️🎆'],
  trungthu: ['🥮', 'from-indigo-800 via-purple-700 to-amber-500', 'Tết Trung Thu', 'Trung Thu vui vẻ! 🌕', 'Trung Thu vui vẻ! 🌕', '🌕🏮🐇'],
  halloween: ['🎃', 'from-orange-600 via-purple-700 to-slate-900', 'Halloween', 'Halloween vui vẻ! 🎃', 'Halloween vui vẻ! 🎃', '🎃🦇👻']
};

export default function Today({ go }) {
  const S = useStudy();
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30e3); return () => clearInterval(t); }, []);
  const [open, setOpen] = useState(null);
  const extra = useLoad(async () => {
    const [notices, tasks] = await Promise.all([
      q(supabase.from('notices').select('id,source,title,url,published_at,created_at,seen').order('created_at', { ascending: false }).limit(6)),
      q(supabase.from('tasks').select('*').eq('done', false).order('due_at', { ascending: true, nullsFirst: false }).limit(5))]);
    return { notices, tasks };
  }, []);
  if (S.loading) return <Loading />;
  if (S.error) return <ErrorBox error={S.error} />;

  const periods = S.settings.periods, today = iso(), tkb = S.pick('tkb')?.rows || [];
  const list = classesOn(tkb, today), tomorrow = classesOn(tkb, addDays(today, 1));
  const exams = (S.pick('lichthi')?.rows || []).filter(e => e.date && daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  const g = gpa(S.allGrades || []);
  const weekCount = [0, 1, 2, 3, 4, 5, 6].reduce((n, i) => n + classesOn(tkb, addDays(mondayOf(today), i)).length, 0);
  const credits = [...new Map(tkb.map(c => [c.code || c.name, c.credits || 0])).values()].reduce((a, b) => a + b, 0);
  const th = effectiveTheme(), G = GREET[th], xd = G ? daysTo(th) : null;
  const h = new Date().getHours(), hello = h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const next = list.find(c => classState(c, periods, list) === 'next'), nowC = list.find(c => classState(c, periods, list) === 'now');
  const stale = S.status?.last_sync && (Date.now() - new Date(S.status.last_sync)) / 864e5 > 3;
  const noData = !S.snaps?.length;

  return (
    <div className="space-y-4">
      {G ? (
        <div className={cx('card relative overflow-hidden rounded-3xl p-4 text-white shadow-soft bg-gradient-to-r flex items-center gap-3', G[1])}>
          <span className="text-4xl floaty">{G[0]}</span>
          <div className="flex-1"><div className="text-lg font-extrabold">{xd === 0 ? G[3] : xd > 0 && xd <= 40 ? `Còn ${xd} ngày nữa là ${G[2]}` : xd < 0 ? G[4] : G[3]}</div>
            <div className="text-sm opacity-95">{hello}! Hôm nay {DAYN[dowOf(today)]}, {fmt(today)} · chúc bạn học tốt, thi đạt điểm cao ✨</div></div>
          <span className="text-3xl hidden sm:block">{G[5]}</span>
        </div>
      ) : (
        <div className="card relative overflow-hidden rounded-3xl p-4 text-white shadow-soft bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 flex items-center gap-3">
          <span className="text-4xl floaty">👋</span>
          <div className="flex-1"><div className="text-lg font-extrabold">{hello}!</div>
            <div className="text-sm opacity-95">Hôm nay {DAYN[dowOf(today)]}, {fmt(today)}{list.length ? ` · ${list.length} buổi học` : ' · không có lịch học'}</div></div>
        </div>)}

      {S.unseenChanges > 0 && <button onClick={() => go('changes')} className="w-full text-left rounded-2xl p-3 bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white font-bold shadow-soft flex items-center gap-3">
        <span className="text-2xl wiggle">🔔</span><span className="flex-1">Có {S.unseenChanges} thay đổi lịch học / lịch thi / điểm chưa xem</span><span>›</span></button>}
      {stale && <button onClick={() => go('sync')} className="w-full text-left rounded-2xl p-3 bg-amber-100 text-amber-900 font-semibold ring-1 ring-amber-300 flex items-center gap-3">
        <span className="text-2xl">⏳</span><span className="flex-1">Đã {Math.floor((Date.now() - new Date(S.status.last_sync)) / 864e5)} ngày chưa đồng bộ portal. Mở portal trên máy tính (có tiện ích) hoặc dán lại để cập nhật.</span><span>›</span></button>}
      {noData && <NoData what="dữ liệu thời khóa biểu, lịch thi, điểm" go={go} />}

      {!noData && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon="📅" label="Buổi học tuần này" value={weekCount} format={String} grad="from-sky-500 to-indigo-500" />
        <Stat icon="📚" label="Tín chỉ học kỳ" value={credits} format={String} sub={`${new Set(tkb.map(c => c.code || c.name)).size} môn`} grad="from-violet-500 to-fuchsia-500" />
        <Stat icon="📝" label="Lịch thi sắp tới" value={exams.length} format={String} sub={exams[0] ? `${untilText(exams[0].date)}: ${exams[0].name || exams[0].code}` : 'Chưa có'} grad="from-rose-500 to-orange-400" />
        <Stat icon="🎓" label="Điểm TB tích lũy" value={g.avg10 == null ? '—' : g.avg10.toFixed(2)} sub={g.avg10 == null ? 'Chưa có điểm' : `${rank10(g.avg10)} · ${g.earned} TC đạt`} grad="from-emerald-500 to-teal-400" />
      </div>}

      {!noData && <div className="grid lg:grid-cols-2 gap-4">
        <Card title={`Hôm nay · ${DAYN[dowOf(today)]} ${fmt(today).slice(0, 5)}`} icon="🕐" accent="from-indigo-500 to-violet-500">
          {nowC && <p className="mb-2 text-sm font-bold text-rose-600">● Đang học: {nowC.name} {nowC.room && `· phòng ${nowC.room}`}</p>}
          {next && !nowC && timeOf(next, periods).start && <p className="mb-2 text-sm font-bold text-indigo-700">⏭️ Còn {fmtMin(minsTo(timeOf(next, periods).start))} nữa vào học {next.name}{next.room && ` · phòng ${next.room}`}</p>}
          <div className="space-y-2">{list.length ? list.map((c, i) => <ClassCard key={i} c={c} periods={periods} state={classState(c, periods, list)} onClick={() => setOpen(c)} />)
            : <Empty icon="🏖️" text="Hôm nay không có lịch học" />}</div>
          {tomorrow.length > 0 && <div className="mt-4"><h4 className="font-bold text-sm text-slate-600 mb-2">Ngày mai ({DAYN[dowOf(addDays(today, 1))]})</h4>
            <div className="space-y-2">{tomorrow.map((c, i) => <ClassCard key={i} c={c} periods={periods} compact onClick={() => setOpen(c)} />)}</div></div>}
        </Card>
        <div className="space-y-4">
          <Card title="Lịch thi sắp tới" icon="📝" accent="from-rose-500 to-orange-400" right={<button className="text-sm font-bold" onClick={() => go('exams')}>Xem hết ›</button>}>
            {exams.length ? exams.slice(0, 4).map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className={cx('w-14 shrink-0 rounded-xl text-center py-1 font-extrabold text-white bg-gradient-to-b', daysUntil(e.date) <= 3 ? 'from-rose-500 to-red-600' : 'from-orange-400 to-amber-500')}>
                  <div className="text-lg leading-none">{e.date.slice(8, 10)}</div><div className="text-[10px]">th {e.date.slice(5, 7)}</div></div>
                <div className="flex-1 min-w-0"><div className="font-bold truncate">{e.name || e.code}</div>
                  <div className="text-xs text-slate-600">{[e.time || e.timeText, e.room && `phòng ${e.room}`, e.seat && `SBD ${e.seat}`].filter(Boolean).join(' · ')}</div></div>
                <span className={cx('text-xs font-extrabold whitespace-nowrap', daysUntil(e.date) <= 3 ? 'text-rose-600' : 'text-slate-600')}>{untilText(e.date)}</span>
              </div>)) : <Empty icon="🎉" text="Chưa có lịch thi sắp tới" />}
          </Card>
          <Card title="Việc cần làm" icon="✅" accent="from-lime-500 to-green-500" right={<button className="text-sm font-bold" onClick={() => go('tasks')}>Xem hết ›</button>}>
            {extra.data?.tasks?.length ? extra.data.tasks.map(t => <div key={t.id} className="flex justify-between gap-2 py-1.5 border-b last:border-0 text-sm">
              <span className="font-semibold">{t.title}{t.course && <span className="text-slate-500 font-normal"> · {t.course}</span>}</span>
              <span className={cx('whitespace-nowrap font-bold', t.due_at && new Date(t.due_at) - Date.now() < 864e5 ? 'text-rose-600' : 'text-slate-500')}>{t.due_at ? dt(t.due_at).slice(0, 16) : ''}</span></div>)
              : <Empty icon="🌈" text="Không có việc nào đang chờ" />}
          </Card>
        </div>
      </div>}

      <Card title="Thông báo mới" icon="📢" accent="from-amber-500 to-yellow-400" right={<button className="text-sm font-bold" onClick={() => go('notices')}>Xem hết ›</button>}>
        {extra.loading ? <Loading /> : extra.data?.notices?.length ? extra.data.notices.map(n => (
          <a key={n.id} href={n.url || '#notices'} target={n.url ? '_blank' : undefined} rel="noreferrer" className="flex items-start gap-2 py-2 border-b last:border-0">
            <span>{{ portal: '🎓', truong: '🏫', khoa: '⚛️' }[n.source]}</span>
            <span className="flex-1 text-sm"><span className={cx(!n.seen && 'font-bold')}>{n.title}</span><span className="block text-xs text-slate-500">{ago(n.published_at || n.created_at)}</span></span>
            {!n.seen && <span className="w-2.5 h-2.5 mt-1.5 rounded-full bg-rose-500" />}</a>)) : <Empty icon="📭" text="Chưa có thông báo. Máy chạy ngầm sẽ tự lấy tin trường và khoa mỗi 30 phút." />}
      </Card>
      {open && <Modal title="Chi tiết buổi học" onClose={() => setOpen(null)}><ClassDetail c={open} periods={periods} /></Modal>}
    </div>
  );
}
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)} giờ ${m % 60} phút` : `${m} phút`;
