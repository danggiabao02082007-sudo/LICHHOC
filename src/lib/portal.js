// =====================================================================
// ĐỌC DỮ LIỆU PORTAL HCMUS (dùng chung cho app — dán tay — và tiện ích Tampermonkey)
// Không phụ thuộc trình duyệt: nhận bảng dạng mảng (headers + rows) rồi:
//   1) nhận dạng loại bảng: thời khóa biểu / lịch thi / kết quả học tập
//   2) chuẩn hóa từng dòng về trường thống nhất (mã môn, tên môn, thứ, tiết, phòng…)
//   3) so sánh với lần đồng bộ trước → danh sách thay đổi bằng tiếng Việt
// Vì chưa được xem trang thật của portal (cần đăng nhập), bộ đọc nhận cột theo TÊN CỘT
// (không theo vị trí) và luôn giữ nguyên mọi cột gốc trong `raw`.
// =====================================================================

/** Bỏ dấu, chữ thường, gộp khoảng trắng — để so tên cột */
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
  .toLowerCase().replace(/\s+/g, ' ').trim();
const clean = s => String(s ?? '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

// Từ khóa tên cột (đã bỏ dấu). Thứ tự = ưu tiên.
const COLS = {
  code: ['ma mon hoc', 'ma mh', 'ma hp', 'ma hoc phan', 'ma mon', 'mamh', 'ma'],
  group: ['ma lop', 'lop hoc phan', 'lop hp', 'nhom', 'lop', 'to'],
  name: ['ten mon hoc', 'ten mh', 'ten hoc phan', 'ten mon', 'mon hoc', 'hoc phan', 'ten'],
  credits: ['so tin chi', 'so tc', 'tin chi', 'stc', 'tc'],
  type: ['loai', 'ly thuyet/thuc hanh', 'lt/th', 'hinh thuc hoc'],
  schedule: ['lich hoc'],          // portal new-portal4: một ô "T6(3.5-5)-P.cs2:F202"
  day: ['thu'],
  periods: ['tiet'],
  room: ['phong hoc', 'phong'],
  dates: ['thoi gian hoc', 'thoi gian', 'tuan hoc', 'tuan'],
  start: ['tu ngay', 'ngay bat dau', 'bat dau', 'ngay bd'],
  end: ['den ngay', 'ngay ket thuc', 'ket thuc', 'ngay kt'],
  teacher: ['giang vien', 'giao vien', 'cbgd', 'gv'],
  examDate: ['ngay thi', 'ngay'],
  examTime: ['gio thi', 'gio bat dau', 'gio', 'ca thi', 'ca'],
  examRoom: ['phong thi', 'phong'],
  examForm: ['hinh thuc thi', 'hinh thuc'],
  seat: ['so bao danh', 'sbd'],
  duration: ['thoi luong', 'so phut', 'thoi gian lam bai'],
  grade: ['diem tong ket', 'diem tk', 'diem hp', 'diem hoc phan', 'tong ket', 'diem he 10', 'diem 10', 'diem'],
  grade4: ['diem he 4', 'diem 4', 'he 4'],
  letter: ['diem chu', 'chu'],
  result: ['ket qua', 'dat'],
  term: ['hoc ky', 'hk']
};
const pickCol = (headers, keys, used = new Set()) => {
  const H = headers.map(norm);
  for (const k of keys) {
    let i = H.findIndex((h, j) => !used.has(j) && h === k);
    if (i < 0) i = H.findIndex((h, j) => !used.has(j) && (h.startsWith(k + ' ') || h.endsWith(' ' + k) || h.includes(' ' + k + ' ')));
    if (i < 0 && k.length >= 4) i = H.findIndex((h, j) => !used.has(j) && h.includes(k));
    if (i >= 0) return i;
  }
  return -1;
};

// ---------- 1. Nhận dạng loại bảng ----------
const DAYS = ['thu 2', 'thu 3', 'thu 4', 'thu 5', 'thu 6', 'thu 7', 'chu nhat'];
const DAY_ALIASES = { 'thu hai': 2, 'thu ba': 3, 'thu tu': 4, 'thu nam': 5, 'thu sau': 6, 'thu bay': 7, 'chu nhat': 8, cn: 8, 'thu 2': 2, 'thu 3': 3, 'thu 4': 4, 'thu 5': 5, 'thu 6': 6, 'thu 7': 7, t2: 2, t3: 3, t4: 4, t5: 5, t6: 6, t7: 7 };
const isGrid = headers => headers.map(norm).filter(h => DAYS.includes(h) || DAY_ALIASES[h]).length >= 3;

export function classify(table, pageText = '') {
  const H = table.headers.map(norm).join(' | ');
  const P = norm(pageText).slice(0, 4000);
  if (isGrid(table.headers)) return 'tkb';
  const has = k => H.includes(k);
  if (has('ngay thi') || has('phong thi') || has('gio thi') || has('ca thi') || has('so bao danh') || (has('sbd') && has('ngay'))) return 'lichthi';
  if (has('lich hoc') && (has('mon') || has('ma mh') || has('hoc phan'))) return 'tkb';
  if ((has('diem') || has('ket qua')) && (has('mon') || has('hoc phan')) && !has('tiet')) return 'diem';
  if ((has('thu') && (has('tiet') || has('phong'))) || (has('tiet') && (has('mon') || has('hoc phan')))) return 'tkb';
  if (P.includes('lich thi') && (has('ngay') || has('phong'))) return 'lichthi';
  if ((P.includes('ket qua hoc tap') || P.includes('bang diem')) && has('mon')) return 'diem';
  if (P.includes('thoi khoa bieu') && (has('mon') || has('hoc phan'))) return 'tkb';
  return null;
}

// ---------- 2. Chuẩn hóa ----------
const DATE_RE = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
export const parseDate = s => {
  const m = String(s || '').match(DATE_RE); if (!m) return null;
  let [, d, mo, y] = m; y = y.length === 2 ? '20' + y : y;
  const dd = +d, mm = +mo, yy = +y;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
};
const allDates = s => [...String(s || '').matchAll(new RegExp(DATE_RE.source, 'g'))].map(m => parseDate(m[0])).filter(Boolean);
export const parseDay = s => {
  const n = norm(s).replace(/[().,]/g, ' ').trim();
  if (!n) return null;
  for (const [k, v] of Object.entries(DAY_ALIASES)) if (n === k || n.startsWith(k + ' ') || n.endsWith(' ' + k)) return v;
  const m = n.match(/(?:^|thu\s*)([2-8])(?:\b|$)/); if (m) return +m[1];
  if (n.includes('chu nhat') || n === 'cn') return 8;
  return null;
};
/** "1-3", "1 - 3", "1,2,3", "123", "7->9", "Tiết 1-3" → [1,3] */
export const parsePeriods = s => {
  const n = norm(s).replace(/tiet/g, '');
  let m = n.match(/(\d{1,2})\s*(?:-|–|->|den|→|~)\s*(\d{1,2})/); if (m) return [+m[1], +m[2]];
  const run = n.trim().match(/^(\d{3,})$/);                                // "123" → tiết 1..3 (viết liền)
  if (run) { const ds = run[1].split('').map(Number); if (ds.every((d, i) => i === 0 || d === ds[i - 1] + 1)) return [ds[0], ds[ds.length - 1]]; }
  const list = n.match(/\d{1,2}/g); if (!list) return null;
  const ns = list.map(Number); return [Math.min(...ns), Math.max(...ns)];
};
const parseTime = s => { const m = String(s || '').match(/(\d{1,2})\s*[h:gG]\s*(\d{2})?/); return m ? `${String(+m[1]).padStart(2, '0')}:${m[2] || '00'}` : null; };
const num = s => { const t = String(s ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/); return t ? Number(t[0]) : null; };
const dayName = d => d === 8 ? 'Chủ nhật' : `Thứ ${d}`;
export { dayName };

function baseRow(headers, row) {
  const raw = {}; headers.forEach((h, i) => { const k = clean(h) || `Cột ${i + 1}`; if (row[i] != null && clean(row[i]) !== '') raw[k] = clean(row[i]); });
  return raw;
}

/** "T6(3.5-5)-P.cs2:F202; T2(1-3)-P.cs1:E201" → [{day, p1, p2, room, campus}] (tiết có thể lẻ .5) */
export function parseSchedule(s) {
  const out = [], re = /\bT\s*([2-8]|CN)\s*\(\s*(\d+(?:[.,]\d+)?)\s*(?:-|–|->)\s*(\d+(?:[.,]\d+)?)\s*\)(?:\s*-\s*P\.?\s*(?:(cs\s*\d+)\s*:\s*)?([^\s;,|]+))?/gi;
  for (const m of String(s || '').matchAll(re)) {
    const campus = (m[4] || '').replace(/\s/g, '').toUpperCase();
    out.push({ day: /cn/i.test(m[1]) ? 8 : +m[1], p1: +m[2].replace(',', '.'), p2: +m[3].replace(',', '.'), room: m[5] ? m[5] + (campus ? ` · ${campus}` : '') : '' });
  }
  return out;
}

function normTkbList(t) {
  const H = t.headers, used = new Set(), col = k => { const i = pickCol(H, COLS[k], used); if (i >= 0) used.add(i); return i; };
  const sch = col('schedule');
  const c = { code: col('code'), name: col('name'), group: col('group'), credits: col('credits'), type: col('type'), day: col('day'), periods: col('periods'),
    room: col('room'), start: col('start'), end: col('end'), dates: col('dates'), teacher: col('teacher') };
  const out = [];
  for (const r of t.rows) {
    const g = i => i >= 0 ? clean(r[i]) : '';
    if (sch >= 0) {                                                  // dạng gộp: mỗi buổi "T<thứ>(<tiết>-<tiết>)-P.<cơ sở>:<phòng>"
      const base = { code: g(c.code), name: g(c.name), group: g(c.group), credits: num(g(c.credits)), type: g(c.type), start: parseDate(g(c.start)), end: parseDate(g(c.end)), teacher: g(c.teacher), raw: baseRow(H, r) };
      if (!base.name && !base.code) continue;
      for (const s of parseSchedule(g(sch))) out.push({ ...base, ...s });
      continue;
    }
    // Một ô có thể chứa nhiều buổi xuống dòng: "Thứ 2\nThứ 5" + "1-3\n4-6" + "E201\nF102"
    const days = g(c.day).split('\n'), pers = g(c.periods).split('\n'), rooms = g(c.room).split('\n');
    const n = Math.max(days.length, pers.length, 1);
    for (let k = 0; k < n; k++) {
      const day = parseDay(days[k] ?? days[0]); const per = parsePeriods(pers[k] ?? pers[0]);
      const ds = allDates(g(c.dates)), start = parseDate(g(c.start)) || ds[0] || null, end = parseDate(g(c.end)) || ds[1] || null;
      const item = { code: g(c.code), name: g(c.name), group: g(c.group), credits: num(g(c.credits)), type: g(c.type), day, p1: per?.[0] ?? null, p2: per?.[1] ?? null,
        room: clean(rooms[k] ?? rooms[0] ?? ''), start, end, teacher: g(c.teacher), raw: baseRow(H, r) };
      if (!item.name && !item.code) continue;
      if (!item.day && !item.p1 && !item.room) continue;           // dòng tổng/ghi chú
      out.push(item);
    }
  }
  return out;
}

// Dạng lưới: cột = Thứ 2..CN, dòng = tiết/ca; ô = "Tên môn (Mã) - Phòng …"
function normTkbGrid(t) {
  const H = t.headers.map(norm), dayCols = H.map(h => DAY_ALIASES[h] || (DAYS.includes(h) ? DAYS.indexOf(h) + 2 : null));
  const out = [];
  t.rows.forEach(r => {
    const per = parsePeriods(r[0]);
    r.forEach((cell, i) => {
      const d = dayCols[i]; const txt = clean(cell); if (!d || !txt) return;
      const lines = txt.split('\n').map(clean).filter(Boolean);
      const code = (txt.match(/\b[A-Z]{2,4}\s?\d{3,6}[A-Z]?\b/) || [''])[0];
      const room = ((txt.match(/ph[oò]ng[:\s]*([A-Za-z0-9.\-]+)/i) || [])[1]) || (lines.find(l => /^[A-Z]{1,2}\d{1,2}[.\-]?\d{0,3}$/.test(l)) || '');
      const tiet = parsePeriods((txt.match(/ti[eế]t[:\s]*([\d\s\-–,>]+)/i) || [])[1] || '') || per;
      const name = lines.find(l => !/ph[oò]ng|ti[eế]t|gv|gi[aả]ng vi[eê]n/i.test(l) && l !== code) || lines[0];
      out.push({ code, name, group: '', credits: null, type: '', day: d, p1: tiet?.[0] ?? null, p2: tiet?.[1] ?? null, room, start: null, end: null, teacher: '', raw: { 'Ô lịch': txt, 'Tiết': clean(r[0]) } });
    });
  });
  // gộp các tiết liên tiếp cùng môn cùng ngày
  out.sort((a, b) => a.day - b.day || (a.code + a.name).localeCompare(b.code + b.name) || a.p1 - b.p1);
  const merged = [];
  for (const x of out) { const l = merged[merged.length - 1];
    if (l && l.day === x.day && l.name === x.name && l.code === x.code && l.room === x.room && x.p1 === l.p2 + 1) l.p2 = x.p2; else merged.push({ ...x }); }
  return merged;
}

function normExams(t) {
  const H = t.headers, used = new Set(), col = k => { const i = pickCol(H, COLS[k], used); if (i >= 0) used.add(i); return i; };
  const c = { code: col('code'), name: col('name'), group: col('group'), examDate: col('examDate'), examTime: col('examTime'), examRoom: col('examRoom'),
    examForm: col('examForm'), seat: col('seat'), duration: col('duration') };
  return t.rows.map(r => {
    const g = i => i >= 0 ? clean(r[i]) : '';
    const dt = g(c.examDate), tm = g(c.examTime);
    return { code: g(c.code), name: g(c.name), group: g(c.group), date: parseDate(dt) || parseDate(tm), time: parseTime(tm) || parseTime(dt.replace(DATE_RE, '')),
      timeText: tm, room: g(c.examRoom), form: g(c.examForm), seat: g(c.seat), duration: g(c.duration), raw: baseRow(H, r) };
  }).filter(x => (x.name || x.code) && (x.date || x.room || x.timeText));
}

function normGrades(t) {
  const H = t.headers, used = new Set(), col = k => { const i = pickCol(H, COLS[k], used); if (i >= 0) used.add(i); return i; };
  const c = { code: col('code'), name: col('name'), credits: col('credits'), grade4: col('grade4'), letter: col('letter'), grade: col('grade'), result: col('result'), term: col('term') };
  return t.rows.map(r => {
    const g = i => i >= 0 ? clean(r[i]) : '';
    const gr = num(g(c.grade));
    return { code: g(c.code), name: g(c.name), credits: num(g(c.credits)), grade: gr != null && gr >= 0 && gr <= 10 ? gr : null, grade4: num(g(c.grade4)),
      letter: g(c.letter), result: g(c.result), term: g(c.term), raw: baseRow(H, r) };
  }).filter(x => (x.name || x.code) && !/^(tong|trung binh|diem trung binh|tb)/.test(norm(x.name || x.code)));
}

export function normalize(kind, table) {
  if (kind === 'tkb') return isGrid(table.headers) ? normTkbGrid(table) : normTkbList(table);
  if (kind === 'lichthi') return normExams(table);
  if (kind === 'diem') return normGrades(table);
  return [];
}

// ---------- Học kỳ ----------
/** "Học kỳ 1 năm học 2026-2027", "HK1/2026-2027", "HK 2 - 2025-2026" → "HK1 2026-2027" */
export function detectTerm(text) {
  const n = norm(text);
  let m = n.match(/hoc ky\s*(\d|he)\D{0,20}?(\d{4})\s*[-–\/]\s*(\d{4})/) || n.match(/hk\s*(\d|he)\D{0,12}?(\d{4})\s*[-–\/]\s*(\d{4})/);
  if (m) return `HK${m[1] === 'he' ? 'Hè' : m[1]} ${m[2]}-${m[3]}`;
  m = n.match(/(\d{4})\s*[-–\/]\s*(\d{4})\D{0,12}?(?:hoc ky|hk)\s*(\d)/); if (m) return `HK${m[3]} ${m[1]}-${m[2]}`;
  return '';
}

// ---------- 3. Đọc bảng từ văn bản dán (Ctrl+A, Ctrl+C trên trang portal) ----------
/** Văn bản chép từ bảng HTML có các ô ngăn bằng dấu Tab. Gom các dòng ≥3 ô liền nhau thành bảng. */
export function tablesFromText(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const tables = []; let cur = null;
  for (const line of lines) {
    const cells = line.split('\t');
    if (cells.length >= 3 && cells.filter(c => c.trim()).length >= 2) {
      if (!cur) { cur = { rows: [] }; tables.push(cur); }
      cur.rows.push(cells.map(c => c.trim()));
    } else if (cur && line.trim() === '') { /* dòng trống trong bảng: bỏ qua */ }
    else cur = null;
  }
  return tables.filter(t => t.rows.length >= 2).map(t => {
    const hi = t.rows.findIndex(r => r.some(c => /[a-zA-ZÀ-ỹ]/.test(c)) && !r.some(c => DATE_RE.test(c)));
    const h = hi >= 0 ? hi : 0;
    return { headers: t.rows[h], rows: t.rows.slice(h + 1) };
  });
}

/** Đọc toàn bộ: trả về [{kind, rows, headers}] — bỏ qua bảng không nhận dạng được (đưa vào `unknown`) */
export function extract(tables, pageText = '') {
  const found = [], unknown = [];
  for (const t of tables) {
    const kind = classify(t, pageText);
    if (!kind) { unknown.push({ headers: t.headers, n: t.rows.length }); continue; }
    const rows = normalize(kind, t);
    if (rows.length) found.push({ kind, rows, headers: t.headers }); else unknown.push({ headers: t.headers, n: t.rows.length });
  }
  // nhiều bảng cùng loại (vd điểm từng học kỳ) → gộp
  const merged = {};
  for (const f of found) (merged[f.kind] ||= { kind: f.kind, rows: [], headers: f.headers }).rows.push(...f.rows);
  return { items: Object.values(merged), unknown };
}

// ---------- Thông báo trên portal (danh sách liên kết có ngày) ----------
/** links: [{text, href, context}] → [{uid, title, url, date}] */
export function noticesFromLinks(links) {
  const seen = new Set(), out = [];
  for (const l of links) {
    const title = clean(l.text); if (title.length < 12 || title.length > 300) continue;
    if (/dang xuat|trang chu|doi mat khau|huong dan|lien he|^thong bao$/.test(norm(title))) continue;
    const date = parseDate(l.context) || parseDate(title);
    const uid = norm(l.href || title).slice(0, 300); if (seen.has(uid)) continue; seen.add(uid);
    out.push({ uid, title, url: l.href || '', date });
  }
  return out;
}

// ---------- So sánh thay đổi ----------
const S = v => v == null ? '' : String(v);
const per = x => x.p1 ? (x.p2 && x.p2 !== x.p1 ? `tiết ${x.p1}-${x.p2}` : `tiết ${x.p1}`) : '';
const label = x => `${x.name || x.code}${x.code && x.name ? ` (${x.code})` : ''}${x.group ? ` – lớp ${x.group}` : ''}`;
const fmtD = iso => iso ? iso.split('-').reverse().join('/') : '';
const sess = x => [x.day ? dayName(x.day) : '', per(x), x.room ? `phòng ${x.room}` : ''].filter(Boolean).join(', ');

export function diff(kind, oldRows, newRows) {
  const ch = [];
  if (!oldRows) return ch;                         // lần đầu: không báo thay đổi
  if (kind === 'tkb') {
    const key = x => norm(x.code || x.name) + '|' + norm(x.group);
    const gOld = groupBy(oldRows, key), gNew = groupBy(newRows, key);
    for (const [k, list] of Object.entries(gNew)) {
      const prev = gOld[k];
      if (!prev) { ch.push({ type: 'add', title: `Môn mới trong thời khóa biểu: ${label(list[0])}`, detail: list.map(sess) }); continue; }
      const so = x => `${x.day}|${x.p1}|${x.p2}|${norm(x.room)}`;
      const A = new Set(prev.map(so)), B = new Set(list.map(so));
      if ([...A].join() !== [...B].join() || A.size !== B.size || [...A].some(x => !B.has(x))) {
        const before = prev.map(sess).join('; '), after = list.map(sess).join('; ');
        const onlyRoom = prev.length === list.length && prev.every((p, i) => p.day === list[i].day && p.p1 === list[i].p1 && p.p2 === list[i].p2);
        ch.push({ type: onlyRoom ? 'room' : 'time', title: `${onlyRoom ? 'Đổi phòng học' : 'Đổi lịch học'}: ${label(list[0])}`, detail: [`Trước: ${before}`, `Sau: ${after}`] });
      }
      const f = list[0], o = prev[0];
      if (S(f.start) !== S(o.start) || S(f.end) !== S(o.end)) ch.push({ type: 'dates', title: `Đổi ngày học: ${label(f)}`, detail: [`Trước: ${fmtD(o.start)} – ${fmtD(o.end)}`, `Sau: ${fmtD(f.start)} – ${fmtD(f.end)}`] });
      if (norm(f.teacher) !== norm(o.teacher) && f.teacher && o.teacher) ch.push({ type: 'teacher', title: `Đổi giảng viên: ${label(f)}`, detail: [`${o.teacher} → ${f.teacher}`] });
    }
    for (const [k, list] of Object.entries(gOld)) if (!gNew[k]) ch.push({ type: 'remove', title: `Môn không còn trong thời khóa biểu: ${label(list[0])}`, detail: list.map(sess) });
  } else if (kind === 'lichthi') {
    const key = x => norm(x.code || x.name) + '|' + norm(x.group) + '|' + norm(x.form);
    const mOld = Object.fromEntries(oldRows.map(x => [key(x), x]));
    // Nguồn khác nhau (portal / dán tay) có thể thiếu cột nhóm, hình thức → nếu không khớp đủ, khớp theo mã môn khi mã chỉ có 1 lịch thi
    const ck = x => norm(x.code || x.name), cnt = a => a.reduce((m, x) => (m[ck(x)] = (m[ck(x)] || 0) + 1, m), {});
    const cOld = cnt(oldRows), cNew = cnt(newRows);
    const seenK = new Set();
    for (const x of newRows) {
      let k = key(x);
      if (!mOld[k] && cNew[ck(x)] === 1 && cOld[ck(x)] === 1) k = key(oldRows.find(y => ck(y) === ck(x)));
      seenK.add(k); const o = mOld[k];
      const desc = y => [fmtD(y.date), y.time || y.timeText, y.room ? `phòng ${y.room}` : ''].filter(Boolean).join(', ');
      if (!o) ch.push({ type: 'add', title: `Có lịch thi mới: ${label(x)}`, detail: [desc(x)] });
      else if (S(o.date) !== S(x.date) || S(o.time || o.timeText) !== S(x.time || x.timeText) || norm(o.room) !== norm(x.room) || S(o.seat) !== S(x.seat))
        ch.push({ type: 'change', title: `Lịch thi thay đổi: ${label(x)}`, detail: [`Trước: ${desc(o)}${o.seat ? `, SBD ${o.seat}` : ''}`, `Sau: ${desc(x)}${x.seat ? `, SBD ${x.seat}` : ''}`] });
    }
    for (const [k, o] of Object.entries(mOld)) if (!seenK.has(k)) ch.push({ type: 'remove', title: `Lịch thi bị bỏ: ${label(o)}`, detail: [] });
  } else if (kind === 'diem') {
    const key = x => norm(x.code || x.name) + '|' + norm(x.term);
    const mOld = Object.fromEntries(oldRows.map(x => [key(x), x]));
    for (const x of newRows) {
      const o = mOld[key(x)];
      if ((!o || o.grade == null) && x.grade != null) ch.push({ type: 'grade', title: `Có điểm mới: ${label(x)}`, detail: [`Điểm: ${x.grade}${x.letter ? ` (${x.letter})` : ''}`] });
      else if (o && o.grade != null && x.grade != null && o.grade !== x.grade) ch.push({ type: 'grade', title: `Điểm thay đổi: ${label(x)}`, detail: [`${o.grade} → ${x.grade}`] });
    }
  }
  return ch;
}
const groupBy = (arr, f) => arr.reduce((m, x) => ((m[f(x)] ||= []).push(x), m), {});

/** Mã băm ổn định của dữ liệu (để biết lần đồng bộ có gì mới không) */
export function hashRows(rows) {
  const s = JSON.stringify(rows.map(r => { const { raw, ...rest } = r; return rest; }));
  let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16) + ':' + s.length;
}

// ---------- Điểm trung bình ----------
/** Quy đổi tham khảo theo thang thường dùng (quy chế từng trường có thể khác) */
export const to4 = g => g == null ? null : g >= 8.5 ? 4 : g >= 8 ? 3.5 : g >= 7 ? 3 : g >= 6.5 ? 2.5 : g >= 5.5 ? 2 : g >= 5 ? 1.5 : g >= 4 ? 1 : 0;
export const DEFAULT_EXCLUDE = ['giao duc the chat', 'the duc', 'giao duc quoc phong', 'quoc phong'];
export const excludedByDefault = name => DEFAULT_EXCLUDE.some(k => norm(name).includes(k));
export function gpa(rows, isExcluded = r => excludedByDefault(r.name)) {
  let w = 0, s = 0, s4 = 0, earned = 0;
  for (const r of rows) {
    if (r.grade == null || !r.credits || isExcluded(r)) continue;
    w += r.credits; s += r.credits * r.grade; s4 += r.credits * to4(r.grade);
    if (r.grade >= 5) earned += r.credits;
  }
  return { credits: w, earned, avg10: w ? s / w : null, avg4: w ? s4 / w : null };
}
export const rank10 = g => g == null ? '' : g >= 9 ? 'Xuất sắc' : g >= 8 ? 'Giỏi' : g >= 7 ? 'Khá' : g >= 6 ? 'Trung bình khá' : g >= 5 ? 'Trung bình' : 'Yếu';
