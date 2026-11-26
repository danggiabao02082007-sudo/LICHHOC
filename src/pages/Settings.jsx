import { useEffect, useState } from 'react';
import { supabase, rpc } from '../lib/supabase.js';
import { useStudy, saveSettings } from '../lib/data.js';
import { Card, Button, Input, Select, Field, Loading, ErrorBox, useToast, cx } from '../components/ui.jsx';
import { MODES, getMode, setMode, getEffective } from '../lib/motion.js';
import { THEMES, getTheme, setTheme, effectiveTheme } from '../lib/theme.js';
import { enablePush, disablePush, currentSub, pushSupported, isIos, isStandalone } from '../lib/push.js';

export default function Settings() {
  const S = useStudy();
  if (S.loading) return <Loading />;
  if (S.error) return <ErrorBox error={S.error} />;
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <PushCard S={S} />
      <RemindCard S={S} />
      <PeriodsCard S={S} />
      <div className="space-y-4"><ThemeCard /><MotionCard /></div>
      <AccountCard S={S} />
    </div>
  );
}

function PushCard({ S }) {
  const toast = useToast(); const [sub, setSub] = useState(undefined); const [busy, setBusy] = useState(false);
  useEffect(() => { currentSub().then(setSub).catch(() => setSub(null)); }, []);
  const on = async () => { setBusy(true); try { setSub(await enablePush()); toast('Đã bật thông báo trên máy này'); S.reload(); } catch (e) { toast(e.message, 'err'); } setBusy(false); };
  const off = async () => { setBusy(true); try { await disablePush(); setSub(null); toast('Đã tắt thông báo trên máy này'); S.reload(); } catch (e) { toast(e.message, 'err'); } setBusy(false); };
  return (
    <Card title="Thông báo đẩy" icon="🔔" accent="from-fuchsia-500 to-pink-500">
      <p className="text-sm">Nhận thông báo khi lịch học / lịch thi / điểm thay đổi, có tin mới, sắp vào học, sắp thi, việc sắp đến hạn.</p>
      {isIos() && !isStandalone() && <p className="mt-2 rounded-2xl bg-amber-50 text-amber-900 p-3 text-sm">📱 iPhone: bấm nút <b>Chia sẻ</b> của Safari → <b>Thêm vào MH chính</b>, mở app từ biểu tượng mới rồi bật thông báo ở đây (cần iOS 16.4 trở lên).</p>}
      <div className="mt-3 rounded-2xl bg-pink-50 p-3 text-sm">
        Máy này: <b>{sub === undefined ? 'đang kiểm tra…' : sub ? '✅ đang nhận thông báo' : pushSupported() ? '⛔ chưa bật' : 'không hỗ trợ'}</b> · Tổng số máy nhận: <b>{S.status?.devices || 0}</b>
      </div>
      <div className="flex gap-2 mt-3">{sub ? <Button color="ghost" disabled={busy} onClick={off}>Tắt trên máy này</Button> : <Button color="rose" disabled={busy || sub === undefined} onClick={on}>🔔 Bật thông báo trên máy này</Button>}</div>
      <p className="text-xs text-slate-500 mt-2">Thông báo do máy chạy ngầm gửi mỗi 30 phút (GitHub có thể trễ thêm vài phút). Cần cài máy chạy ngầm ở mục <b>Đồng bộ</b>.</p>
    </Card>
  );
}

function RemindCard({ S }) {
  const toast = useToast(); const s = S.settings;
  const set = async patch => { try { await saveSettings(patch, s); await S.reload(); toast('Đã lưu'); } catch (e) { toast(e.message, 'err'); } };
  const Toggle = ({ k, label }) => <label className="flex items-center justify-between gap-3 py-2 border-b"><span>{label}</span>
    <input type="checkbox" className="w-5 h-5 accent-fuchsia-600" checked={s[k] !== false} onChange={e => set({ [k]: e.target.checked })} /></label>;
  return (
    <Card title="Nhắc lịch" icon="⏰" accent="from-violet-500 to-indigo-500">
      <Field label="Nhắc trước giờ học"><Select value={String(s.remind_class_min ?? 30)} onChange={e => set({ remind_class_min: +e.target.value })}>
        {[[0, 'Không nhắc'], [15, '15 phút'], [30, '30 phút'], [45, '45 phút'], [60, '1 giờ'], [90, '1 giờ 30 phút']].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select></Field>
      <div className="mt-2 text-sm">
        <Toggle k="remind_exam" label="📝 Nhắc thi: 19 giờ hôm trước + sáng ngày thi" />
        <Toggle k="remind_task" label="✅ Nhắc việc còn dưới 24 giờ" />
        <Toggle k="push_changes" label="🔔 Báo khi lịch học / lịch thi / điểm thay đổi" />
        <Toggle k="push_notices" label="📢 Báo khi có thông báo mới" />
      </div>
      <Field label="Học kỳ hiện tại" className="mt-3" hint="Dùng cho trang Hôm nay, TKB và lời nhắc"><Select value={s.current_term || ''} onChange={e => set({ current_term: e.target.value })}>
        <option value="">— Tự chọn bản mới nhất —</option>{S.terms.map(t => <option key={t} value={t}>{t || 'Chưa rõ học kỳ'}</option>)}</Select></Field>
    </Card>
  );
}

function PeriodsCard({ S }) {
  const toast = useToast(); const [p, setP] = useState(S.settings.periods || []);
  const upd = (i, j, v) => setP(p.map((r, k) => k === i ? (j === 0 ? [v, r[1]] : [r[0], v]) : r));
  const save = async () => { try { await saveSettings({ periods: p }, S.settings); await S.reload(); toast('Đã lưu giờ tiết học'); } catch (e) { toast(e.message, 'err'); } };
  return (
    <Card title="Giờ tiết học" icon="🕐" accent="from-sky-500 to-cyan-400">
      <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-2">Đây là giờ <b>mặc định tham khảo</b>, tôi chưa xác minh được giờ chính thức của HCMUS. Hãy sửa cho đúng với lịch của trường/cơ sở bạn học (cơ sở Nguyễn Văn Cừ và Linh Trung có thể khác nhau).</p>
      <div className="grid grid-cols-[60px_1fr_1fr] gap-2 mt-3 items-center text-sm">
        <b>Tiết</b><b>Bắt đầu</b><b>Kết thúc</b>
        {p.map((r, i) => [<span key={'a' + i} className="font-bold text-slate-600">Tiết {i + 1}</span>,
          <Input key={'b' + i} type="time" value={r[0]} onChange={e => upd(i, 0, e.target.value)} className="!py-1.5" />,
          <Input key={'c' + i} type="time" value={r[1]} onChange={e => upd(i, 1, e.target.value)} className="!py-1.5" />])}
      </div>
      <div className="flex gap-2 mt-3"><Button small color="ghost" onClick={() => setP([...p, ['', '']])}>＋ Thêm tiết</Button>
        {p.length > 1 && <Button small color="ghost" onClick={() => setP(p.slice(0, -1))}>− Bớt tiết cuối</Button>}
        <Button small color="sky" onClick={save}>💾 Lưu</Button></div>
    </Card>
  );
}

function ThemeCard() {
  const [t, setT] = useState(getTheme());
  const eff = effectiveTheme(t);
  return (
    <Card title="Chủ đề giao diện" icon="🎨" accent="from-red-600 to-emerald-600">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{THEMES.map(([k, n]) => (
        <button key={k} onClick={() => { setT(k); setTheme(k); }} aria-pressed={t === k}
          className={'rounded-2xl py-3 px-2 font-bold text-sm ' + (t === k ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow' : 'bg-slate-100')}>{n}</button>))}</div>
      <p className="text-sm mt-3">{THEMES.find(x => x[0] === t)[2]}.</p>
      <p className="text-xs text-slate-500 mt-1">Đang hiện: <b>{THEMES.find(x => x[0] === eff)?.[1]}</b>. Lựa chọn chỉ áp dụng cho máy này. Tết và Trung Thu tính theo âm lịch (có ngày đến năm 2030).</p>
    </Card>
  );
}
function MotionCard() {
  const [mode, setM] = useState(getMode()); const [eff, setEff] = useState(getEffective());
  useEffect(() => { const h = e => setEff(e.detail); addEventListener('motionchange', h); return () => removeEventListener('motionchange', h); }, []);
  const label = { full: 'đầy đủ', lite: 'nhẹ', off: 'tắt' }[eff];
  return (
    <Card title="Hiệu ứng động" icon="🎞️" accent="from-fuchsia-500 to-violet-500">
      <div className="grid grid-cols-2 gap-2">{MODES.map(([k, t]) => (
        <button key={k} onClick={() => { setM(k); setMode(k); }} aria-pressed={mode === k}
          className={'rounded-2xl py-3 px-2 font-bold text-sm ' + (mode === k ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow' : 'bg-slate-100')}>{t}</button>))}</div>
      <p className="text-sm mt-3">{MODES.find(x => x[0] === mode)[2]}.</p>
      {mode === 'auto' && label && <p className="text-xs text-slate-500 mt-1">Máy này đang chạy ở mức: <b>{label}</b>.</p>}
    </Card>
  );
}
function AccountCard({ S }) {
  const toast = useToast(); const [pw, setPw] = useState(''); const [conf, setConf] = useState('');
  const change = async () => { const { error } = await supabase.auth.updateUser({ password: pw }); if (error) toast(error.message, 'err'); else { toast('Đã đổi mật khẩu'); setPw(''); } };
  const reset = async () => { try { await rpc('reset_study_data', { p_confirm: conf.trim().toUpperCase() === 'XOA' ? 'XÓA' : conf.trim() }); toast('Đã xóa dữ liệu học tập'); setConf(''); S.reload(); } catch (e) { toast(e.message, 'err'); } };
  return (
    <Card title="Tài khoản & dữ liệu" icon="👤" accent="from-slate-600 to-slate-400" className="lg:col-span-2">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Field label="Mật khẩu mới (ít nhất 8 ký tự)"><Input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" /></Field>
          <Button small className="mt-2" disabled={pw.length < 8} onClick={change}>🔑 Đổi mật khẩu</Button></div>
        <div><Field label='Xóa toàn bộ dữ liệu học tập (gõ "XÓA")' hint="Xóa TKB, lịch thi, điểm, thông báo, thay đổi. Giữ tài khoản, việc cần làm, cài đặt."><Input value={conf} onChange={e => setConf(e.target.value)} placeholder="XÓA" /></Field>
          <Button small color="rose" className="mt-2" disabled={!['XÓA', 'XOA'].includes(conf.trim().toUpperCase())} onClick={reset}>🗑️ Xóa dữ liệu</Button></div>
      </div>
      <Button small color="ghost" className="mt-4" onClick={() => supabase.auth.signOut()}>🚪 Đăng xuất</Button>
    </Card>
  );
}
