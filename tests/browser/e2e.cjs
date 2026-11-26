// Thử trọn vòng: app + portal giả lập + tiện ích (Tampermonkey giả lập) + Supabase cục bộ
// node tests/browser/e2e.cjs <thư mục dist> <thư mục ảnh> <anon key>
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [dist, out, ANON] = process.argv.slice(2);
const SB = 'http://127.0.0.1:54321';
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const serve = (root, port, cfg) => http.createServer((q, r) => {
  let p = path.join(root, q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (cfg !== undefined && p.endsWith('config.js')) { r.writeHead(200, { 'content-type': 'text/javascript' }); return r.end(cfg); }
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': T[path.extname(p)] || 'text/plain' }); r.end(d); } });
}).listen(port);
let room = 'E201';
const portal = http.createServer((q, r) => { const pages = require('../fixtures/portal/layout.cjs')(room); const k = q.url.split('?')[0].replace(/^\//, '');
  if (pages[k]) { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(pages[k]); } else { r.writeHead(404); r.end(); } }).listen(8892);
const appSrv = serve(dist, 8891, `window.APP_CONFIG={SUPABASE_URL:'${SB}',SUPABASE_ANON_KEY:'${ANON}'};`);
const bareSrv = serve(dist, 8893);
const res = []; const ok = (c, m) => { res.push([c, m]); console.log(c ? '  ✔' : '  ✘', m); };
const U = 'http://localhost:8891/';
const userscript = fs.readFileSync(path.join(dist, 'lichhoc.user.js'), 'utf8');
// Giả lập Tampermonkey: GM_* trên localStorage + GM_xmlhttpRequest bằng fetch
const gmShim = `window.GM_getValue=(k,d)=>{const v=localStorage.getItem('gm_'+k);return v===null?d:JSON.parse(v)};window.GM_setValue=(k,v)=>localStorage.setItem('gm_'+k,JSON.stringify(v));
window.GM_xmlhttpRequest=o=>fetch(o.url,{method:o.method,headers:o.headers,body:o.data}).then(async r=>o.onload({status:r.status,responseText:await r.text()})).catch(()=>o.onerror&&o.onerror());`;

(async () => {
  const b = await chromium.launch(); const errs = [];
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); };

  console.log('1. Chưa nối cơ sở dữ liệu → màn hình hướng dẫn');
  const p0 = await b.newPage(); watch(p0); await p0.goto('http://localhost:8893/'); await p0.waitForTimeout(800);
  ok(await p0.locator('text=App chưa được nối với cơ sở dữ liệu').count() === 1, 'Hiện hướng dẫn tạo project Supabase');
  await p0.close();

  console.log('\n2. Tạo tài khoản lần đầu, đăng nhập');
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { localStorage.setItem('lichhoc.theme', 'normal'); localStorage.setItem('lichhoc.motion', 'off'); });
  const p = await ctx.newPage(); watch(p);
  await p.goto(U); await p.click('button:has-text("Tạo tài khoản lần đầu")');
  await p.fill('input[type=email]', 'sv@test.vn'); await p.fill('input[autocomplete=new-password] >> nth=0', 'Matkhau@123'); await p.fill('input[autocomplete=new-password] >> nth=1', 'Matkhau@123');
  await p.click('button[type=submit], form button:not([type=button])'); await p.waitForSelector('text=/Chưa có dữ liệu thời khóa biểu/', { timeout: 15000 });
  ok(true, 'Tạo tài khoản, vào trang Hôm nay (chưa có dữ liệu)');
  await p.screenshot({ path: `${out}/1_trong.png` });

  console.log('\n3. Tạo mã kết nối, tiện ích đồng bộ từ portal giả lập');
  await p.goto(U + '#sync'); await p.click('button:has-text("Tạo mã kết nối")'); await p.waitForSelector('textarea[readonly]');
  const code = await p.locator('textarea[readonly]').inputValue();
  ok(JSON.parse(Buffer.from(code, 'base64').toString()).k.length === 48, 'Mã kết nối chứa địa chỉ + khóa đồng bộ');
  const pp = await ctx.newPage(); watch(pp);
  await pp.addInitScript(gmShim);
  await pp.goto('http://localhost:8892/Default.aspx');
  await pp.evaluate(c => localStorage.setItem('gm_conn', JSON.stringify(c)), code);
  await pp.addScriptTag({ content: userscript });
  await pp.waitForFunction(() => /LICHHOC ✓|🔔|Lỗi/.test(document.querySelector('#lh-btn')?.textContent || ''), null, { timeout: 30000 });
  const btn = await pp.locator('#lh-btn').textContent();
  ok(/✓|🔔/.test(btn) && !/Lỗi/.test(btn), 'Tiện ích tự quét các trang và đồng bộ xong: ' + btn);
  await pp.click('#lh-btn'); await pp.waitForTimeout(300);
  const card = await pp.locator('#lh-card').innerText();
  ok(/TKB HK1 2026-2027 \(6\)/.test(card) && /Lịch thi HK1 2026-2027 \(3\)/.test(card) && /Điểm/.test(card), 'Đọc được TKB 6 buổi, lịch thi 3 môn, điểm: ' + card.replace(/\n/g,' | '));
  await pp.screenshot({ path: `${out}/2_tien_ich.png` });

  console.log('\n4. App hiện dữ liệu');
  await p.goto(U + '#today'); await p.reload(); await p.waitForTimeout(1500);
  ok(await p.locator('text=Buổi học tuần này').count() === 1 && await p.locator('text=/Chưa có dữ liệu thời khóa/').count() === 0, 'Trang Hôm nay có số liệu');
  await p.screenshot({ path: `${out}/3_hom_nay.png`, fullPage: true });
  await p.goto(U + '#week'); await p.waitForTimeout(1200);
  ok(await p.locator('text=Vật lý đại cương 1').count() >= 1 && await p.locator('text=📍 E201').count() >= 1, 'TKB tuần: có môn và phòng');
  await p.screenshot({ path: `${out}/4_tkb.png` });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text(".ics")')]);
  const ics = fs.readFileSync(await dl.path(), 'utf8');
  ok(ics.includes('BEGIN:VCALENDAR') && (ics.match(/BEGIN:VEVENT/g) || []).length === 9 && ics.includes('RRULE:FREQ=WEEKLY;BYDAY=MO'), 'Xuất .ics: 6 buổi học lặp hàng tuần + 3 lịch thi (' + (ics.match(/BEGIN:VEVENT/g) || []).length + ' sự kiện, ' + (ics.match(/RRULE[^\r]*/g)||[]).join(' ') + ')');
  await p.goto(U + '#exams'); await p.waitForTimeout(1000);
  ok(await p.locator('text=Môn thi gần nhất').count() === 1 && await p.locator('text=SBD 012').count() >= 1, 'Lịch thi: môn gần nhất, số báo danh');
  await p.screenshot({ path: `${out}/5_lich_thi.png` });
  await p.goto(U + '#grades'); await p.waitForTimeout(1000);
  ok(await p.locator('text=8.00').count() >= 1, 'Điểm TB = (4×7,5 + 2×9) ÷ 6 = 8,00 (không tính GDTC)');
  await p.screenshot({ path: `${out}/6_diem.png` });
  await p.goto(U + '#notices'); await p.waitForTimeout(1000);
  ok(await p.locator('text=Thông báo lịch thi cuối kỳ học kỳ 1 năm học 2026-2027').count() >= 1, 'Thông báo portal được lưu');

  console.log('\n5. Portal đổi phòng học → app báo thay đổi');
  room = 'B105';
  await pp.click('#lh-now'); await pp.waitForFunction(() => /🔔|LICHHOC ✓|Lỗi/.test(document.querySelector('#lh-btn')?.textContent || '') && !/Đang/.test(document.querySelector('#lh-btn').textContent), null, { timeout: 30000 });
  ok((await pp.locator('#lh-btn').textContent()).includes('🔔'), 'Tiện ích báo có thay đổi: ' + await pp.locator('#lh-btn').textContent());
  await p.goto(U + '#changes'); await p.reload(); await p.waitForTimeout(1200);
  ok(await p.locator('text=Đổi phòng học: Vật lý đại cương 1').count() === 1 && await p.locator('text=Sau: Thứ 2, tiết 1-3, phòng B105').count() === 1, 'Trang Thay đổi: đổi phòng E201 → B105');
  ok(await p.locator('aside >> text=Thay đổi lịch >> xpath=.. >> span.bg-rose-500').count() + await p.locator('aside span.bg-rose-500').count() >= 1, 'Có chấm đỏ báo chưa xem');
  await p.screenshot({ path: `${out}/7_thay_doi.png` });

  console.log('\n6. Dán tay');
  await p.goto(U + '#sync'); await p.waitForTimeout(800);
  const txt = 'Lịch thi Học kỳ 1 năm học 2026-2027\nSTT\tMã MH\tTên môn học\tNgày thi\tGiờ thi\tPhòng thi\n1\tPHY00001\tVật lý đại cương 1\t06/01/2027\t7g30\tE305\n2\tMTH00010\tGiải tích 1A\t07/01/2027\t13:30\tF201\n3\tCHE00001\tHóa đại cương 1\t09/01/2027\t9g00\tE302';
  await p.fill('textarea[placeholder^="Dán nội dung"]', txt); await p.click('button:has-text("Đọc thử")');
  ok(await p.locator('text=📝 Lịch thi: 3 dòng').count() === 1, 'Đọc thử: nhận ra lịch thi 3 môn');
  await p.click('button:has-text("Lưu vào app")'); await p.waitForSelector('text=/Đã lưu: 1 bảng mới/', { timeout: 10000 });
  await p.goto(U + '#changes'); await p.reload(); await p.waitForTimeout(1000);
  ok(await p.locator('text=Lịch thi thay đổi: Vật lý đại cương 1').count() === 1, 'Dán lịch thi mới: phát hiện đổi ngày/phòng thi');

  console.log('\n7. Cài đặt, điện thoại');
  await p.goto(U + '#settings'); await p.waitForTimeout(800);
  ok(await p.locator('text=Giờ tiết học').count() === 1 && await p.locator('text=Chủ đề giao diện').count() === 1, 'Trang cài đặt đủ mục');
  const m = await b.newContext({ ...devices['iPhone 13'] }); await m.addInitScript(() => { localStorage.setItem('lichhoc.motion', 'off'); });
  const mp = await m.newPage(); watch(mp);
  await mp.goto(U); await mp.fill('input[type=email]', 'sv@test.vn'); await mp.fill('input[type=password]', 'Matkhau@123'); await mp.click('form button:not([type=button])');
  await mp.waitForSelector('text=Buổi học tuần này', { timeout: 15000 });
  const wide = [];
  for (const pg of ['today', 'week', 'exams', 'grades', 'notices', 'changes', 'tasks', 'sync', 'settings']) {
    await mp.goto(U + '#' + pg); await mp.waitForTimeout(700);
    const w = await mp.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (w[0] > w[1]) wide.push(pg + ':' + w);
    if (['today', 'week', 'exams'].includes(pg)) await mp.screenshot({ path: `${out}/m_${pg}.png`, fullPage: pg !== 'week' });
  }
  ok(!wide.length, 'Điện thoại: 9 trang không tràn ngang ' + wide.join(' '));
  ok(await mp.evaluate(() => getComputedStyle(document.documentElement).touchAction) === 'pan-y', 'Điện thoại: khóa phóng to, chỉ trượt dọc');
  ok(errs.length === 0, 'Không có lỗi JavaScript ' + JSON.stringify(errs.slice(0, 3)));
  await b.close(); [portal, appSrv, bareSrv].forEach(s => s.close());
  console.log(`\nKẾT QUẢ: ${res.filter(x => x[0]).length} đạt, ${res.filter(x => !x[0]).length} lỗi`);
  process.exit(res.every(x => x[0]) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
