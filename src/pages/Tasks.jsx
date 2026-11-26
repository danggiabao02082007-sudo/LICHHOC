import { useState } from 'react';
import { supabase, q } from '../lib/supabase.js';
import { useStudy } from '../lib/data.js';
import { Card, Button, Input, Select, Field, Modal, Loading, ErrorBox, Empty, useLoad, useToast, DeleteButton, cx } from '../components/ui.jsx';
import { dt, iso } from '../lib/time.js';

const blank = () => ({ title: '', course: '', due: '', time: '23:59', note: '' });
export default function Tasks() {
  const S = useStudy(); const toast = useToast();
  const [form, setForm] = useState(null); const [showDone, setShowDone] = useState(false);
  const list = useLoad(() => q(supabase.from('tasks').select('*').order('done').order('due_at', { ascending: true, nullsFirst: false })), []);
  const courses = [...new Set((S.pick?.('tkb')?.rows || []).map(c => c.name || c.code))];
  const save = async e => {
    e.preventDefault();
    const row = { title: form.title.trim(), course: form.course, note: form.note, due_at: form.due ? new Date(`${form.due}T${form.time || '23:59'}:00`).toISOString() : null };
    try { form.id ? await q(supabase.from('tasks').update(row).eq('id', form.id)) : await q(supabase.from('tasks').insert(row)); toast('Đã lưu'); setForm(null); list.reload(); }
    catch (er) { toast(er.message, 'err'); }
  };
  const toggle = async t => { await q(supabase.from('tasks').update({ done: !t.done }).eq('id', t.id)); list.reload(); };
  const rows = (list.data || []).filter(t => showDone || !t.done);
  const left = t => t.due_at ? (new Date(t.due_at) - Date.now()) / 36e5 : null;
  return (
    <div className="space-y-4">
      <Card title="Việc cần làm" icon="✅" accent="from-lime-500 to-green-500" right={<Button small color="ghost" onClick={() => setForm(blank())}>＋ Thêm</Button>}>
        <p className="text-sm text-slate-600">Bài tập, báo cáo thí nghiệm, đăng ký học phần, đóng học phí… App nhắc về điện thoại khi còn dưới 24 giờ.</p>
        <label className="flex items-center gap-2 text-sm font-semibold mt-2"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> Hiện cả việc đã xong</label>
      </Card>
      <Card bodyClass="p-0">
        {list.loading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : !rows.length ? <Empty icon="🌈" text="Không có việc nào. Bấm “＋ Thêm”." /> : (
          <div className="divide-y">{rows.map(t => { const h = left(t); return (
            <div key={t.id} className={cx('flex items-center gap-3 px-4 py-3', t.done && 'opacity-50')}>
              <button onClick={() => toggle(t)} className={cx('w-7 h-7 shrink-0 rounded-lg ring-2 grid place-items-center font-black', t.done ? 'bg-green-500 ring-green-500 text-white' : 'ring-slate-300')} aria-label="Xong">{t.done ? '✓' : ''}</button>
              <button onClick={() => setForm({ id: t.id, title: t.title, course: t.course, note: t.note, due: t.due_at ? iso(new Date(t.due_at)) : '', time: t.due_at ? new Date(t.due_at).toTimeString().slice(0, 5) : '23:59' })} className="flex-1 min-w-0 text-left">
                <div className={cx('font-bold', t.done && 'line-through')}>{t.title}</div>
                <div className="text-xs text-slate-500">{[t.course, t.note].filter(Boolean).join(' · ')}</div>
              </button>
              {t.due_at && <span className={cx('text-xs font-extrabold text-right whitespace-nowrap', !t.done && h < 0 ? 'text-rose-700' : !t.done && h < 24 ? 'text-rose-600' : 'text-slate-500')}>
                {dt(t.due_at).slice(0, 16)}<br />{!t.done && (h < 0 ? 'Quá hạn' : h < 24 ? `còn ${Math.max(1, Math.round(h))} giờ` : `còn ${Math.round(h / 24)} ngày`)}</span>}
              <DeleteButton icon title="Xóa việc này?" onConfirm={async () => { await q(supabase.from('tasks').delete().eq('id', t.id)); list.reload(); }}><p><b>{t.title}</b></p></DeleteButton>
            </div>); })}</div>)}
      </Card>
      {form && <Modal title={form.id ? 'Sửa việc' : 'Thêm việc'} onClose={() => setForm(null)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Việc cần làm *"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="vd: Nộp báo cáo thí nghiệm bài 3" /></Field>
          <Field label="Môn học"><Select value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}><option value="">— Không gắn môn —</option>{courses.map(c => <option key={c}>{c}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hạn chót (ngày)"><Input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></Field>
            <Field label="Giờ"><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></Field>
          </div>
          <Field label="Ghi chú"><Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></Field>
          <Button className="w-full" disabled={!form.title.trim()}>💾 Lưu</Button>
        </form></Modal>}
    </div>
  );
}
