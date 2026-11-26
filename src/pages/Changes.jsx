import { supabase, q, rpc } from '../lib/supabase.js';
import { useStudy } from '../lib/data.js';
import { Card, Loading, ErrorBox, Empty, Button, useLoad, cx } from '../components/ui.jsx';
import { ago, dt } from '../lib/time.js';

const KIND = { tkb: ['📅', 'Thời khóa biểu', 'from-sky-500 to-indigo-500'], lichthi: ['📝', 'Lịch thi', 'from-rose-500 to-orange-400'], diem: ['🎓', 'Điểm', 'from-emerald-500 to-teal-400'] };
const TYPE = { room: '🚪', time: '🕐', dates: '📆', teacher: '👩‍🏫', add: '➕', remove: '➖', change: '✏️', grade: '🎯' };

export default function Changes() {
  const S = useStudy();
  const list = useLoad(() => q(supabase.from('changes').select('*').order('created_at', { ascending: false }).limit(200)), []);
  const seenAll = async () => { await rpc('mark_seen', { p_what: 'changes' }); list.reload(); S.reload(); };
  const unseen = (list.data || []).filter(c => !c.seen).length;
  return (
    <div className="space-y-4">
      <Card title="Thay đổi lịch học, lịch thi, điểm" icon="🔔" accent="from-fuchsia-500 to-pink-500" right={unseen > 0 && <Button small color="ghost" onClick={seenAll}>✓ Đã xem hết ({unseen})</Button>}>
        <p className="text-sm text-slate-600">Mỗi lần đồng bộ, app so với lần trước và ghi lại: đổi phòng, đổi giờ/thứ, đổi ngày học, đổi giảng viên, môn mới/bị bỏ, lịch thi mới/đổi, có điểm mới. Có thay đổi là gửi thông báo đẩy về điện thoại (trong vòng 30 phút).</p>
      </Card>
      {list.loading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : !list.data.length ? <Card><Empty icon="😌" text="Chưa có thay đổi nào. Lần đồng bộ đầu tiên chỉ ghi nhận, các lần sau mới so sánh." /></Card> : (
        <div className="space-y-3">{list.data.map(c => (
          <div key={c.id} className={cx('card relative overflow-hidden rounded-3xl bg-white/95 shadow-soft p-4 flex gap-3', !c.seen && 'ring-2 ring-fuchsia-300')}>
            <div className={cx('w-12 h-12 shrink-0 rounded-2xl grid place-items-center text-2xl text-white bg-gradient-to-br', (KIND[c.kind] || KIND.tkb)[2])}>{TYPE[c.type] || (KIND[c.kind] || KIND.tkb)[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold leading-snug">{c.title}</div>
              {(c.detail || []).map((d, i) => <div key={i} className={cx('text-sm', d.startsWith('Sau') ? 'text-emerald-700 font-semibold' : d.startsWith('Trước') ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-700')}>{d}</div>)}
              <div className="text-xs text-slate-500 mt-1">{(KIND[c.kind] || KIND.tkb)[1]}{c.term && ` · ${c.term}`} · <span title={dt(c.created_at)}>{ago(c.created_at)}</span>{c.pushed && ' · đã báo về điện thoại'}</div>
            </div>
            {!c.seen && <span className="w-2.5 h-2.5 mt-2 rounded-full bg-rose-500" />}
          </div>))}</div>)}
    </div>
  );
}
