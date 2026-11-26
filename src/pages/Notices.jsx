import { useState } from 'react';
import { supabase, q, rpc } from '../lib/supabase.js';
import { useStudy } from '../lib/data.js';
import { Card, Input, Loading, ErrorBox, Empty, Button, useLoad, cx } from '../components/ui.jsx';
import { ago, dt } from '../lib/time.js';

const SRC = { portal: ['🎓', 'Portal', 'bg-indigo-100 text-indigo-800'], truong: ['🏫', 'Trường', 'bg-sky-100 text-sky-800'], khoa: ['⚛️', 'Khoa Vật lý', 'bg-violet-100 text-violet-800'] };
const IMPORTANT = /thông báo|học phần|lịch thi|thi cuối|thi giữa|học phí|đăng ký|học bổng|nghỉ học|lịch nghỉ|tốt nghiệp|thời khóa biểu|học kỳ/i;

export default function Notices() {
  const S = useStudy();
  const [src, setSrc] = useState(''); const [s, setS] = useState(''); const [imp, setImp] = useState(false);
  const list = useLoad(() => q(supabase.from('notices').select('*').order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(300)), []);
  const seenAll = async () => { await rpc('mark_seen', { p_what: 'notices' }); list.reload(); S.reload(); };
  const open = async n => { if (!n.seen) { await rpc('mark_seen', { p_what: 'notices', p_ids: [n.id] }); list.reload(); S.reload(); } };
  const rows = (list.data || []).filter(n => (!src || n.source === src) && (!imp || IMPORTANT.test(n.title)) && (!s || n.title.toLowerCase().includes(s.toLowerCase())));
  const unseen = (list.data || []).filter(n => !n.seen).length;
  return (
    <div className="space-y-4">
      <Card title="Thông báo" icon="📢" accent="from-amber-500 to-yellow-400" right={unseen > 0 && <Button small color="ghost" onClick={seenAll}>✓ Đã xem hết ({unseen})</Button>}>
        <div className="flex flex-wrap gap-2">
          {[['', 'Tất cả'], ...Object.entries(SRC).map(([k, v]) => [k, v[0] + ' ' + v[1]])].map(([k, t]) => (
            <button key={k} onClick={() => setSrc(k)} className={cx('rounded-full px-3 py-1.5 text-sm font-bold', src === k ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200')}>{t}</button>))}
          <button onClick={() => setImp(!imp)} className={cx('rounded-full px-3 py-1.5 text-sm font-bold', imp ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200')}>⭐ Chỉ tin học vụ</button>
        </div>
        <Input className="mt-3" value={s} onChange={e => setS(e.target.value)} placeholder="🔎 Tìm theo tiêu đề" />
      </Card>
      <Card bodyClass="p-0">
        {list.loading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : !rows.length ? <Empty icon="📭" text="Chưa có thông báo nào" /> : (
          <div className="divide-y">{rows.map(n => (
            <a key={n.id} href={n.url || undefined} target="_blank" rel="noreferrer" onClick={() => open(n)} className={cx('flex items-start gap-3 px-4 py-3 hover:bg-amber-50', !n.seen && 'bg-amber-50/60')}>
              <span className="text-2xl">{SRC[n.source][0]}</span>
              <div className="flex-1 min-w-0">
                <div className={cx('leading-snug', !n.seen ? 'font-extrabold' : 'font-semibold')}>{n.title}</div>
                {n.summary && <div className="text-sm text-slate-600 line-clamp-2 mt-0.5">{n.summary}</div>}
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className={cx('rounded-full px-2 py-0.5 font-bold', SRC[n.source][2])}>{SRC[n.source][1]}</span>
                  <span title={dt(n.published_at || n.created_at)}>{ago(n.published_at || n.created_at)}</span>
                  {IMPORTANT.test(n.title) && <span className="text-rose-600 font-bold">⭐ học vụ</span>}
                </div>
              </div>
              {!n.seen && <span className="w-2.5 h-2.5 mt-2 rounded-full bg-rose-500" />}
            </a>))}</div>)}
      </Card>
      <p className="text-xs text-slate-600 bg-white/80 rounded-xl px-3 py-2">🏫 Tin trường và ⚛️ tin Khoa Vật lý – Vật lý kỹ thuật được máy chạy ngầm tự lấy mỗi 30 phút. 🎓 Thông báo trên portal được lấy khi tiện ích đồng bộ (bạn mở portal trên máy tính) hoặc khi bạn dán trang thông báo. Thông báo đẩy về điện thoại chỉ gửi tin học vụ của trường và mọi tin của khoa/portal.</p>
    </div>
  );
}
