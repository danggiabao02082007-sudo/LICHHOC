import { useState } from 'react';
import { supabase, q, rpc, SB } from '../lib/supabase.js';
import { useStudy } from '../lib/data.js';
import { Card, Button, Input, Field, Loading, ErrorBox, Empty, useLoad, useToast, cx } from '../components/ui.jsx';
import { tablesFromText, extract, detectTerm, diff, hashRows, noticesFromLinks, dayName } from '../lib/portal.js';
import { ago, dt } from '../lib/time.js';

const KIND = { tkb: '📅 Thời khóa biểu', lichthi: '📝 Lịch thi', diem: '🎓 Kết quả học tập' };
const REPO = 'https://github.com/danggiabao02082007-sudo/LICHHOC';
const copy = async (t, toast) => { try { await navigator.clipboard.writeText(t); toast('Đã chép'); } catch { toast('Không chép tự động được, hãy bôi đen rồi chép', 'err'); } };

export default function Sync() {
  const S = useStudy(); const toast = useToast();
  const log = useLoad(() => q(supabase.from('sync_log').select('*').order('at', { ascending: false }).limit(15)), []);
  const [code, setCode] = useState(''); const [cron, setCron] = useState('');
  const newCode = async () => { try { const k = await rpc('new_sync_key', {}); setCode(btoa(JSON.stringify({ u: SB.url, a: SB.anon, k }))); S.reload(); } catch (e) { toast(e.message, 'err'); } };
  const newCron = async () => { try { setCron(await rpc('new_cron_key', {})); S.reload(); } catch (e) { toast(e.message, 'err'); } };
  const st = S.status || {};
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        {[['🔄', 'Đồng bộ portal gần nhất', st.last_sync, 'from-indigo-500 to-violet-500'], ['🤖', 'Máy chạy ngầm chạy gần nhất', st.last_cron, 'from-sky-500 to-cyan-500'], ['🔔', 'Thiết bị nhận thông báo', null, 'from-fuchsia-500 to-pink-500']].map(([i, t, v, g], k) => (
          <div key={t} className={cx('card relative overflow-hidden rounded-3xl p-4 text-white shadow-soft bg-gradient-to-br', g)}>
            <div className="text-sm font-semibold">{i} {t}</div>
            <div className="text-xl font-extrabold mt-1">{k === 2 ? `${st.devices || 0} máy` : v ? ago(v) : 'Chưa có'}</div>
            {k < 2 && v && <div className="text-xs opacity-90">{dt(v)}</div>}
          </div>))}
      </div>

      <Card title="Cách 1 · Tiện ích tự đồng bộ trên máy tính (khuyên dùng)" icon="🧩" accent="from-indigo-600 to-fuchsia-500">
        <ol className="space-y-3 text-sm">
          <li><b>1.</b> Trên Chrome máy tính, cài tiện ích <b>Tampermonkey</b> từ Chrome Web Store (trang chính thức: tampermonkey.net). Nếu Chrome yêu cầu, bật <b>"Cho phép tập lệnh người dùng"</b> trong trang quản lý tiện ích.</li>
          <li><b>2.</b> Bấm để cài tập lệnh đồng bộ: <a className="font-bold text-indigo-700 underline" href="lichhoc.user.js" target="_blank" rel="noreferrer">📥 Cài “LICHHOC – Đồng bộ portal HCMUS”</a> → Tampermonkey mở trang cài đặt → bấm <b>Install</b>.</li>
          <li><b>3.</b> Tạo mã kết nối rồi chép:
            <div className="mt-2 flex flex-wrap gap-2"><Button small color="violet" onClick={newCode}>🔑 Tạo mã kết nối</Button>
              {st.sync_key_at && <span className="text-xs text-slate-500 self-center">Mã hiện tại tạo {ago(st.sync_key_at)}. Tạo mã mới thì mã cũ hết hiệu lực.</span>}</div>
            {code && <div className="mt-2 rounded-2xl bg-indigo-50 p-3"><textarea readOnly value={code} className="w-full h-20 text-xs font-mono rounded-xl p-2 ring-1 ring-indigo-200" onFocus={e => e.target.select()} />
              <Button small className="mt-2" onClick={() => copy(code, toast)}>📋 Chép mã</Button><p className="text-xs text-rose-600 mt-1 font-semibold">Mã này cho phép gửi dữ liệu vào app của bạn. Không gửi cho người khác.</p></div>}</li>
          <li><b>4.</b> Vào <a className="font-bold text-indigo-700 underline" href="https://portal.hcmus.edu.vn" target="_blank" rel="noreferrer">portal.hcmus.edu.vn</a>, tự đăng nhập (giải captcha như bình thường). Góc phải dưới có nút <b>📚 LICHHOC</b> → dán mã → <b>Lưu</b> → <b>Đồng bộ ngay</b>.</li>
          <li><b>5.</b> Từ đó, mỗi lần bạn mở portal, tiện ích tự đọc trang thời khóa biểu, lịch thi, kết quả học tập, thông báo (tối đa 3 giờ/lần) và gửi về đây. Có thay đổi là điện thoại nhận thông báo.</li>
        </ol>
        <p className="text-xs text-slate-500 mt-3">Portal của trường bắt giải reCAPTCHA khi đăng nhập nên không thể để máy tự đăng nhập. Tiện ích chỉ chạy khi bạn đã đăng nhập, không đọc hay lưu mật khẩu portal.</p>
      </Card>

      <PasteBox S={S} toast={toast} onDone={log.reload} />

      <Card title="Máy chạy ngầm (tin trường, tin khoa, nhắc lịch, thông báo đẩy)" icon="🤖" accent="from-sky-600 to-cyan-500">
        <p className="text-sm">Chạy trên GitHub mỗi 30 phút: lấy tin mới của trường và Khoa Vật lý – VLKT, nhắc giờ học, ngày thi, hạn nộp bài, gửi thông báo khi lịch thay đổi. Cần cài <b>1 lần</b>:</p>
        <ol className="space-y-2 text-sm mt-2">
          <li><b>1.</b> <Button small color="sky" onClick={newCron}>🔑 Tạo khóa máy chạy ngầm</Button> {st.cron_key_at && <span className="text-xs text-slate-500">Khóa hiện tại tạo {ago(st.cron_key_at)}.</span>}
            {cron && <div className="mt-2 rounded-2xl bg-sky-50 p-3 text-xs"><code className="break-all">{cron}</code><br /><Button small className="mt-2" onClick={() => copy(cron, toast)}>📋 Chép khóa</Button>
              <p className="text-rose-600 font-semibold mt-1">Chỉ hiện 1 lần. Không gửi cho ai, kể cả qua chat.</p></div>}</li>
          <li><b>2.</b> Mở <a className="font-bold text-sky-700 underline" href={`${REPO}/settings/secrets/actions/new`} target="_blank" rel="noreferrer">GitHub → Secrets → New repository secret</a> và tạo 3 mục:
            <div className="mt-1 rounded-2xl bg-slate-50 p-2 text-xs space-y-1 font-mono">
              <div><b>CRON_KEY</b> = khóa vừa tạo ở bước 1</div>
              <div className="flex gap-2 items-center"><b>SB_URL</b> = <span className="break-all">{SB.url}</span> <button className="text-sky-700 font-bold" onClick={() => copy(SB.url, toast)}>chép</button></div>
              <div className="flex gap-2 items-center"><b>SB_ANON</b> = khóa công khai của app <button className="text-sky-700 font-bold" onClick={() => copy(SB.anon, toast)}>chép</button></div>
            </div></li>
          <li><b>3.</b> Mở <a className="font-bold text-sky-700 underline" href={`${REPO}/actions`} target="_blank" rel="noreferrer">GitHub → Actions</a> → "Dong bo tin va nhac lich" → <b>Run workflow</b> để chạy thử. Sau đó nó tự chạy mỗi 30 phút.</li>
          <li><b>4.</b> Vào <b>Cài đặt → Thông báo</b> bật thông báo trên điện thoại (iPhone: thêm app ra màn hình chính trước).</li>
        </ol>
      </Card>

      <Card title="Nhật ký đồng bộ" icon="📜" accent="from-slate-500 to-slate-400">
        {log.loading ? <Loading /> : log.error ? <ErrorBox error={log.error} /> : !log.data.length ? <Empty text="Chưa đồng bộ lần nào" /> : log.data.map(l => (
          <div key={l.id} className="flex justify-between gap-2 py-1.5 border-b last:border-0 text-sm">
            <span>{{ userscript: '🧩 Tiện ích', paste: '📋 Dán tay', cron: '🤖 Máy chạy ngầm' }[l.source]} · {dt(l.at)}</span>
            <span className="text-slate-600 text-right">{l.source === 'cron' ? `tin trường +${l.summary.truong || 0}, khoa +${l.summary.khoa || 0}, gửi ${l.summary.pushed || 0} thông báo${l.summary.errors ? `, ${l.summary.errors} lỗi` : ''}`
              : `${l.summary.saved || 0} bảng mới, ${l.summary.changes || 0} thay đổi, ${l.summary.notices || 0} thông báo mới`}</span></div>))}
      </Card>
    </div>
  );
}

// Cách 2: dán nội dung trang portal
function PasteBox({ S, toast, onDone }) {
  const [text, setText] = useState(''); const [res, setRes] = useState(null); const [term, setTerm] = useState(''); const [busy, setBusy] = useState(false);
  const read = () => {
    const tables = tablesFromText(text), x = extract(tables, text);
    // Trang thông báo dán vào: dòng có ngày + tiêu đề dài
    const notes = noticesFromLinks(text.split('\n').filter(l => !l.includes('\t') && /\d{1,2}\/\d{1,2}\/\d{4}/.test(l)).map(l => ({ text: l.replace(/\d{1,2}\/\d{1,2}\/\d{4}/, '').replace(/^[\s\-–:|]+|[\s\-–:|]+$/g, ''), href: '', context: l })));
    setTerm(detectTerm(text) || S.settings?.current_term || ''); setRes({ ...x, notes });
  };
  const save = async () => {
    setBusy(true);
    try {
      const prev = await rpc('latest_rows', { p_key: null });
      const items = res.items.map(it => { const old = prev.find(p => p.kind === it.kind && p.term === term); return { kind: it.kind, term, rows: it.rows, hash: hashRows(it.rows), changes: diff(it.kind, old ? old.rows : null, it.rows) }; });
      const r = await rpc('ingest', { p_key: null, p_items: items, p_notices: res.notes, p_source: 'paste', p_url: '' });
      toast(`Đã lưu: ${r.saved} bảng mới, ${r.changes} thay đổi, ${r.notices} thông báo mới`); setText(''); setRes(null); S.reload(); onDone();
    } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };
  return (
    <Card title="Cách 2 · Dán nội dung trang portal (dùng được trên điện thoại)" icon="📋" accent="from-amber-500 to-orange-500">
      <p className="text-sm">Mở trang <b>Thời khóa biểu</b>, <b>Lịch thi</b>, <b>Kết quả học tập</b> hoặc <b>Thông báo</b> trên portal → chọn hết (Ctrl+A, trên điện thoại: giữ ngón tay → Chọn tất cả) → Chép → dán vào đây.</p>
      <textarea value={text} onChange={e => { setText(e.target.value); setRes(null); }} placeholder="Dán nội dung trang portal vào đây…" className="mt-3 w-full h-36 rounded-2xl p-3 ring-1 ring-slate-300 text-[16px]" />
      <Button className="mt-2" color="gold" disabled={!text.trim()} onClick={read}>🔍 Đọc thử</Button>
      {res && <div className="mt-3 space-y-3">
        {!res.items.length && !res.notes.length && <p className="rounded-2xl bg-rose-50 text-rose-700 p-3 text-sm font-semibold">Không nhận ra bảng thời khóa biểu, lịch thi hay điểm. Hãy chắc chắn đã chép cả phần bảng (có tiêu đề cột). Trên điện thoại, nếu chép không giữ được bảng, hãy dùng tiện ích trên máy tính.</p>}
        {res.items.map(it => (
          <div key={it.kind} className="rounded-2xl bg-amber-50 p-3">
            <b>{KIND[it.kind]}: {it.rows.length} dòng</b>
            <ul className="text-xs mt-1 space-y-0.5">{it.rows.slice(0, 4).map((r, i) => <li key={i}>• {it.kind === 'tkb' ? `${r.name || r.code} · ${r.day ? dayName(r.day) : '?'} tiết ${r.p1 || '?'}-${r.p2 || '?'} · phòng ${r.room || '?'}`
              : it.kind === 'lichthi' ? `${r.name || r.code} · ${r.date || '?'} ${r.time || r.timeText || ''} · phòng ${r.room || '?'}` : `${r.name || r.code} · ${r.credits ?? '?'} TC · điểm ${r.grade ?? 'chưa có'}`}</li>)}
              {it.rows.length > 4 && <li>… và {it.rows.length - 4} dòng nữa</li>}</ul>
          </div>))}
        {res.notes.length > 0 && <p className="text-sm">📢 {res.notes.length} thông báo</p>}
        {res.unknown.length > 0 && <p className="text-xs text-slate-500">{res.unknown.length} bảng không nhận dạng (cột: {res.unknown.slice(0, 2).map(u => u.headers.slice(0, 5).join(' | ')).join(' ; ')})</p>}
        {res.items.length > 0 && <Field label="Học kỳ" hint="Tự đọc từ trang; sửa nếu sai (vd: HK1 2026-2027)"><Input value={term} onChange={e => setTerm(e.target.value)} /></Field>}
        {(res.items.length > 0 || res.notes.length > 0) && <Button color="green" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : '💾 Lưu vào app'}</Button>}
      </div>}
    </Card>
  );
}
