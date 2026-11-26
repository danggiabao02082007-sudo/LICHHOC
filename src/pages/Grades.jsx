import { useState } from 'react';
import { useStudy, saveSettings } from '../lib/data.js';
import { Card, Loading, ErrorBox, Stat, cx, useToast } from '../components/ui.jsx';
import { NoData } from '../components/bits.jsx';
import { gpa, to4, rank10, excludedByDefault, norm } from '../lib/portal.js';

export default function Grades({ go }) {
  const S = useStudy(); const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (S.loading) return <Loading />;
  if (S.error) return <ErrorBox error={S.error} />;
  const rows = S.allGrades || [];
  if (!rows.length) return <NoData what="kết quả học tập" go={go} />;
  const ex = S.settings.grade_exclude || null;                         // danh sách môn bạn chọn tay; null = mặc định
  const isEx = r => ex ? ex.includes(norm(r.code || r.name)) : excludedByDefault(r.name);
  const toggle = async r => {
    setBusy(true);
    const cur = ex || rows.filter(x => excludedByDefault(x.name)).map(x => norm(x.code || x.name));
    const k = norm(r.code || r.name), next = cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k];
    try { await saveSettings({ grade_exclude: next }, S.settings); await S.reload(); } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };
  const all = gpa(rows, isEx);
  const byTerm = rows.reduce((m, r) => ((m[r.term || 'Chưa rõ học kỳ'] ||= []).push(r), m), {});
  const terms = Object.keys(byTerm).sort().reverse();
  const tg = terms.map(t => ({ t, g: gpa(byTerm[t], isEx) })).filter(x => x.g.avg10 != null).reverse();
  const max = 10;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon="🎓" label="Điểm TB tích lũy (hệ 10)" value={all.avg10 == null ? '—' : all.avg10.toFixed(2)} sub={rank10(all.avg10)} grad="from-emerald-500 to-teal-400" />
        <Stat icon="⭐" label="Quy đổi hệ 4 (tham khảo)" value={all.avg4 == null ? '—' : all.avg4.toFixed(2)} grad="from-indigo-500 to-violet-500" />
        <Stat icon="📚" label="Tín chỉ đã đạt" value={all.earned} format={String} sub={`${all.credits} TC có điểm`} grad="from-sky-500 to-cyan-400" />
        <Stat icon="📝" label="Môn có điểm" value={rows.filter(r => r.grade != null).length} format={String} sub={`${rows.filter(r => r.grade == null).length} môn chưa có điểm`} grad="from-amber-500 to-orange-400" />
      </div>
      {tg.length > 1 && <Card title="Điểm trung bình theo học kỳ" icon="📈" accent="from-emerald-500 to-teal-400">
        <div className="flex items-end gap-3 h-44">{tg.map(({ t, g }) => (
          <div key={t} className="flex-1 flex flex-col items-center justify-end h-full">
            <b className="text-sm">{g.avg10.toFixed(2)}</b>
            <div className="w-full max-w-[56px] rounded-t-xl bg-gradient-to-t from-emerald-500 to-lime-400 grow-bar" style={{ height: `${g.avg10 / max * 100}%` }} />
            <span className="text-[10px] text-slate-600 mt-1 text-center leading-tight">{t.replace(' ', '\n')}</span>
          </div>))}</div>
      </Card>}
      {terms.map(t => { const g = gpa(byTerm[t], isEx); return (
        <Card key={t} title={t} icon="📘" accent="from-teal-500 to-emerald-400" right={g.avg10 != null && <span className="rounded-full bg-white/25 px-3 py-1 text-sm font-bold">TB {g.avg10.toFixed(2)} · {g.credits} TC</span>} bodyClass="p-0">
          <div className="divide-y">{byTerm[t].map((r, i) => (
            <div key={i} className={cx('flex items-center gap-3 px-4 py-2.5', isEx(r) && 'opacity-60')}>
              <div className="flex-1 min-w-0"><div className="font-semibold">{r.name || r.code}</div>
                <div className="text-xs text-slate-500">{[r.code, r.credits && `${r.credits} TC`, r.letter, r.result].filter(Boolean).join(' · ')}{isEx(r) && ' · không tính vào TB'}</div></div>
              <button disabled={busy} onClick={() => toggle(r)} className="text-[11px] font-bold rounded-full px-2 py-1 bg-slate-100 text-slate-600" title="Tính / không tính vào điểm trung bình">{isEx(r) ? '+ Tính TB' : '− Bỏ khỏi TB'}</button>
              <div className={cx('w-14 text-right text-lg font-extrabold', r.grade == null ? 'text-slate-400' : r.grade >= 8 ? 'text-emerald-600' : r.grade >= 5 ? 'text-sky-700' : 'text-rose-600')}>
                {r.grade == null ? '—' : r.grade}<div className="text-[10px] font-semibold text-slate-500">{r.grade != null && `hệ 4: ${to4(r.grade)}`}</div></div>
            </div>))}</div>
        </Card>); })}
      <p className="text-xs text-slate-600 bg-white/80 rounded-xl px-3 py-2">Điểm trung bình = tổng (điểm × tín chỉ) ÷ tổng tín chỉ, chỉ các môn đã có điểm. Mặc định không tính Giáo dục thể chất, Giáo dục quốc phòng (bấm "Tính TB" / "Bỏ khỏi TB" để chỉnh). Quy đổi hệ 4 và xếp loại theo thang thường dùng, <b>quy chế của trường có thể khác</b>: điểm chính thức luôn theo portal.</p>
    </div>
  );
}
