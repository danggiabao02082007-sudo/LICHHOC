// Kiểm thử máy chạy ngầm (đọc tin + nhắc + gửi thông báo đẩy thật tới 1 "điện thoại giả")
// Chạy sau tests/db.test.mjs (cần Supabase cục bộ): SB_ANON=… SB_SERVICE=… VAPID_PUBLIC=… VAPID_PRIVATE=… node tests/cron.test.mjs
import { createClient } from '@supabase/supabase-js';
import { execSync, spawn } from 'node:child_process';
import webpush from 'web-push';
import { createHash, createECDH, randomBytes } from 'node:crypto';
import https from 'node:https';
import { dueReminders, parseSitemap, parseWpPosts, ogMeta, IMPORTANT } from '../scripts/cron.mjs';
import { normalize, hashRows } from '../src/lib/portal.js';
const URL = 'http://127.0.0.1:54321', ANON = process.env.SB_ANON;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✔', m); } else { fail++; console.log('  ✘', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (được ${JSON.stringify(a)}, mong đợi ${JSON.stringify(b)})`);
const psql = sql => execSync(`docker exec -i supabase_db_lichhoc psql -U postgres -At`, { input: sql }).toString().trim();

console.log('1. Đọc tin (dữ liệu mẫu)');
const wp = parseWpPosts([{ id: 5, date: '2026-11-26T16:25:25', link: 'https://hcmus.edu.vn/a/', title: { rendered: 'Thông báo đăng ký học phần HK2 &#8211; 2026' }, excerpt: { rendered: '<p>Nội dung</p>' } }]);
eq([wp[0].uid, wp[0].title, wp[0].date], ['wp5', 'Thông báo đăng ký học phần HK2 – 2026', '2026-11-26T09:25:25.000Z'], 'Tin trường: tiêu đề, giờ VN → UTC');
const sm = parseSitemap(`<urlset><url><loc>https://phys.hcmus.edu.vn</loc><lastmod>2026-11-26</lastmod></url><url><loc>https://phys.hcmus.edu.vn/tin-tuc/bai-cu</loc><lastmod>2026-11-20T01:00:00Z</lastmod></url><url><loc>https://phys.hcmus.edu.vn/tin-tuc/bai-moi</loc><lastmod>2026-11-26T01:00:00Z</lastmod></url><url><loc>https://phys.hcmus.edu.vn/nganh-hoc/x</loc></url></urlset>`);
eq(sm.map(x => [x.uid, x.url]), [['bai-moi', 'https://phys.hcmus.edu.vn/vi/tin-tuc/bai-moi'], ['bai-cu', 'https://phys.hcmus.edu.vn/vi/tin-tuc/bai-cu']], 'Tin khoa: chỉ lấy bài tin tức, mới nhất trước');
eq(ogMeta('<meta property="og:title" content="Workshop AI &amp; vật lý"/>', 'title'), 'Workshop AI & vật lý', 'Đọc tiêu đề bài khoa');
ok(IMPORTANT.test('Thông báo lịch thi cuối kỳ') && !IMPORTANT.test('Nghiệm thu đề tài KH&CN cấp ĐHQG'), 'Chỉ đẩy tin trường liên quan học vụ');

console.log('\n2. Tính lời nhắc');
const now = new Date('2026-11-30T00:10:00Z');          // 07:10 sáng thứ 2 (giờ VN)
const P = { settings: { remind_class_min: 30, periods: [['07:30', '08:20']] }, sent: [],
  tkb: [{ code: 'PHY00001', name: 'Vật lý đại cương 1', day: 2, p1: 1, p2: 3, room: 'E201', start: '2026-09-08', end: '2026-12-20' }, { code: 'X', name: 'Môn thứ 3', day: 3, p1: 1 }],
  lichthi: [[{ code: 'MTH00010', name: 'Giải tích 1A', date: '2026-11-30', time: '13:30', room: 'F201' }]], tasks: [{ id: 't1', title: 'Nộp báo cáo', due_at: '2026-11-30T10:00:00Z' }] };
const R = dueReminders(P, now);
eq(R.map(r => r.key), ['class|2026-11-30|PHY00001|1', 'exam0|2026-11-30|MTH00010', 'task|t1|2026-11-30T10:00:00Z'], 'Nhắc: học lúc 07:30, hôm nay thi, việc sắp hạn');
ok(R[0].body.includes('E201') && R[1].body.includes('13:30'), 'Lời nhắc có phòng và giờ');
eq(dueReminders({ ...P, sent: R.map(r => r.key) }, now), [], 'Không nhắc lại lần 2');
eq(dueReminders({ ...P, lichthi: [] , tasks: [] }, new Date('2026-11-29T00:10:00Z')).length, 0, 'Chủ nhật không có tiết → không nhắc');
eq(dueReminders({ ...P, tasks: [], tkb: [] }, new Date('2026-11-29T12:00:00Z')).map(r => r.key), ['exam1|2026-11-30|MTH00010'], '19:00 hôm trước: nhắc "ngày mai thi"');
eq(dueReminders({ ...P, lichthi: [], tasks: [] }, new Date('2026-12-21T00:10:00Z')).length, 0, 'Hết đợt học (sau ngày kết thúc) → không nhắc');

console.log('\n3. Chạy thật: Supabase cục bộ + gửi thông báo đẩy tới điện thoại giả');
const got = [];
// "điện thoại giả": máy chủ HTTPS chứng chỉ tự ký (dịch vụ đẩy thật luôn là HTTPS)
execSync('openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/lh-key.pem -out /tmp/lh-cert.pem -days 1 -subj /CN=127.0.0.1 2>/dev/null');
const { readFileSync } = await import('node:fs');
const srv = https.createServer({ key: readFileSync('/tmp/lh-key.pem'), cert: readFileSync('/tmp/lh-cert.pem') }, (q, r) => { let b = []; q.on('data', c => b.push(c)); q.on('end', () => { got.push({ h: q.headers, n: Buffer.concat(b).length }); r.writeHead(201); r.end(); }); });
await new Promise(r => srv.listen(8907, r));
const me = createClient(URL, ANON, { auth: { persistSession: false } });
await me.auth.signUp({ email: 'cron@test.vn', password: 'Matkhau@123' }).catch(() => {});
let { error } = await me.auth.signInWithPassword({ email: 'cron@test.vn', password: 'Matkhau@123' });
if (error) { psql('delete from auth.users;'); await me.auth.signUp({ email: 'cron@test.vn', password: 'Matkhau@123' }); await me.auth.signInWithPassword({ email: 'cron@test.vn', password: 'Matkhau@123' }); }
const KEY = (await me.rpc('new_sync_key')).data;
// buổi học bắt đầu sau 20 phút (giờ VN), thứ hôm nay
const v = new Date(Date.now() + 7 * 3600e3), hh = new Date(v.getTime() + 20 * 60e3), w = v.getUTCDay(), today = v.toISOString().slice(0, 10);
const start = `${String(hh.getUTCHours()).padStart(2, '0')}:${String(hh.getUTCMinutes()).padStart(2, '0')}`;
const st = (await me.from('settings').select('data').single()).data.data; st.periods = [[start, '23:59']]; await me.from('settings').update({ data: st }).eq('id', 1);
const rows = normalize('tkb', { headers: ['Mã MH', 'Tên môn học', 'Thứ', 'Tiết', 'Phòng'], rows: [['PHY00001', 'Vật lý đại cương 1', w === 0 ? 'CN' : `Thứ ${w + 1}`, '1-3', 'E201']] });
await me.rpc('ingest', { p_key: KEY, p_items: [{ kind: 'tkb', term: 'HK1 2026-2027', rows, hash: hashRows(rows), changes: [] }] });
await me.rpc('ingest', { p_key: KEY, p_items: [{ kind: 'tkb', term: 'HK1 2026-2027', rows: rows.map(r => ({ ...r, room: 'B105' })), hash: 'h2', changes: [{ type: 'room', title: 'Đổi phòng học: Vật lý đại cương 1', detail: ['Trước: E201', 'Sau: B105'] }] }] });
const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
await me.rpc('save_push_sub', { p_sub: { endpoint: 'https://127.0.0.1:8907/push/abc', keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } }, p_device: 'test' });
await me.from('tasks').insert({ title: 'Nộp báo cáo thí nghiệm', due_at: new Date(Date.now() + 3 * 3600e3).toISOString() });
const CRON = (await me.rpc('new_cron_key')).data;
const vk = webpush.generateVAPIDKeys(); await me.rpc('set_vapid', { p_public: vk.publicKey, p_private: vk.privateKey, p_force: true });
const env = { ...process.env, VAPID_PUBLIC: '', VAPID_PRIVATE: '', SB_URL: URL, SB_ANON: ANON, CRON_KEY: CRON, APP_URL: 'https://example.test/lichhoc/', NODE_TLS_REJECT_UNAUTHORIZED: '0', NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' };
// chạy song song (không chặn "điện thoại giả" đang lắng nghe trong cùng tiến trình)
const runCron = (e = env) => new Promise(res => { const c = spawn('node', ['scripts/cron.mjs'], { env: e }); let o = ''; c.stdout.on('data', d => o += d); c.stderr.on('data', d => o += d); c.on('close', status => res({ status, out: o })); });
let run = await runCron();
const out = run.out;
ok(run.status === 0, 'Máy chạy ngầm chạy xong không lỗi ' + (run.status ? out.slice(-300) : ''));
ok(!/Lỗi/.test(out), 'Không có lỗi gửi hay đọc tin ' + (out.match(/Lỗi.*/) || [''])[0]);
ok(/Trường: đọc được \d+ tin/.test(out), 'Đọc được tin trường từ mạng thật');
ok(!/Vật lý đại cương|E201|B105|cron@test/.test(out), 'Nhật ký (công khai) không lộ nội dung cá nhân');
ok(got.length >= 3, `Điện thoại giả nhận ${got.length} thông báo đẩy (đổi phòng + sắp vào học + việc sắp hạn)`);
ok(got.every(g => g.h['content-encoding'] === 'aes128gcm' && g.h.authorization?.startsWith('vapid ') && g.n > 50), 'Thông báo được mã hóa và ký VAPID đúng chuẩn');
const firstCount = got.length;
const noticeSeen = psql("select count(*) filter (where pushed) || '/' || count(*) from notices where source='truong';");
ok(/^(\d+)\/\1$/.test(noticeSeen) && noticeSeen !== '0/0', `Lần đầu: tin trường cũ không dội thông báo (${noticeSeen} đã đánh dấu)`);
run = await runCron();
ok(run.status === 0 && got.length === firstCount, `Chạy lần 2: không gửi trùng (lần 1: ${firstCount}, sau lần 2: ${got.length})`); if (got.length !== firstCount) console.log(run.out.split('\n').filter(l => /Xong|Lỗi/.test(l)).join('\n'));
ok(psql("select count(*) from changes where not pushed;") === '0', 'Thay đổi đã đánh dấu đã gửi');
await me.rpc('ingest', { p_key: KEY, p_items: [{ kind: 'tkb', term: 'HK1 2026-2027', rows, hash: 'h3', changes: [{ type: 'room', title: 'Đổi phòng lần 2', detail: [] }] }] });
srv.close();
run = await runCron();
ok(run.status === 0 && psql("select count(*) from changes where not pushed;") === '1', 'Điện thoại không nhận được (dịch vụ lỗi) → giữ lại để gửi lần sau, không mất thông báo');
console.log(`\nKẾT QUẢ: ${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
