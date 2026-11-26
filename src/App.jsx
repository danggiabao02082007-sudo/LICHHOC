import { useEffect, useState, lazy, Suspense } from 'react';
import { supabase, configured } from './lib/supabase.js';
import { StudyCtx, useStudyLoader } from './lib/data.js';
import { cx, Loading } from './components/ui.jsx';
import Backdrop, { useThemeId } from './components/Backdrop.jsx';
import { FEST } from './components/themes.js';
import Login from './pages/Login.jsx';
import Setup from './pages/Setup.jsx';
import { ago } from './lib/time.js';

const pages = {
  today: lazy(() => import('./pages/Today.jsx')),
  week: lazy(() => import('./pages/Week.jsx')),
  exams: lazy(() => import('./pages/Exams.jsx')),
  grades: lazy(() => import('./pages/Grades.jsx')),
  notices: lazy(() => import('./pages/Notices.jsx')),
  changes: lazy(() => import('./pages/Changes.jsx')),
  tasks: lazy(() => import('./pages/Tasks.jsx')),
  sync: lazy(() => import('./pages/Sync.jsx')),
  settings: lazy(() => import('./pages/Settings.jsx'))
};
export const MENU = [
  { id: 'today', icon: '🏠', label: 'Hôm nay', short: 'Hôm nay', g: 'from-indigo-500 to-violet-500' },
  { id: 'week', icon: '📅', label: 'Thời khóa biểu', short: 'TKB', g: 'from-sky-500 to-cyan-400' },
  { id: 'exams', icon: '📝', label: 'Lịch thi', short: 'Lịch thi', g: 'from-rose-500 to-orange-400' },
  { id: 'grades', icon: '🎓', label: 'Kết quả học tập', short: 'Điểm', g: 'from-emerald-500 to-teal-400' },
  { id: 'notices', icon: '📢', label: 'Thông báo', short: 'Tin', g: 'from-amber-500 to-yellow-400' },
  { id: 'changes', icon: '🔔', label: 'Thay đổi lịch', short: 'Thay đổi', g: 'from-fuchsia-500 to-pink-500' },
  { id: 'tasks', icon: '✅', label: 'Việc cần làm', short: 'Việc', g: 'from-lime-500 to-green-500' },
  { id: 'sync', icon: '🔄', label: 'Đồng bộ portal', short: 'Đồng bộ', g: 'from-blue-600 to-indigo-500' },
  { id: 'settings', icon: '⚙️', label: 'Cài đặt', short: 'Cài đặt', g: 'from-slate-500 to-slate-400' }
];
const MOBILE = ['today', 'week', 'exams', 'notices'];

// Link xác nhận email trả về #access_token=… → không phải tên trang
const pageOf = () => { const h = location.hash.slice(1); return MENU.some(m => m[0] === h || m.id === h) ? h : 'today'; };
export default function App() {
  const [session, setSession] = useState(undefined);
  const [page, setPage] = useState(() => pageOf());
  const [more, setMore] = useState(false);
  const [mini, setMini] = useState(() => { try { return localStorage.getItem('lichhoc.sidebar') === 'mini'; } catch { return false; } });
  const toggleMini = () => setMini(v => { try { localStorage.setItem('lichhoc.sidebar', v ? 'full' : 'mini'); } catch { /* bỏ qua */ } return !v; });
  const fest = FEST[useThemeId()];
  const study = useStudyLoader(!!session);

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => { const h = () => setPage(pageOf()); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  // mở app từ thông báo / quay lại app → tải lại dữ liệu
  useEffect(() => { const h = () => document.visibilityState === 'visible' && session && study.reload(); document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, [session, study.reload]);
  const go = id => { location.hash = id; setMore(false); scrollTo(0, 0); };

  if (!configured) return <Setup />;
  if (session === undefined) return <Splash />;
  if (!session) return <Login />;

  const cur = MENU.find(m => m.id === page) || MENU[0];
  const Page = pages[cur.id];
  const badge = id => id === 'changes' ? study.unseenChanges : id === 'notices' ? study.unseenNotices : 0;
  const Badge = ({ n }) => n ? <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold grid place-items-center">{n > 99 ? '99+' : n}</span> : null;

  return (
    <StudyCtx.Provider value={study}>
    <div className="min-h-screen">
      <Backdrop />
      {/* Thanh bên (máy tính) */}
      <aside className={cx('hidden lg:flex fixed inset-y-0 left-0 flex-col bg-white/90 backdrop-blur border-r border-indigo-100 z-30 transition-[width] duration-200', mini ? 'w-20' : 'w-64')}>
        <div className={cx('flex items-center', mini && 'justify-center pt-4 pb-3')}><Brand mini={mini} fest={fest} /></div>
        <button onClick={toggleMini} title={mini ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'} aria-label={mini ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          className={cx('absolute -right-4 w-8 h-8 rounded-full bg-white ring-2 ring-indigo-200 shadow-md hover:bg-indigo-50 text-indigo-700 font-black grid place-items-center transition hover:scale-110', mini ? 'top-[66px]' : 'top-8')}>{mini ? '»' : '«'}</button>
        <nav className={cx('flex-1 overflow-auto pb-3 space-y-1', mini ? 'px-2 pt-2' : 'px-3')}>
          {MENU.map(m => (
            <button key={m.id} onClick={() => go(m.id)} title={mini ? m.label : undefined}
              className={cx('relative w-full flex items-center rounded-2xl py-2.5 text-left font-semibold transition', mini ? 'justify-center px-0' : 'gap-3 px-3',
                m.id === cur.id ? cx('text-white shadow-md bg-gradient-to-r', m.g) : 'hover:bg-indigo-50 text-slate-800')}>
              <span key={m.id === cur.id ? 'on' : 'off'} className={cx('text-xl', m.id === cur.id && 'wiggle')}>{m.icon}</span>
              {!mini && <span className="flex-1">{m.label}</span>}
              {mini ? badge(m.id) > 0 && <span className="absolute top-1 right-2 w-2.5 h-2.5 rounded-full bg-rose-500" /> : <Badge n={badge(m.id)} />}
            </button>))}
        </nav>
        <UserBox session={session} mini={mini} />
      </aside>

      <div className={cx('transition-[padding] duration-200', mini ? 'lg:pl-20' : 'lg:pl-64')}>
        <header className={cx('app-head sticky top-0 z-20 text-white bg-gradient-to-r shadow-md grain-pattern', fest ? fest.head : cur.g)} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className={cx('mx-auto flex items-center gap-3 px-4 py-3', mini ? 'max-w-[1440px]' : 'max-w-6xl')}>
            <span className="text-3xl drop-shadow floaty">{cur.icon}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold leading-tight drop-shadow-sm">{cur.label}</h1>
              <p className="text-xs opacity-90 truncate">{study.settings?.current_term || 'Chưa có dữ liệu học kỳ'}{study.status?.last_sync ? ' · đồng bộ ' + ago(study.status.last_sync) : ''}</p>
            </div>
            <button onClick={() => study.reload()} className="rounded-2xl bg-white/25 hover:bg-white/35 px-3 py-2 font-bold" title="Tải lại">↻</button>
          </div>
        </header>
        <main className={cx('mx-auto px-3 sm:px-4 pt-4 pb-32 lg:pb-10', mini ? 'lg:max-w-[1440px] max-w-6xl' : 'max-w-6xl')}>
          <Suspense fallback={<Loading />}><div key={cur.id} className="anim-in"><Page go={go} session={session} /></div></Suspense>
        </main>
      </div>

      {/* Thanh dưới (điện thoại) */}
      <nav className="card lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-indigo-100 grid grid-cols-5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {MOBILE.map(id => MENU.find(m => m.id === id)).map(m => (
          <button key={m.id} onClick={() => go(m.id)} className="relative py-2 flex flex-col items-center">
            <span key={m.id === cur.id ? 'on' : 'off'} className={cx('text-xl w-11 h-8 grid place-items-center rounded-full', m.id === cur.id && cx('bg-gradient-to-r wiggle', m.g))}>{m.icon}</span>
            <span className={cx('text-[10px] leading-tight font-bold mt-0.5 whitespace-nowrap', m.id === cur.id ? 'text-indigo-700' : 'text-slate-600')}>{m.short}</span>
            {badge(m.id) > 0 && <span className="absolute top-1 right-[22%] w-2.5 h-2.5 rounded-full bg-rose-500" />}
          </button>))}
        <button onClick={() => setMore(true)} className="relative py-2 flex flex-col items-center">
          <span className="text-xl w-11 h-8 grid place-items-center">☰</span><span className="text-[10px] font-bold mt-0.5 text-slate-600">Thêm</span>
          {study.unseenChanges > 0 && <span className="absolute top-1 right-[22%] w-2.5 h-2.5 rounded-full bg-rose-500" />}
        </button>
      </nav>
      {more && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/40" onClick={() => setMore(false)}>
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-4 pb-8" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-3">
              {MENU.map(m => (
                <button key={m.id} onClick={() => go(m.id)} className={cx('relative rounded-2xl p-3 text-white font-bold text-sm bg-gradient-to-br shadow', m.g)}>
                  <div className="text-2xl">{m.icon}</div>{m.label}
                  {badge(m.id) > 0 && <span className="absolute top-2 right-2"><Badge n={badge(m.id)} /></span>}
                </button>))}
            </div>
            <div className="mt-4"><UserBox session={session} /></div>
          </div>
        </div>)}
    </div>
    </StudyCtx.Provider>
  );
}
function Brand({ mini, fest }) {
  const logo = cls => <span className="relative shrink-0"><img src="icons/icon-192.png" alt={mini ? 'Lịch Học' : ''} className={cls} />
    {fest && <fest.Hat className={fest.hat} />}</span>;
  if (mini) return logo('w-11 h-11 rounded-2xl shadow heartbeat');
  return (
    <div className="flex-1 min-w-0 px-5 py-5 flex items-center gap-3">
      {logo('w-12 h-12 rounded-2xl shadow heartbeat')}
      <div className="min-w-0"><div className="font-extrabold text-lg bg-gradient-to-r from-indigo-700 via-fuchsia-600 to-amber-500 bg-clip-text text-transparent">Lịch Học</div>
        <div className="text-xs text-slate-500">{fest ? <span className={fest.subCls + ' font-semibold'}>{fest.sub}</span> : 'HCMUS · Vật lý – VLKT'}</div></div>
    </div>
  );
}
function UserBox({ session, mini }) {
  const out = () => supabase.auth.signOut();
  if (mini) return (
    <div className="m-2 rounded-2xl bg-gradient-to-r from-indigo-100 to-pink-100 p-2 flex flex-col items-center gap-1" title={session.user.email}>
      <div className="w-9 h-9 rounded-full bg-white grid place-items-center text-lg">🧑‍🎓</div>
      <button onClick={out} className="text-xs font-bold text-rose-600">Thoát</button>
    </div>);
  return (
    <div className="m-3 rounded-2xl bg-gradient-to-r from-indigo-100 to-pink-100 p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white grid place-items-center text-xl">🧑‍🎓</div>
      <div className="flex-1 min-w-0"><div className="font-bold truncate text-sm">{session.user.email}</div><div className="text-xs">Sinh viên</div></div>
      <button onClick={out} className="text-sm font-bold text-rose-600">Thoát</button>
    </div>
  );
}
const Splash = () => <div className="min-h-screen grid place-items-center bg-indigo-50"><div className="text-center"><div className="text-6xl animate-bounce">📚</div><div className="font-bold text-indigo-700 mt-2">Lịch Học</div></div></div>;
