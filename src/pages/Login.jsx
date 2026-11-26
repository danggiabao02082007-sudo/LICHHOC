import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Button, Field, Input, cx } from '../components/ui.jsx';
import Backdrop, { useThemeId } from '../components/Backdrop.jsx';
import { FEST } from '../components/themes.js';

/** Lần đầu: đăng ký tài khoản chủ app (chỉ 1 người). Sau đó: đăng nhập. */
export default function Login() {
  const fest = FEST[useThemeId()];
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (mode === 'signup' && pw !== pw2) return setErr('Hai lần nhập mật khẩu không giống nhau');
    if (mode === 'signup' && pw.length < 8) return setErr('Mật khẩu cần ít nhất 8 ký tự');
    setBusy(true);
    const { data, error } = mode === 'login' ? await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      : await supabase.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: location.origin + location.pathname } });
    if (!error && mode === 'signup' && !data.session) { setBusy(false); setMode('login'); return setErr('📧 Đã tạo tài khoản. Mở email, bấm link xác nhận (xem cả thư rác), rồi đăng nhập tại đây.'); }
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Sai email hoặc mật khẩu'
      : /Database error saving new user|đã có chủ/i.test(error.message) ? 'App đã có chủ rồi. Hãy đăng nhập bằng tài khoản đã tạo.' : error.message);
    setBusy(false);
  };
  return (
    <div className="min-h-screen relative flex items-start sm:items-center justify-center px-4 pt-14 sm:pt-0">
      <Backdrop tall />
      <form onSubmit={submit} className="card relative w-full max-w-sm rounded-[2rem] bg-white/95 shadow-2xl p-6 ring-4 ring-white/80">
        <div className="text-center mb-5">
          <span className="relative inline-block"><img src="icons/icon-192.png" alt="" className="w-20 h-20 rounded-3xl mx-auto shadow-lg heartbeat" />
            {fest && <fest.Hat className={fest.hat.replace(/w-\d+/, 'w-14').replace(/-top-\d+/, '-top-6').replace(/-left-\d+/, '-left-5')} />}</span>
          <h1 className="mt-3 text-3xl font-extrabold bg-gradient-to-r from-indigo-700 via-fuchsia-600 to-amber-500 bg-clip-text text-transparent">Lịch Học</h1>
          <p className="text-slate-600 text-sm">Thời khóa biểu · lịch thi · điểm · thông báo HCMUS</p>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 mb-4 text-sm font-bold">
          {[['login', 'Đăng nhập'], ['signup', 'Tạo tài khoản lần đầu']].map(([k, t]) => (
            <button type="button" key={k} onClick={() => { setMode(k); setErr(''); }} className={cx('rounded-xl py-2', mode === k ? 'bg-white shadow text-indigo-700' : 'text-slate-500')}>{t}</button>))}
        </div>
        <Field label="Email"><Input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
        <Field label="Mật khẩu" className="mt-3"><Input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={pw} onChange={e => setPw(e.target.value)} required /></Field>
        {mode === 'signup' && <Field label="Nhập lại mật khẩu" className="mt-3"><Input type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} required /></Field>}
        {err && <p className="mt-3 text-rose-600 font-semibold">⚠️ {err}</p>}
        <Button className="w-full mt-5 text-lg" color="violet" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'login' ? '📚 Đăng nhập' : '✨ Tạo tài khoản'}</Button>
        <p className="text-xs text-slate-500 mt-4 text-center">{mode === 'signup' ? 'App chỉ dành cho 1 người: tài khoản tạo đầu tiên là của bạn, sau đó không ai tạo thêm được. Đây KHÔNG phải mật khẩu portal trường.' : 'Không dùng mật khẩu portal trường ở đây.'}</p>
      </form>
    </div>
  );
}
