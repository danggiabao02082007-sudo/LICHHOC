import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { rpc } from '../lib/supabase.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function Card({ title, icon, accent = 'from-ruong-500 to-lime-400', right, children, className = '', bodyClass = '' }) {
  return (
    <section className={cx('card relative rounded-3xl bg-white/95 shadow-soft ring-1 ring-black/5 overflow-hidden', className)}>
      {title && (
        <header className={cx('flex items-center gap-2 px-4 py-3 text-white bg-gradient-to-r', accent)}>
          {icon && <span className="text-xl leading-none">{icon}</span>}
          <h2 className="font-bold text-[15px] flex-1">{title}</h2>
          {right}
        </header>
      )}
      <div className={cx('p-4', bodyClass)}>{children}</div>
    </section>
  );
}

const BTN = {
  green: 'bg-gradient-to-r from-ruong-600 to-emerald-500 text-white',
  gold: 'bg-gradient-to-r from-lua-500 to-orange-400 text-white',
  sky: 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white',
  rose: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white',
  violet: 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white',
  ghost: 'bg-white text-ink ring-1 ring-slate-300',
  danger: 'bg-white text-rose-600 ring-2 ring-rose-400'
};
export function Button({ color = 'green', className = '', small, ...p }) {
  return <button {...p} className={cx('rounded-2xl font-bold shadow-sm active:scale-[.98] transition disabled:opacity-50 disabled:pointer-events-none',
    small ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5', BTN[color], className)} />;
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-[13px] font-semibold text-slate-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}
export const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-ruong-400';
const groupDigits = v => String(v ?? '').replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
/** Ô nhập. inputMode="numeric" = ô tiền: tự hiển thị 1.000.000 khi gõ (trang gọi digits() để bỏ dấu chấm). */
export const Input = p => p.inputMode === 'numeric'
  ? <input {...p} value={groupDigits(p.value)} className={cx(inputCls, p.className)} />
  : <input {...p} className={cx(inputCls, p.className)} />;
export const Select = ({ children, ...p }) => <select {...p} className={cx(inputCls, p.className)}>{children}</select>;

/** Số đếm tăng dần từ 0 tới giá trị thật */
export function CountUp({ value, format = String, ms = 900 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-off')) { setV(value); return; }
    let raf, t0;
    const step = t => { t0 ??= t; const k = Math.min(1, (t - t0) / ms); setV(value * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return format(v);
}

export function Stat({ label, value, sub, icon, grad, format }) {
  return (
    <div className={cx('card shine rounded-3xl p-4 text-white shadow-soft bg-gradient-to-br relative overflow-hidden', grad)}>
      <div className="absolute -right-3 -bottom-4 text-6xl opacity-25 select-none floaty">{icon}</div>
      <div className="text-[13px] font-semibold opacity-95">{icon} {label}</div>
      <div className="text-[18px] sm:text-[22px] font-extrabold mt-1 leading-tight whitespace-nowrap">{typeof value === 'number' ? <CountUp value={value} format={format} /> : value}</div>
      {sub && <div className="text-xs mt-1 opacity-90">{sub}</div>}
    </div>
  );
}

export const Badge = ({ color = 'bg-ruong-100 text-ruong-800', children }) =>
  <span className={cx('inline-block rounded-full px-2.5 py-0.5 text-xs font-bold', color)}>{children}</span>;

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => { const k = e => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={cx('bg-white w-full rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-auto shadow-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-lua-400 via-lime-400 to-ruong-500 text-white">
          <h3 className="font-extrabold flex-1">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/30 font-bold" aria-label="Đóng">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ icon = '📚', text }) {
  return <div className="text-center py-8 text-slate-500"><div className="text-4xl mb-2">{icon}</div>{text}</div>;
}

export function Table({ head, children }) {
  return (
    <div className="-mx-4 sm:overflow-x-auto">
      <table className="w-full text-[13px] sm:text-sm sm:min-w-[560px]">
        <thead><tr className="text-left text-slate-500 border-b">{head.map((h, i) => <th key={i} className={cx('px-1.5 sm:px-4 py-2 font-semibold first:pl-4 last:pr-4', h.r && 'text-right', h.sm && 'hidden sm:table-cell', h.cls)}>{h.t ?? h}</th>)}</tr></thead>
        <tbody className="[&>tr]:border-b [&>tr:last-child]:border-0 [&_td]:px-1.5 sm:[&_td]:px-4 [&_td]:py-2.5 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_td]:break-words">{children}</tbody>
      </table>
    </div>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastHost({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((text, type = 'ok') => {
    const id = Math.random(); setList(l => [...l, { id, text, type }]);
    setTimeout(() => setList(l => l.filter(x => x.id !== id)), type === 'err' ? 6000 : 2500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed z-[60] top-3 left-1/2 -translate-x-1/2 space-y-2 w-[92%] max-w-md pointer-events-none">
        {list.map(t => <div key={t.id} className={cx('rounded-2xl px-4 py-3 font-semibold shadow-xl text-white',
          t.type === 'err' ? 'bg-rose-600' : 'bg-ruong-700')}>{t.type === 'err' ? '⚠️ ' : '✅ '}{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

/** Tải dữ liệu bất đồng bộ với trạng thái loading/lỗi */
export function useLoad(fn, deps = []) {
  const [state, set] = useState({ data: null, loading: true, error: null });
  const reload = useCallback(() => {
    set(s => ({ ...s, loading: true }));
    fn().then(data => set({ data, loading: false, error: null })).catch(e => set({ data: null, loading: false, error: e.message }));
  }, deps); // eslint-disable-line
  useEffect(reload, [reload]);
  return { ...state, reload };
}

export const Loading = () => <div className="py-10 text-center text-slate-500 animate-pulse">📚 Đang tải…</div>;
export const ErrorBox = ({ error }) => <div className="rounded-2xl bg-rose-50 text-rose-700 p-4 font-semibold">⚠️ {error}</div>;

// Nút xóa có hỏi lại. onConfirm trả Promise; lỗi từ máy chủ hiện thành thông báo.
export function DeleteButton({ title, children, onConfirm, label = '🗑️ Xóa', icon, className = '' }) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const toast = useToast();
  const go = async () => {
    setBusy(true);
    try { await onConfirm(); setOpen(false); } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };
  return (<>
    {icon ? <button type="button" onClick={e => { e.stopPropagation(); setOpen(true); }} aria-label={title}
        className={cx('shrink-0 w-9 h-9 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200', className)}>🗑️</button>
      : <Button type="button" color="rose" className={className} onClick={() => setOpen(true)}>{label}</Button>}
    {open && <Modal title={title} onClose={() => !busy && setOpen(false)}>
      <div className="text-sm space-y-1">{children}</div>
      <p className="text-xs text-rose-600 font-semibold mt-2">Không hoàn tác được. Nội dung bị xóa vẫn được lưu trong nhật ký hệ thống.</p>
      <div className="flex gap-2 mt-4"><Button type="button" color="ghost" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>Không xóa</Button>
        <Button type="button" color="rose" className="flex-1" onClick={go} disabled={busy}>{busy ? 'Đang xóa…' : '🗑️ Xóa'}</Button></div>
    </Modal>}
  </>);
}

// ---------- Chọn nhiều để xóa ----------
export function useSelection() {
  const [on, setOnRaw] = useState(false); const [sel, setSel] = useState(() => new Set());
  const clear = () => setSel(new Set());
  return {
    on, sel, clear, has: id => sel.has(id),
    setOn: v => { setOnRaw(v); if (!v) clear(); },
    toggle: id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }),
    setAll: ids => setSel(new Set(ids)),
  };
}

// Ô đánh dấu (chỉ để hiển thị; bấm vào cả dòng để chọn/bỏ chọn)
export const Check = ({ checked }) => (
  <span aria-hidden="true" className={cx('shrink-0 w-6 h-6 rounded-lg grid place-items-center text-white text-sm font-black ring-2 transition',
    checked ? 'bg-rose-500 ring-rose-500' : 'bg-white ring-slate-300')}>{checked ? '✓' : ''}</span>
);

/** Thanh công cụ xóa nhiều. items = [{ id, label }] là các mục đang hiện (xóa được) trong danh sách. */
export function BulkBar({ s, kind, items, noun = 'mục', onDone, className = '' }) {
  const toast = useToast();
  const [ask, setAsk] = useState(null); const [typed, setTyped] = useState(''); const [busy, setBusy] = useState(false); const [result, setResult] = useState(null);
  const picked = items.filter(x => s.has(x.id));
  const run = async () => {
    setBusy(true);
    try {
      const r = await rpc('delete_many', { p_kind: kind, p_ids: ask.list.map(x => x.id) });
      const name = Object.fromEntries(items.map(x => [x.id, x.label]));
      setAsk(null); setTyped(''); s.setOn(false); onDone();
      if (r.failed.length) setResult({ ...r, failed: r.failed.map(f => ({ ...f, label: name[f.id] || f.id })) });
      else toast(`Đã xóa ${r.deleted} ${noun}`);
    } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };
  if (!s.on) return items.length ? <Button small color="ghost" className={className} onClick={() => s.setOn(true)}>☑️ Chọn nhiều để xóa</Button> : null;
  return (<>
    <div className={cx('flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 ring-2 ring-rose-200 p-2', className)}>
      <b className="text-sm text-rose-700 px-1">Đã chọn {picked.length}/{items.length}</b>
      <Button small color="ghost" onClick={() => s.setAll(items.map(x => x.id))}>Chọn tất cả</Button>
      {picked.length > 0 && <Button small color="ghost" onClick={s.clear}>Bỏ chọn</Button>}
      <Button small color="rose" disabled={!picked.length} onClick={() => setAsk({ all: false, list: picked })}>🗑️ Xóa đã chọn ({picked.length})</Button>
      <Button small color="danger" disabled={!items.length} onClick={() => setAsk({ all: true, list: items })}>🗑️ Xóa tất cả ({items.length})</Button>
      <Button small color="ghost" onClick={() => s.setOn(false)}>Xong</Button>
    </div>
    {ask && <Modal title={ask.all ? `Xóa tất cả ${ask.list.length} ${noun} đang hiện?` : `Xóa ${ask.list.length} ${noun} đã chọn?`} onClose={() => !busy && setAsk(null)}>
      <ul className="text-sm list-disc pl-5 max-h-48 overflow-auto">{ask.list.slice(0, 30).map(x => <li key={x.id}>{x.label}</li>)}
        {ask.list.length > 30 && <li>… và {ask.list.length - 30} {noun} khác</li>}</ul>
      <p className="text-sm mt-2">Mỗi {noun} được xóa và gỡ ảnh hưởng (kho, sổ quỹ, công nợ) giống như xóa từng cái. {noun[0].toUpperCase() + noun.slice(1)} nào đang bị phần khác dùng tới sẽ được bỏ qua và báo lại.</p>
      {ask.all && <Field label='Gõ "XÓA" để xác nhận (không dấu cũng được)' className="mt-2"><Input value={typed} onChange={e => setTyped(e.target.value)} placeholder="XÓA" /></Field>}
      <p className="text-xs text-rose-600 font-semibold mt-2">Không hoàn tác được. Nội dung bị xóa vẫn được lưu trong nhật ký hệ thống.</p>
      <div className="flex gap-2 mt-4"><Button type="button" color="ghost" className="flex-1" onClick={() => setAsk(null)} disabled={busy}>Không xóa</Button>
        <Button type="button" color="rose" className="flex-1" onClick={run} disabled={busy || (ask.all && !['XÓA', 'XOA'].includes(typed.normalize('NFC').trim().toUpperCase()))}>{busy ? 'Đang xóa…' : `🗑️ Xóa ${ask.list.length}`}</Button></div>
    </Modal>}
    {result && <Modal title="Kết quả xóa" onClose={() => setResult(null)}>
      <p>✅ Đã xóa <b>{result.deleted}</b> {noun}.</p>
      <p className="mt-2">⚠️ <b>{result.failed.length}</b> {noun} không xóa được:</p>
      <ul className="text-sm list-disc pl-5 mt-1 max-h-60 overflow-auto">{result.failed.map(f => <li key={f.id}><b>{f.label}</b>: {f.error}</li>)}</ul>
      <Button className="w-full mt-4" onClick={() => setResult(null)}>Đã hiểu</Button>
    </Modal>}
  </>);
}
