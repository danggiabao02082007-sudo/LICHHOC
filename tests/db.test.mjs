// Kiểm thử cơ sở dữ liệu trên Supabase cục bộ: bash tests/run.sh
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { normalize, diff, hashRows } from '../src/lib/portal.js';
const URL = 'http://127.0.0.1:54321', ANON = process.env.SB_ANON, SERVICE = process.env.SB_SERVICE;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });
const stranger = () => createClient(URL, ANON, { auth: { persistSession: false } });   // chưa đăng nhập
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✔', m); } else { fail++; console.log('  ✘', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (được ${JSON.stringify(a)}, mong đợi ${JSON.stringify(b)})`);
const psql = sql => execSync(`docker exec -i supabase_db_lichhoc psql -U postgres -At`, { input: sql }).toString().trim();
const rpc = async (c, fn, args) => { const { data, error } = await c.rpc(fn, args); return { data, error: error?.message }; };

console.log('1. Chỉ 1 người dùng');
const { error: e1 } = await stranger().auth.signUp({ email: 'sv@test.vn', password: 'Matkhau@123' });
ok(!e1, 'Tài khoản đầu tiên đăng ký được ' + (e1?.message || ''));
const me = createClient(URL, ANON, { auth: { persistSession: false } });
await me.auth.signInWithPassword({ email: 'sv@test.vn', password: 'Matkhau@123' });
ok((await rpc(me, 'is_owner', {})).data === true, 'Tài khoản đầu là chủ app');
const { error: e2 } = await createClient(URL, ANON, { auth: { persistSession: false } }).auth.signUp({ email: 'la@test.vn', password: 'Matkhau@123' });
ok(!!e2, 'Người thứ 2 KHÔNG đăng ký được: ' + (e2?.message || ''));
eq((await stranger().from('snapshots').select('id')).data ?? [], [], 'Người chưa đăng nhập không đọc được dữ liệu');

console.log('\n2. Mã đồng bộ cho tiện ích');
let r = await rpc(stranger(), 'new_sync_key', {}); ok(!!r.error, 'Người lạ không tạo được mã đồng bộ');
const KEY = (await rpc(me, 'new_sync_key', {})).data;
ok(/^[0-9a-f]{48}$/.test(KEY), 'Chủ tạo mã đồng bộ (48 ký tự)');
r = await rpc(anon, 'ingest', { p_key: 'sai', p_items: [] }); ok(r.error?.includes('Mã đồng bộ không đúng'), 'Sai mã đồng bộ bị từ chối');

console.log('\n3. Nhận thời khóa biểu, phát hiện thay đổi');
const tkb = { headers: ['Mã MH', 'Tên môn học', 'Lớp', 'Thứ', 'Tiết', 'Phòng', 'Từ ngày', 'Đến ngày'],
  rows: [['PHY00001', 'Vật lý đại cương 1', '26VL1', 'Thứ 2', '1-3', 'E201', '08/09/2026', '20/12/2026'], ['MTH00010', 'Giải tích 1A', '26VL1', 'Thứ 4', '1-3', 'F102', '08/09/2026', '20/12/2026']] };
const rows1 = normalize('tkb', tkb);
const item = (rows, prev) => ({ kind: 'tkb', term: 'HK1 2026-2027', rows, hash: hashRows(rows), changes: diff('tkb', prev, rows) });
r = await rpc(anon, 'ingest', { p_key: KEY, p_items: [item(rows1, null)], p_source: 'userscript', p_url: 'https://new-portal2.hcmus.edu.vn/x.aspx' });
eq(r.data, { saved: 1, changes: 0, notices: 0 }, 'Lần đầu: lưu TKB, không báo thay đổi');
r = await rpc(anon, 'ingest', { p_key: KEY, p_items: [item(rows1, rows1)], p_source: 'userscript' });
eq(r.data.saved, 0, 'Gửi lại y hệt: không lưu thêm');
const prev = (await rpc(anon, 'latest_rows', { p_key: KEY })).data;
eq(prev.map(p => [p.kind, p.term, p.rows.length]), [['tkb', 'HK1 2026-2027', 2]], 'Tiện ích lấy được dữ liệu lần trước');
const rows2 = JSON.parse(JSON.stringify(rows1)); rows2[0].room = 'B105';
r = await rpc(anon, 'ingest', { p_key: KEY, p_items: [item(rows2, prev[0].rows)], p_source: 'userscript' });
eq(r.data, { saved: 1, changes: 1, notices: 0 }, 'Đổi phòng: lưu bản mới + 1 thay đổi');
const ch = (await me.from('changes').select('*')).data;
ok(ch.length === 1 && ch[0].title.startsWith('Đổi phòng học') && !ch[0].seen && !ch[0].pushed, 'Thay đổi chưa xem, chưa gửi thông báo');
eq((await me.from('settings').select('data').single()).data.data.current_term, 'HK1 2026-2027', 'Tự ghi nhận học kỳ hiện tại');

console.log('\n4. Thông báo portal');
const notes = [{ uid: 'tb1', title: 'Thông báo lịch thi cuối kỳ', url: 'https://x/1', date: '2026-11-25' }, { uid: 'tb2', title: 'Thông báo đăng ký học phần', url: 'https://x/2', date: null }];
r = await rpc(anon, 'ingest', { p_key: KEY, p_items: [], p_notices: notes, p_source: 'userscript' });
eq(r.data.notices, 2, 'Lần đầu: lưu 2 thông báo');
ok((await me.from('notices').select('seen').eq('source', 'portal')).data.every(x => x.seen), 'Lần đầu: đánh dấu đã xem (không dội thông báo cũ)');
r = await rpc(anon, 'ingest', { p_key: KEY, p_items: [], p_notices: [...notes, { uid: 'tb3', title: 'Thông báo nghỉ học ngày 20/11', url: 'https://x/3', date: '2026-11-26' }], p_source: 'userscript' });
eq(r.data.notices, 1, 'Lần sau: chỉ thêm thông báo mới');
ok((await me.from('notices').select('seen').eq('uid', 'tb3').single()).data.seen === false, 'Thông báo mới chưa xem');

console.log('\n5. Máy chạy ngầm');
r = await rpc(stranger(), 'new_cron_key', {}); ok(!!r.error, 'Người lạ không tạo được khóa máy chạy ngầm');
const CRON = (await rpc(me, 'new_cron_key', {})).data; ok(/^[0-9a-f]{64}$/.test(CRON), 'Chủ tạo khóa máy chạy ngầm (64 ký tự, hiện 1 lần)');
const pub = 'B' + 'x'.repeat(86), priv = 'y'.repeat(43);
r = await rpc(stranger(), 'set_vapid', { p_public: pub, p_private: priv }); ok(!!r.error, 'Người lạ không đặt được khóa ký thông báo');
eq((await rpc(me, 'set_vapid', { p_public: pub, p_private: priv })).data, pub, 'Chủ đặt khóa ký thông báo (tạo trên máy)');
eq((await rpc(me, 'set_vapid', { p_public: 'C' + 'x'.repeat(86), p_private: priv })).data, pub, 'Không ghi đè khóa đã có (trừ khi bắt buộc)');
ok((await stranger().from('app_keys').select('*')).data?.length !== 1 && (await me.from('app_keys').select('*')).error, 'Không ai đọc thẳng được bảng khóa');
r = await rpc(anon, 'cron_pending', { p_key: 'sai' }); ok(r.error?.includes('Sai khóa'), 'Sai khóa máy chạy ngầm bị từ chối');
r = await rpc(anon, 'cron_add_notices', { p_key: CRON, p_source: 'truong', p_items: [{ uid: 'a', title: 'Tin trường A', url: 'u', date: '2026-11-25T08:00:00Z' }] });
eq(r.data, 1, 'Thêm tin trường');
r = await rpc(anon, 'cron_add_notices', { p_key: CRON, p_source: 'truong', p_items: [{ uid: 'a', title: 'Tin trường A', url: 'u' }, { uid: 'b', title: 'Tin trường B', url: 'u2' }] });
eq(r.data, 1, 'Chỉ thêm tin chưa có');
eq((await rpc(anon, 'cron_known', { p_key: CRON, p_source: 'truong' })).data.sort(), ['a', 'b'], 'Biết các tin đã có');
await me.rpc('save_push_sub', { p_sub: { endpoint: 'https://push.example/1', keys: { p256dh: 'x', auth: 'y' } }, p_device: 'iPhone' });
const pend = (await rpc(anon, 'cron_pending', { p_key: CRON })).data;
ok(pend.subs.length === 1 && pend.changes.length === 1 && pend.notices.map(n => n.title).sort().join() === 'Thông báo nghỉ học ngày 20/11,Tin trường B', 'Lấy được việc cần gửi: 1 máy, 1 thay đổi, 2 tin mới');
ok(pend.tkb.length === 2 && pend.settings.periods.length === 12, 'Có TKB hiện tại và giờ tiết học để nhắc');
ok(pend.vapid.private === priv, 'Máy chạy ngầm lấy được khóa ký thông báo');
r = await rpc(anon, 'cron_done', { p_key: CRON, p_changes: pend.changes.map(c => c.id), p_notices: pend.notices.map(n => n.id), p_reminders: ['class|2026-11-30|PHY00001'], p_gone: [], p_ok: ['https://push.example/1'], p_summary: { sent: 3 } });
ok(!r.error, 'Đánh dấu đã gửi');
const pend2 = (await rpc(anon, 'cron_pending', { p_key: CRON })).data;
ok(pend2.changes.length === 0 && pend2.notices.length === 0 && pend2.sent.includes('class|2026-11-30|PHY00001'), 'Không gửi lại lần 2, nhớ lời nhắc đã gửi');
await rpc(anon, 'cron_done', { p_key: CRON, p_changes: [], p_notices: [], p_reminders: [], p_gone: ['https://push.example/1'], p_ok: [], p_summary: {} });
eq((await rpc(anon, 'cron_pending', { p_key: CRON })).data.subs, [], 'Máy hết hạn đăng ký thông báo thì bị xóa');

console.log('\n6. Việc cần làm, cài đặt, xem');
r = await me.from('tasks').insert({ title: 'Nộp báo cáo thí nghiệm', course: 'PHY00001', due_at: new Date(Date.now() + 864e5).toISOString() }).select().single();
ok(!r.error, 'Thêm việc cần làm');
ok((await stranger().from('tasks').insert({ title: 'x' })).error, 'Người lạ không thêm được việc');
const st = (await me.from('settings').select('data').single()).data.data; st.remind_class_min = 45;
ok(!(await me.from('settings').update({ data: st }).eq('id', 1)).error && (await me.from('settings').select('data').single()).data.data.remind_class_min === 45, 'Chủ sửa cài đặt (nhắc trước 45 phút)');
await me.rpc('mark_seen', { p_what: 'changes' });
ok((await me.from('changes').select('seen')).data.every(x => x.seen), 'Đánh dấu đã xem tất cả thay đổi');
const ps = (await me.rpc('push_status')).data; ok(ps.last_sync && ps.sync_key_at, 'Trạng thái: biết lần đồng bộ gần nhất');
r = await rpc(me, 'reset_study_data', { p_confirm: 'xoa' }); ok(r.error?.includes('XÓA'), 'Xóa dữ liệu phải gõ XÓA');
r = await rpc(me, 'reset_study_data', { p_confirm: 'XÓA' });
ok(!r.error && (await me.from('snapshots').select('id')).data.length === 0 && (await me.from('tasks').select('id')).data.length === 1, 'Xóa dữ liệu học tập, giữ việc cần làm');

console.log(`\nKẾT QUẢ: ${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
