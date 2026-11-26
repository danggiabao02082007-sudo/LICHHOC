// =====================================================================
// MÁY CHẠY NGẦM (GitHub Actions, mỗi 30 phút)
//  1) Đọc tin mới: trường (hcmus.edu.vn, giao diện dữ liệu WordPress) + Khoa Vật lý – VLKT (phys.hcmus.edu.vn sitemap)
//  2) Nhắc: sắp vào học, mai thi / hôm nay thi, việc sắp đến hạn
//  3) Gửi thông báo đẩy cho thay đổi lịch học/lịch thi/điểm + tin mới
// Repo công khai → nhật ký chỉ in SỐ LƯỢNG, không in nội dung cá nhân.
// Thiếu cấu hình Supabase → chạy thử phần đọc tin rồi dừng (không lỗi).
// =====================================================================
const { SB_URL, SB_ANON, CRON_KEY, VAPID_PUBLIC, VAPID_PRIVATE } = process.env;
const APP_URL = process.env.APP_URL || 'https://danggiabao02082007-sudo.github.io/lichhoc/';
const UA = 'Mozilla/5.0 (compatible; LichHocBot/1.0; +' + APP_URL + ')';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// Từ khóa tin trường đáng báo (tin trường đăng rất nhiều, chỉ đẩy tin liên quan học vụ)
export const IMPORTANT = /thông báo|học phần|lịch thi|thi cuối|thi giữa|học phí|đăng ký|học bổng|nghỉ học|lịch nghỉ|tốt nghiệp|thời khóa biểu|học kỳ|sinh viên/i;

const decode = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&#8211;/g, '–').replace(/&#8217;/g, '’')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? m[1] : ''; };

/** RSS WordPress của trường */
export function parseRss(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const it = m[1], link = decode(tag(it, 'link')), pub = decode(tag(it, 'pubDate'));
    return { uid: decode(tag(it, 'guid')) || link, title: decode(tag(it, 'title')), url: link, date: pub ? new Date(pub).toISOString() : null, summary: decode(tag(it, 'description')).slice(0, 300) };
  }).filter(x => x.title && x.url);
}
/** Tin trường qua giao diện dữ liệu WordPress (trang trường không có RSS) */
export const parseWpPosts = arr => (Array.isArray(arr) ? arr : []).map(p => ({ uid: 'wp' + p.id, title: decode(p.title?.rendered), url: p.link,
  date: p.date ? new Date(p.date + '+07:00').toISOString() : null, summary: decode(p.excerpt?.rendered).slice(0, 300) })).filter(x => x.title && x.url);
/** Sitemap trang khoa: các bài /tin-tuc/<slug>, mới nhất trước */
export function parseSitemap(xml, limit = 12) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => ({ loc: decode(tag(m[1], 'loc')), lastmod: decode(tag(m[1], 'lastmod')) }))
    .filter(x => /\/tin-tuc\/[^/]+$/.test(x.loc)).sort((a, b) => (b.lastmod || '').localeCompare(a.lastmod || '')).slice(0, limit)
    .map(x => ({ uid: x.loc.split('/tin-tuc/')[1], url: x.loc.replace(/\/(vi\/|en\/)?tin-tuc\//, '/vi/tin-tuc/'), date: x.lastmod || null }));
}
export const ogMeta = (html, p) => decode((html.match(new RegExp(`<meta[^>]+property="og:${p}"[^>]+content="([^"]*)"`)) || [])[1] || '');

async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${url.split('/')[2]} trả ${r.status}`);
  return r.text();
}
async function rpc(fn, args) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SB_ANON, authorization: `Bearer ${SB_ANON}`, 'content-type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(30000) });
  const t = await r.text(); if (!r.ok) throw new Error(`${fn}: ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

// ---------- Giờ Việt Nam ----------
const VN = 7 * 3600e3;
const vnNow = () => new Date(Date.now() + VN);               // dùng getUTC* để đọc giờ VN
const isoVN = d => d.toISOString().slice(0, 10);
const atVN = (iso, hhmm) => new Date(Date.parse(`${iso}T${hhmm}:00Z`) - VN);   // thời điểm thật
const dow = d => { const w = d.getUTCDay(); return w === 0 ? 8 : w + 1; };       // 2..8 (8 = CN)

/** Các lời nhắc đến hạn ở lần chạy này (cửa sổ = phút nhắc + 35 phút vì lịch chạy có thể trễ) */
export function dueReminders(p, now = new Date()) {
  const out = [], s = p.settings || {}, periods = s.periods || [], sent = new Set(p.sent || []);
  const v = new Date(now.getTime() + VN), today = isoVN(v), win = ((s.remind_class_min ?? 30) + 35) * 60e3;
  const push = (key, title, body) => { if (!sent.has(key)) out.push({ key, title, body }); };
  if ((s.remind_class_min ?? 30) > 0) for (const c of p.tkb || []) {
    if (!c.p1 || c.day !== dow(v)) continue;
    if ((c.start && today < c.start) || (c.end && today > c.end)) continue;
    const t = periods[c.p1 - 1]?.[0]; if (!t) continue;
    const at = atVN(today, t), dt = at - now;
    if (dt >= 0 && dt <= win) push(`class|${today}|${c.code || c.name}|${c.p1}`, `Sắp vào học lúc ${t}`, `${c.name || c.code}${c.room ? ` · phòng ${c.room}` : ''} · tiết ${c.p1}${c.p2 && c.p2 !== c.p1 ? '-' + c.p2 : ''}`);
  }
  if (s.remind_exam !== false) for (const e of (p.lichthi || []).flat()) {
    if (!e.date) continue;
    const tomorrow = isoVN(new Date(v.getTime() + 864e5)), h = v.getUTCHours();
    const what = `${e.name || e.code}${e.time ? ` lúc ${e.time}` : ''}${e.room ? ` · phòng ${e.room}` : ''}${e.seat ? ` · SBD ${e.seat}` : ''}`;
    if (e.date === tomorrow && h >= 18) push(`exam1|${e.date}|${e.code || e.name}`, '📝 Ngày mai thi', what);
    if (e.date === today && h >= 5 && (!e.time || atVN(today, e.time) > now)) push(`exam0|${e.date}|${e.code || e.name}`, '📝 Hôm nay thi', what);
  }
  if (s.remind_task !== false) for (const t of p.tasks || []) {
    const due = Date.parse(t.due_at), left = due - now;
    if (left > 0 && left <= 24 * 3600e3) push(`task|${t.id}|${t.due_at}`, '⏰ Sắp đến hạn', `${t.title}${t.course ? ` (${t.course})` : ''} · còn ${Math.max(1, Math.round(left / 3600e3))} giờ`);
  }
  return out;
}

async function main() {
  const summary = { truong: 0, khoa: 0, pushed: 0, reminders: 0, errors: 0 };
  const live = SB_URL && SB_ANON && CRON_KEY;
  if (!live) log('Chưa có cấu hình Supabase → chỉ chạy thử phần đọc tin.');

  // 1) Tin trường
  try {
    const items = parseWpPosts(JSON.parse(await get('https://hcmus.edu.vn/wp-json/wp/v2/posts?per_page=20&_fields=id,date,link,title,excerpt')));
    log(`Trường: đọc được ${items.length} tin`);
    if (live) summary.truong = await rpc('cron_add_notices', { p_key: CRON_KEY, p_source: 'truong', p_items: items });
  } catch (e) { summary.errors++; log('Lỗi đọc tin trường:', e.message); }

  // 2) Tin khoa
  try {
    const list = parseSitemap(await get('https://phys.hcmus.edu.vn/sitemap.xml'));
    const known = new Set(live ? await rpc('cron_known', { p_key: CRON_KEY, p_source: 'khoa' }) : []);
    const fresh = list.filter(x => !known.has(x.uid));                  // ≤ 12 bài: xét đủ cả danh sách mỗi lần
    for (const x of fresh) { try { const h = await get(x.url); x.title = ogMeta(h, 'title').replace(/\s*[|–-]\s*Khoa Vật lý.*$/i, '') || x.uid; x.summary = ogMeta(h, 'description').slice(0, 300); } catch { x.title = x.uid; } }
    log(`Khoa: ${list.length} bài mới nhất, ${fresh.length} bài chưa có`);
    if (live && fresh.length) summary.khoa = await rpc('cron_add_notices', { p_key: CRON_KEY, p_source: 'khoa', p_items: fresh });
  } catch (e) { summary.errors++; log('Lỗi đọc tin khoa:', e.message); }

  if (!live) return;

  // 3) Thông báo đẩy
  const p = await rpc('cron_pending', { p_key: CRON_KEY });
  const s = p.settings || {};
  const msgs = [], doneChanges = [], doneNotices = [];
  for (const c of p.changes) { doneChanges.push(c.id); if (s.push_changes !== false) msgs.push({ title: c.kind === 'diem' ? '🎓 ' + c.title : '🔔 ' + c.title, body: (c.detail || []).join('\n'), url: APP_URL + '#changes', tag: 'change-' + c.id }); }
  for (const n of p.notices) {
    doneNotices.push(n.id);
    if (s.push_notices === false || (n.source === 'truong' && !IMPORTANT.test(n.title))) continue;
    msgs.push({ title: { portal: '📢 Portal', truong: '🏫 Trường', khoa: '⚛️ Khoa Vật lý' }[n.source] || '📢 Thông báo', body: n.title, url: n.url || APP_URL + '#notices', tag: 'notice-' + n.id });
  }
  const rem = dueReminders(p);
  for (const r of rem) msgs.push({ title: r.title, body: r.body, url: APP_URL, tag: r.key });
  summary.reminders = rem.length;

  const gone = [], okEp = [];
  let delivered = !p.subs.length;                 // không có máy nhận → coi như xong (vẫn xem được trong app)
  if (msgs.length && p.subs.length) {
    // Khóa ký thông báo: app tạo trên máy chủ app và lưu trong CSDL; biến môi trường (nếu có) được ưu tiên
    const vPub = VAPID_PUBLIC || p.vapid?.public, vPriv = VAPID_PRIVATE || p.vapid?.private;
    if (!vPub || !vPriv) throw new Error('Thiếu khóa ký thông báo (mở app → Cài đặt → Thông báo để tạo)');
    const webpush = (await import('web-push')).default;
    webpush.setVapidDetails(APP_URL, vPub, vPriv);
    const batch = msgs.length > 6 ? [...msgs.slice(0, 5), { title: `🔔 Còn ${msgs.length - 5} tin khác`, body: 'Mở app để xem', url: APP_URL, tag: 'more' }] : msgs;
    for (const sub of p.subs) for (const m of batch) {
      try { await webpush.sendNotification(sub, JSON.stringify(m), { TTL: 12 * 3600 }); summary.pushed++; delivered = true; if (!okEp.includes(sub.endpoint)) okEp.push(sub.endpoint); }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { gone.push(sub.endpoint); break; } summary.errors++; log('Lỗi gửi thông báo:', e.statusCode || e.message); }
    }
  }
  if (!msgs.length) delivered = true;
  // Gửi hỏng hết (mạng/dịch vụ lỗi) → KHÔNG đánh dấu đã gửi, lần chạy sau gửi lại
  if (gone.length === p.subs.length && p.subs.length) delivered = true;          // mọi máy đã hủy đăng ký: không cần gửi lại
  await rpc('cron_done', { p_key: CRON_KEY, p_changes: delivered ? doneChanges : [], p_notices: delivered ? doneNotices : [], p_reminders: delivered ? rem.map(r => r.key) : [],
    p_gone: gone, p_ok: okEp, p_summary: { ...summary, retry: !delivered } });
  log('Xong:', JSON.stringify(summary), `· ${p.subs.length} máy nhận thông báo`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { log('LỖI:', e.message); process.exit(1); });
