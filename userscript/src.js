// Tiện ích Tampermonkey: chạy trên portal HCMUS khi BẠN đã tự đăng nhập (tự giải captcha).
// Không đọc/lưu mật khẩu. Chỉ đọc nội dung trang bạn đang xem + các trang TKB/lịch thi/điểm/thông báo trong cùng phiên.
import { extract, detectTerm, diff, hashRows, noticesFromLinks, norm } from '../src/lib/portal.js';

const APP = 'https://danggiabao02082007-sudo.github.io/LICHHOC/';
const AUTO_EVERY = 3 * 3600e3;                 // tự quét các trang tối đa 3 giờ/lần
const PAGES = /th[oờ]i kh[oó]a bi[eể]u|l[iị]ch thi|k[eế]t qu[aả] h[oọ]c t[aậ]p|b[aả]ng [đd]i[eể]m|tra c[uứ]u [đd]i[eể]m|th[oô]ng b[aá]o/i;

const get = (k, d) => { try { return GM_getValue(k, d); } catch { return d; } };
const set = (k, v) => { try { GM_setValue(k, v); } catch { /* bỏ qua */ } };
const cfg = () => { try { return JSON.parse(atob(get('conn', '') || '')); } catch { return null; } };

function api(fn, args) {
  const c = cfg();
  return new Promise((res, rej) => GM_xmlhttpRequest({
    method: 'POST', url: `${c.u}/rest/v1/rpc/${fn}`, data: JSON.stringify(args),
    headers: { apikey: c.a, authorization: `Bearer ${c.a}`, 'content-type': 'application/json' },
    onload: r => { if (r.status >= 200 && r.status < 300) res(r.responseText ? JSON.parse(r.responseText) : null); else { let m = r.responseText; try { m = JSON.parse(m).message; } catch { } rej(new Error(m || 'Lỗi ' + r.status)); } },
    onerror: () => rej(new Error('Không kết nối được máy chủ app'))
  }));
}

// ---------- Đọc 1 trang ----------
// Trang tải ngầm (DOMParser) không được hiển thị nên innerText không giữ <br>: tự đọc chữ, <br>/khối → xuống dòng
const BLOCK = /^(DIV|P|LI|TR|H\d)$/;
const cellText = td => {
  let s = '';
  const walk = n => { for (const c of n.childNodes) {
    if (c.nodeType === 3) s += c.nodeValue.replace(/\s+/g, ' ');
    else if (c.nodeType === 1) { if (c.tagName === 'BR') { s += '\n'; continue; } if (/^(SCRIPT|STYLE)$/.test(c.tagName)) continue;
      const b = BLOCK.test(c.tagName); if (b && s && !s.endsWith('\n')) s += '\n'; walk(c); if (b && !s.endsWith('\n')) s += '\n'; } } };
  walk(td);
  return s.replace(/\u00a0/g, ' ').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
};
function tablesOf(doc) {
  const out = [];
  for (const t of doc.querySelectorAll('table')) {
    if (t.querySelector('table')) continue;                               // chỉ bảng trong cùng
    const trs = [...t.querySelectorAll('tr')].filter(tr => tr.closest('table') === t);
    if (trs.length < 2) continue;
    const rows = trs.map(tr => [...tr.children].filter(x => /^(TD|TH)$/.test(x.tagName)).map(cellText));
    const hi = trs.findIndex(tr => tr.querySelector('th')) >= 0 ? trs.findIndex(tr => tr.querySelector('th')) : 0;
    if ((rows[hi] || []).length < 3) continue;
    out.push({ headers: rows[hi], rows: rows.slice(hi + 1).filter(r => r.length >= 3) });
  }
  return out;
}
function termOf(doc) {
  const sel = [...doc.querySelectorAll('select')].map(s => s.options?.[s.selectedIndex]?.text || '').join(' | ');
  return detectTerm(sel) || detectTerm((doc.body?.innerText ?? doc.body?.textContent ?? '').slice(0, 3000));
}
function noticesOf(doc, base) {
  const title = norm(doc.title + ' ' + (doc.querySelector('h1,h2,h3')?.textContent || ''));
  const boxes = [...doc.querySelectorAll('[id*="ThongBao" i],[class*="thongbao" i],[id*="News" i],[class*="news" i],[id*="Notice" i]')];
  const scope = boxes.length ? boxes : title.includes('thong bao') ? [doc.body] : [];
  const links = [];
  for (const b of scope) for (const a of b.querySelectorAll('a[href]')) {
    const row = a.closest('tr,li,div,p') || a.parentElement;
    links.push({ text: a.textContent, href: new URL(a.getAttribute('href'), base).href, context: row?.textContent || '' });
  }
  return noticesFromLinks(links);
}
function readDoc(doc, url) {
  const text = doc.body?.innerText ?? doc.body?.textContent ?? '';
  const { items, unknown } = extract(tablesOf(doc), doc.title + '\n' + text.slice(0, 4000));
  const term = termOf(doc);
  return { items: items.map(i => ({ ...i, term })), notices: noticesOf(doc, url), unknown, url };
}

// ---------- Gom nhiều trang, so với lần trước, gửi về app ----------
async function sync(pages, source = 'userscript') {
  const byKey = {}, notices = [], unknown = [];
  for (const p of pages) {
    for (const it of p.items) { const k = it.kind + '|' + it.term; (byKey[k] ||= { kind: it.kind, term: it.term, rows: [] }).rows.push(...it.rows); }
    notices.push(...p.notices); unknown.push(...p.unknown);
  }
  const prev = await api('latest_rows', { p_key: cfg().k });
  const items = Object.values(byKey).map(it => {
    const old = prev.find(x => x.kind === it.kind && x.term === it.term) || (it.term ? null : prev.find(x => x.kind === it.kind));
    return { ...it, hash: hashRows(it.rows), changes: diff(it.kind, old ? old.rows : null, it.rows) };
  });
  const r = await api('ingest', { p_key: cfg().k, p_items: items, p_notices: notices, p_source: source, p_url: location.href.slice(0, 200) });
  return { ...r, found: items.map(i => `${{ tkb: 'TKB', lichthi: 'Lịch thi', diem: 'Điểm' }[i.kind]}${i.term ? ' ' + i.term : ''} (${i.rows.length})`), nNotices: notices.length, unknown };
}

async function crawl() {
  const pages = [readDoc(document, location.href)];
  const links = [...document.querySelectorAll('a[href]')].filter(a => PAGES.test(a.textContent) && !/javascript:|logout|dang ?xuat/i.test(a.getAttribute('href')))
    .map(a => new URL(a.getAttribute('href'), location.href)).filter(u => u.origin === location.origin && u.href !== location.href);
  const uniq = [...new Map(links.map(u => [u.pathname + u.search, u])).values()].slice(0, 8);
  for (const u of uniq) {
    try {
      const r = await fetch(u.href, { credentials: 'include' }); if (!r.ok || /Login\.aspx/i.test(r.url)) continue;
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      pages.push(readDoc(doc, u.href));
      await new Promise(x => setTimeout(x, 800));                       // nhẹ nhàng với máy chủ trường
    } catch { /* bỏ qua trang lỗi */ }
  }
  return pages;
}

// ---------- Giao diện nhỏ góc màn hình ----------
const css = `#lh-box{position:fixed;right:14px;bottom:14px;z-index:2147483647;font:14px/1.4 system-ui,sans-serif}
#lh-btn{border:0;border-radius:999px;padding:10px 16px;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(79,70,229,.4);background:linear-gradient(90deg,#4F46E5,#DB2777)}
#lh-card{position:absolute;right:0;bottom:52px;width:330px;background:#fff;color:#1e1b4b;border-radius:16px;padding:14px;box-shadow:0 12px 32px rgba(0,0,0,.25);display:none}
#lh-card textarea{width:100%;height:70px;margin:6px 0;border:1px solid #c7d2fe;border-radius:10px;padding:6px;font:12px monospace}
#lh-card button{border:0;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;background:#4F46E5;color:#fff;margin-right:6px}
#lh-card small{color:#64748b}`;
let box, btn, card;
function ui() {
  if (box) return;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  box = document.createElement('div'); box.id = 'lh-box';
  box.innerHTML = '<div id="lh-card"></div><button id="lh-btn">📚 LICHHOC</button>';
  document.body.appendChild(box); btn = box.querySelector('#lh-btn'); card = box.querySelector('#lh-card');
  btn.onclick = () => { card.style.display = card.style.display === 'block' ? 'none' : 'block'; render(); };
}
const status = t => { btn.textContent = t; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function render(msg = '') {
  const c = cfg(), last = get('last', null);
  card.innerHTML = c ? `<b>📚 LICHHOC – đồng bộ portal</b><div style="margin:6px 0">${msg || (last ? `Lần đồng bộ gần nhất: ${new Date(last.at).toLocaleString('vi-VN')}<br>${esc(last.text)}` : 'Chưa đồng bộ lần nào.')}</div>
      <button id="lh-now">🔄 Đồng bộ ngay</button><button id="lh-reset" style="background:#e2e8f0;color:#1e1b4b">Đổi mã</button>
      <div style="margin-top:8px"><small>Tự quét các trang TKB, lịch thi, điểm, thông báo tối đa 3 giờ/lần khi bạn mở portal. Không đọc mật khẩu.</small></div>`
    : `<b>📚 Kết nối với app LICHHOC</b><div><small>Mở app → mục <b>Đồng bộ</b> → bấm <b>Tạo mã kết nối</b>, chép mã rồi dán vào đây.</small></div>
      <textarea id="lh-code" placeholder="Dán mã kết nối…"></textarea><button id="lh-save">Lưu</button> <a href="${APP}#sync" target="_blank">Mở app</a>`;
  card.querySelector('#lh-save')?.addEventListener('click', () => {
    const v = card.querySelector('#lh-code').value.trim();
    try { const j = JSON.parse(atob(v)); if (!j.u || !j.a || !j.k) throw 0; set('conn', v); render('✅ Đã kết nối. Bấm "Đồng bộ ngay".'); } catch { render('❌ Mã không đúng, hãy chép lại từ app.'); }
  });
  card.querySelector('#lh-now')?.addEventListener('click', () => run(true));
  card.querySelector('#lh-reset')?.addEventListener('click', () => { set('conn', ''); render(); });
}

async function run(force) {
  if (!cfg()) { status('📚 LICHHOC · chưa kết nối'); return; }
  const auto = force || Date.now() - (get('lastCrawl', 0) || 0) > AUTO_EVERY;
  status('📚 Đang đồng bộ…');
  try {
    const pages = auto ? await crawl() : [readDoc(document, location.href)];
    if (auto) set('lastCrawl', Date.now());
    const r = await sync(pages);
    const text = `${r.found.length ? r.found.join(', ') : 'Không thấy bảng TKB/lịch thi/điểm'}${r.nNotices ? ` · ${r.nNotices} thông báo` : ''}` +
      `${r.changes ? ` · 🔔 ${r.changes} thay đổi` : ''}${r.notices ? ` · ${r.notices} thông báo mới` : ''}${r.unknown.length ? ` · ${r.unknown.length} bảng chưa nhận dạng` : ''}`;
    set('last', { at: Date.now(), text });
    status(r.changes || r.notices ? `📚 🔔 ${r.changes + r.notices} mới` : '📚 LICHHOC ✓');
    if (card.style.display === 'block' || force) { card.style.display = 'block'; render('✅ ' + esc(text) + (r.unknown.length ? `<br><small>Bảng chưa nhận dạng có các cột: ${r.unknown.slice(0, 3).map(u => esc(u.headers.slice(0, 6).join(' | '))).join('<br>')}</small>` : '')); }
  } catch (e) { status('📚 Lỗi đồng bộ'); card.style.display = 'block'; render('❌ ' + esc(e.message)); }
}

if (!/Login\.aspx/i.test(location.pathname)) { ui(); run(false); }
