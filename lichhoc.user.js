// ==UserScript==
// @name         LICHHOC – Đồng bộ portal HCMUS
// @namespace    https://danggiabao02082007-sudo.github.io/LICHHOC/
// @version      1.0.2
// @description  Khi bạn đã đăng nhập portal HCMUS: tự đọc thời khóa biểu, lịch thi, kết quả học tập, thông báo và gửi về app LICHHOC của bạn. Không đọc mật khẩu.
// @match        https://*.hcmus.edu.vn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      supabase.co
// @run-at       document-idle
// @updateURL    https://danggiabao02082007-sudo.github.io/LICHHOC/lichhoc.user.js
// @downloadURL  https://danggiabao02082007-sudo.github.io/LICHHOC/lichhoc.user.js
// ==/UserScript==

(() => {
  // src/lib/portal.js
  var norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().replace(/\s+/g, " ").trim();
  var clean = (s) => String(s ?? "").replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  var COLS = {
    code: ["ma mon hoc", "ma mh", "ma hp", "ma hoc phan", "ma mon", "mamh", "ma"],
    group: ["ma lop", "lop hoc phan", "lop hp", "nhom", "lop", "to"],
    name: ["ten mon hoc", "ten mh", "ten hoc phan", "ten mon", "mon hoc", "hoc phan", "ten"],
    credits: ["so tin chi", "so tc", "tin chi", "stc", "tc"],
    type: ["loai", "ly thuyet/thuc hanh", "lt/th", "hinh thuc hoc"],
    schedule: ["lich hoc"],
    // portal new-portal4: một ô "T6(3.5-5)-P.cs2:F202"
    day: ["thu"],
    periods: ["tiet"],
    room: ["phong hoc", "phong"],
    dates: ["thoi gian hoc", "thoi gian", "tuan hoc", "tuan"],
    start: ["tu ngay", "ngay bat dau", "bat dau", "ngay bd"],
    end: ["den ngay", "ngay ket thuc", "ket thuc", "ngay kt"],
    teacher: ["giang vien", "giao vien", "cbgd", "gv"],
    examDate: ["ngay thi", "ngay"],
    examTime: ["gio thi", "gio bat dau", "gio", "ca thi", "ca"],
    examRoom: ["phong thi", "phong"],
    examForm: ["hinh thuc thi", "hinh thuc"],
    seat: ["so bao danh", "sbd"],
    duration: ["thoi luong", "so phut", "thoi gian lam bai"],
    grade: ["diem tong ket", "diem tk", "diem hp", "diem hoc phan", "tong ket", "diem he 10", "diem 10", "diem"],
    grade4: ["diem he 4", "diem 4", "he 4"],
    letter: ["diem chu", "chu"],
    result: ["ket qua", "dat"],
    term: ["hoc ky", "hk"]
  };
  var pickCol = (headers, keys, used = /* @__PURE__ */ new Set()) => {
    const H = headers.map(norm);
    for (const k of keys) {
      let i = H.findIndex((h, j) => !used.has(j) && h === k);
      if (i < 0) i = H.findIndex((h, j) => !used.has(j) && (h.startsWith(k + " ") || h.endsWith(" " + k) || h.includes(" " + k + " ")));
      if (i < 0 && k.length >= 4) i = H.findIndex((h, j) => !used.has(j) && h.includes(k));
      if (i >= 0) return i;
    }
    return -1;
  };
  var DAYS = ["thu 2", "thu 3", "thu 4", "thu 5", "thu 6", "thu 7", "chu nhat"];
  var DAY_ALIASES = { "thu hai": 2, "thu ba": 3, "thu tu": 4, "thu nam": 5, "thu sau": 6, "thu bay": 7, "chu nhat": 8, cn: 8, "thu 2": 2, "thu 3": 3, "thu 4": 4, "thu 5": 5, "thu 6": 6, "thu 7": 7, t2: 2, t3: 3, t4: 4, t5: 5, t6: 6, t7: 7 };
  var isGrid = (headers) => headers.map(norm).filter((h) => DAYS.includes(h) || DAY_ALIASES[h]).length >= 3;
  function classify(table, pageText = "") {
    const H = table.headers.map(norm).join(" | ");
    const P = norm(pageText).slice(0, 4e3);
    if (isGrid(table.headers)) return "tkb";
    const has = (k) => H.includes(k);
    if (has("ngay thi") || has("phong thi") || has("gio thi") || has("ca thi") || has("so bao danh") || has("sbd") && has("ngay")) return "lichthi";
    if (has("lich hoc") && (has("mon") || has("ma mh") || has("hoc phan"))) return "tkb";
    if ((has("diem") || has("ket qua")) && (has("mon") || has("hoc phan")) && !has("tiet")) return "diem";
    if (has("thu") && (has("tiet") || has("phong")) || has("tiet") && (has("mon") || has("hoc phan"))) return "tkb";
    if (P.includes("lich thi") && (has("ngay") || has("phong"))) return "lichthi";
    if ((P.includes("ket qua hoc tap") || P.includes("bang diem")) && has("mon")) return "diem";
    if (P.includes("thoi khoa bieu") && (has("mon") || has("hoc phan"))) return "tkb";
    return null;
  }
  var DATE_RE = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
  var parseDate = (s) => {
    const m = String(s || "").match(DATE_RE);
    if (!m) return null;
    let [, d, mo, y] = m;
    y = y.length === 2 ? "20" + y : y;
    const dd = +d, mm = +mo, yy = +y;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  };
  var allDates = (s) => [...String(s || "").matchAll(new RegExp(DATE_RE.source, "g"))].map((m) => parseDate(m[0])).filter(Boolean);
  var parseDay = (s) => {
    const n = norm(s).replace(/[().,]/g, " ").trim();
    if (!n) return null;
    for (const [k, v] of Object.entries(DAY_ALIASES)) if (n === k || n.startsWith(k + " ") || n.endsWith(" " + k)) return v;
    const m = n.match(/(?:^|thu\s*)([2-8])(?:\b|$)/);
    if (m) return +m[1];
    if (n.includes("chu nhat") || n === "cn") return 8;
    return null;
  };
  var parsePeriods = (s) => {
    const n = norm(s).replace(/tiet/g, "");
    let m = n.match(/(\d{1,2})\s*(?:-|–|->|den|→|~)\s*(\d{1,2})/);
    if (m) return [+m[1], +m[2]];
    const run2 = n.trim().match(/^(\d{3,})$/);
    if (run2) {
      const ds = run2[1].split("").map(Number);
      if (ds.every((d, i) => i === 0 || d === ds[i - 1] + 1)) return [ds[0], ds[ds.length - 1]];
    }
    const list = n.match(/\d{1,2}/g);
    if (!list) return null;
    const ns = list.map(Number);
    return [Math.min(...ns), Math.max(...ns)];
  };
  var parseTime = (s) => {
    const m = String(s || "").match(/(\d{1,2})\s*[h:gG]\s*(\d{2})?/);
    return m ? `${String(+m[1]).padStart(2, "0")}:${m[2] || "00"}` : null;
  };
  var num = (s) => {
    const t = String(s ?? "").replace(",", ".").match(/-?\d+(\.\d+)?/);
    return t ? Number(t[0]) : null;
  };
  var dayName = (d) => d === 8 ? "Ch\u1EE7 nh\u1EADt" : `Th\u1EE9 ${d}`;
  function baseRow(headers, row) {
    const raw = {};
    headers.forEach((h, i) => {
      const k = clean(h) || `C\u1ED9t ${i + 1}`;
      if (row[i] != null && clean(row[i]) !== "") raw[k] = clean(row[i]);
    });
    return raw;
  }
  function parseSchedule(s) {
    const out = [], re = /\bT\s*([2-8]|CN)\s*\(\s*(\d+(?:[.,]\d+)?)\s*(?:-|–|->)\s*(\d+(?:[.,]\d+)?)\s*\)(?:\s*-\s*P\.?\s*(?:(cs\s*\d+)\s*:\s*)?([^\s;,|]+))?/gi;
    for (const m of String(s || "").matchAll(re)) {
      const campus = (m[4] || "").replace(/\s/g, "").toUpperCase();
      out.push({ day: /cn/i.test(m[1]) ? 8 : +m[1], p1: +m[2].replace(",", "."), p2: +m[3].replace(",", "."), room: m[5] ? m[5] + (campus ? ` \xB7 ${campus}` : "") : "" });
    }
    return out;
  }
  function normTkbList(t) {
    const H = t.headers, used = /* @__PURE__ */ new Set(), col = (k) => {
      const i = pickCol(H, COLS[k], used);
      if (i >= 0) used.add(i);
      return i;
    };
    const sch = col("schedule");
    const c = {
      code: col("code"),
      name: col("name"),
      group: col("group"),
      credits: col("credits"),
      type: col("type"),
      day: col("day"),
      periods: col("periods"),
      room: col("room"),
      start: col("start"),
      end: col("end"),
      dates: col("dates"),
      teacher: col("teacher")
    };
    const out = [];
    for (const r of t.rows) {
      const g = (i) => i >= 0 ? clean(r[i]) : "";
      if (sch >= 0) {
        const base = { code: g(c.code), name: g(c.name), group: g(c.group), credits: num(g(c.credits)), type: g(c.type), start: parseDate(g(c.start)), end: parseDate(g(c.end)), teacher: g(c.teacher), raw: baseRow(H, r) };
        if (!base.name && !base.code) continue;
        for (const s of parseSchedule(g(sch))) out.push({ ...base, ...s });
        continue;
      }
      const days = g(c.day).split("\n"), pers = g(c.periods).split("\n"), rooms = g(c.room).split("\n");
      const n = Math.max(days.length, pers.length, 1);
      for (let k = 0; k < n; k++) {
        const day = parseDay(days[k] ?? days[0]);
        const per2 = parsePeriods(pers[k] ?? pers[0]);
        const ds = allDates(g(c.dates)), start = parseDate(g(c.start)) || ds[0] || null, end = parseDate(g(c.end)) || ds[1] || null;
        const item = {
          code: g(c.code),
          name: g(c.name),
          group: g(c.group),
          credits: num(g(c.credits)),
          type: g(c.type),
          day,
          p1: per2?.[0] ?? null,
          p2: per2?.[1] ?? null,
          room: clean(rooms[k] ?? rooms[0] ?? ""),
          start,
          end,
          teacher: g(c.teacher),
          raw: baseRow(H, r)
        };
        if (!item.name && !item.code) continue;
        if (!item.day && !item.p1 && !item.room) continue;
        out.push(item);
      }
    }
    return out;
  }
  function normTkbGrid(t) {
    const H = t.headers.map(norm), dayCols = H.map((h) => DAY_ALIASES[h] || (DAYS.includes(h) ? DAYS.indexOf(h) + 2 : null));
    const out = [];
    t.rows.forEach((r) => {
      const per2 = parsePeriods(r[0]);
      r.forEach((cell, i) => {
        const d = dayCols[i];
        const txt = clean(cell);
        if (!d || !txt) return;
        const lines = txt.split("\n").map(clean).filter(Boolean);
        const code = (txt.match(/\b[A-Z]{2,4}\s?\d{3,6}[A-Z]?\b/) || [""])[0];
        const room = (txt.match(/ph[oò]ng[:\s]*([A-Za-z0-9.\-]+)/i) || [])[1] || (lines.find((l) => /^[A-Z]{1,2}\d{1,2}[.\-]?\d{0,3}$/.test(l)) || "");
        const tiet = parsePeriods((txt.match(/ti[eế]t[:\s]*([\d\s\-–,>]+)/i) || [])[1] || "") || per2;
        const name = lines.find((l) => !/ph[oò]ng|ti[eế]t|gv|gi[aả]ng vi[eê]n/i.test(l) && l !== code) || lines[0];
        out.push({ code, name, group: "", credits: null, type: "", day: d, p1: tiet?.[0] ?? null, p2: tiet?.[1] ?? null, room, start: null, end: null, teacher: "", raw: { "\xD4 l\u1ECBch": txt, "Ti\u1EBFt": clean(r[0]) } });
      });
    });
    out.sort((a, b) => a.day - b.day || (a.code + a.name).localeCompare(b.code + b.name) || a.p1 - b.p1);
    const merged = [];
    for (const x of out) {
      const l = merged[merged.length - 1];
      if (l && l.day === x.day && l.name === x.name && l.code === x.code && l.room === x.room && x.p1 === l.p2 + 1) l.p2 = x.p2;
      else merged.push({ ...x });
    }
    return merged;
  }
  function normExams(t) {
    const H = t.headers, used = /* @__PURE__ */ new Set(), col = (k) => {
      const i = pickCol(H, COLS[k], used);
      if (i >= 0) used.add(i);
      return i;
    };
    const c = {
      code: col("code"),
      name: col("name"),
      group: col("group"),
      examDate: col("examDate"),
      examTime: col("examTime"),
      examRoom: col("examRoom"),
      examForm: col("examForm"),
      seat: col("seat"),
      duration: col("duration")
    };
    return t.rows.map((r) => {
      const g = (i) => i >= 0 ? clean(r[i]) : "";
      const dt = g(c.examDate), tm = g(c.examTime);
      return {
        code: g(c.code),
        name: g(c.name),
        group: g(c.group),
        date: parseDate(dt) || parseDate(tm),
        time: parseTime(tm) || parseTime(dt.replace(DATE_RE, "")),
        timeText: tm,
        room: g(c.examRoom),
        form: g(c.examForm),
        seat: g(c.seat),
        duration: g(c.duration),
        raw: baseRow(H, r)
      };
    }).filter((x) => (x.name || x.code) && (x.date || x.room || x.timeText));
  }
  function normGrades(t) {
    const H = t.headers, used = /* @__PURE__ */ new Set(), col = (k) => {
      const i = pickCol(H, COLS[k], used);
      if (i >= 0) used.add(i);
      return i;
    };
    const c = { code: col("code"), name: col("name"), credits: col("credits"), grade4: col("grade4"), letter: col("letter"), grade: col("grade"), result: col("result"), term: col("term") };
    return t.rows.map((r) => {
      const g = (i) => i >= 0 ? clean(r[i]) : "";
      const gr = num(g(c.grade));
      return {
        code: g(c.code),
        name: g(c.name),
        credits: num(g(c.credits)),
        grade: gr != null && gr >= 0 && gr <= 10 ? gr : null,
        grade4: num(g(c.grade4)),
        letter: g(c.letter),
        result: g(c.result),
        term: g(c.term),
        raw: baseRow(H, r)
      };
    }).filter((x) => (x.name || x.code) && !/^(tong|trung binh|diem trung binh|tb)/.test(norm(x.name || x.code)));
  }
  function normalize(kind, table) {
    if (kind === "tkb") return isGrid(table.headers) ? normTkbGrid(table) : normTkbList(table);
    if (kind === "lichthi") return normExams(table);
    if (kind === "diem") return normGrades(table);
    return [];
  }
  function detectTerm(text) {
    const n = norm(text);
    let m = n.match(/hoc ky\s*(\d|he)\D{0,20}?(\d{4})\s*[-–\/]\s*(\d{4})/) || n.match(/hk\s*(\d|he)\D{0,12}?(\d{4})\s*[-–\/]\s*(\d{4})/);
    if (m) return `HK${m[1] === "he" ? "H\xE8" : m[1]} ${m[2]}-${m[3]}`;
    m = n.match(/(\d{4})\s*[-–\/]\s*(\d{4})\D{0,12}?(?:hoc ky|hk)\s*(\d)/);
    if (m) return `HK${m[3]} ${m[1]}-${m[2]}`;
    return "";
  }
  function extract(tables, pageText = "") {
    var _a;
    const found = [], unknown = [];
    for (const t of tables) {
      const kind = classify(t, pageText);
      if (!kind) {
        unknown.push({ headers: t.headers, n: t.rows.length });
        continue;
      }
      const rows = normalize(kind, t);
      if (rows.length) found.push({ kind, rows, headers: t.headers });
      else unknown.push({ headers: t.headers, n: t.rows.length });
    }
    const merged = {};
    for (const f of found) (merged[_a = f.kind] || (merged[_a] = { kind: f.kind, rows: [], headers: f.headers })).rows.push(...f.rows);
    return { items: Object.values(merged), unknown };
  }
  function noticesFromLinks(links) {
    const seen = /* @__PURE__ */ new Set(), out = [];
    for (const l of links) {
      const title = clean(l.text);
      if (title.length < 12 || title.length > 300) continue;
      if (/dang xuat|trang chu|doi mat khau|huong dan|lien he|^thong bao$/.test(norm(title))) continue;
      const date = parseDate(l.context) || parseDate(title);
      const uid = norm(l.href || title).slice(0, 300);
      if (seen.has(uid)) continue;
      seen.add(uid);
      out.push({ uid, title, url: l.href || "", date });
    }
    return out;
  }
  var S = (v) => v == null ? "" : String(v);
  var per = (x) => x.p1 ? x.p2 && x.p2 !== x.p1 ? `ti\u1EBFt ${x.p1}-${x.p2}` : `ti\u1EBFt ${x.p1}` : "";
  var label = (x) => `${x.name || x.code}${x.code && x.name ? ` (${x.code})` : ""}${x.group ? ` \u2013 l\u1EDBp ${x.group}` : ""}`;
  var fmtD = (iso) => iso ? iso.split("-").reverse().join("/") : "";
  var sess = (x) => [x.day ? dayName(x.day) : "", per(x), x.room ? `ph\xF2ng ${x.room}` : ""].filter(Boolean).join(", ");
  function diff(kind, oldRows, newRows) {
    const ch = [];
    if (!oldRows) return ch;
    if (kind === "tkb") {
      const key = (x) => norm(x.code || x.name) + "|" + norm(x.group);
      const gOld = groupBy(oldRows, key), gNew = groupBy(newRows, key);
      for (const [k, list] of Object.entries(gNew)) {
        const prev = gOld[k];
        if (!prev) {
          ch.push({ type: "add", title: `M\xF4n m\u1EDBi trong th\u1EDDi kh\xF3a bi\u1EC3u: ${label(list[0])}`, detail: list.map(sess) });
          continue;
        }
        const so = (x) => `${x.day}|${x.p1}|${x.p2}|${norm(x.room)}`;
        const A = new Set(prev.map(so)), B = new Set(list.map(so));
        if ([...A].join() !== [...B].join() || A.size !== B.size || [...A].some((x) => !B.has(x))) {
          const before = prev.map(sess).join("; "), after = list.map(sess).join("; ");
          const onlyRoom = prev.length === list.length && prev.every((p, i) => p.day === list[i].day && p.p1 === list[i].p1 && p.p2 === list[i].p2);
          ch.push({ type: onlyRoom ? "room" : "time", title: `${onlyRoom ? "\u0110\u1ED5i ph\xF2ng h\u1ECDc" : "\u0110\u1ED5i l\u1ECBch h\u1ECDc"}: ${label(list[0])}`, detail: [`Tr\u01B0\u1EDBc: ${before}`, `Sau: ${after}`] });
        }
        const f = list[0], o = prev[0];
        if (S(f.start) !== S(o.start) || S(f.end) !== S(o.end)) ch.push({ type: "dates", title: `\u0110\u1ED5i ng\xE0y h\u1ECDc: ${label(f)}`, detail: [`Tr\u01B0\u1EDBc: ${fmtD(o.start)} \u2013 ${fmtD(o.end)}`, `Sau: ${fmtD(f.start)} \u2013 ${fmtD(f.end)}`] });
        if (norm(f.teacher) !== norm(o.teacher) && f.teacher && o.teacher) ch.push({ type: "teacher", title: `\u0110\u1ED5i gi\u1EA3ng vi\xEAn: ${label(f)}`, detail: [`${o.teacher} \u2192 ${f.teacher}`] });
      }
      for (const [k, list] of Object.entries(gOld)) if (!gNew[k]) ch.push({ type: "remove", title: `M\xF4n kh\xF4ng c\xF2n trong th\u1EDDi kh\xF3a bi\u1EC3u: ${label(list[0])}`, detail: list.map(sess) });
    } else if (kind === "lichthi") {
      const key = (x) => norm(x.code || x.name) + "|" + norm(x.group) + "|" + norm(x.form);
      const mOld = Object.fromEntries(oldRows.map((x) => [key(x), x]));
      const ck = (x) => norm(x.code || x.name), cnt = (a) => a.reduce((m, x) => (m[ck(x)] = (m[ck(x)] || 0) + 1, m), {});
      const cOld = cnt(oldRows), cNew = cnt(newRows);
      const seenK = /* @__PURE__ */ new Set();
      for (const x of newRows) {
        let k = key(x);
        if (!mOld[k] && cNew[ck(x)] === 1 && cOld[ck(x)] === 1) k = key(oldRows.find((y) => ck(y) === ck(x)));
        seenK.add(k);
        const o = mOld[k];
        const desc = (y) => [fmtD(y.date), y.time || y.timeText, y.room ? `ph\xF2ng ${y.room}` : ""].filter(Boolean).join(", ");
        if (!o) ch.push({ type: "add", title: `C\xF3 l\u1ECBch thi m\u1EDBi: ${label(x)}`, detail: [desc(x)] });
        else if (S(o.date) !== S(x.date) || S(o.time || o.timeText) !== S(x.time || x.timeText) || norm(o.room) !== norm(x.room) || S(o.seat) !== S(x.seat))
          ch.push({ type: "change", title: `L\u1ECBch thi thay \u0111\u1ED5i: ${label(x)}`, detail: [`Tr\u01B0\u1EDBc: ${desc(o)}${o.seat ? `, SBD ${o.seat}` : ""}`, `Sau: ${desc(x)}${x.seat ? `, SBD ${x.seat}` : ""}`] });
      }
      for (const [k, o] of Object.entries(mOld)) if (!seenK.has(k)) ch.push({ type: "remove", title: `L\u1ECBch thi b\u1ECB b\u1ECF: ${label(o)}`, detail: [] });
    } else if (kind === "diem") {
      const key = (x) => norm(x.code || x.name) + "|" + norm(x.term);
      const mOld = Object.fromEntries(oldRows.map((x) => [key(x), x]));
      for (const x of newRows) {
        const o = mOld[key(x)];
        if ((!o || o.grade == null) && x.grade != null) ch.push({ type: "grade", title: `C\xF3 \u0111i\u1EC3m m\u1EDBi: ${label(x)}`, detail: [`\u0110i\u1EC3m: ${x.grade}${x.letter ? ` (${x.letter})` : ""}`] });
        else if (o && o.grade != null && x.grade != null && o.grade !== x.grade) ch.push({ type: "grade", title: `\u0110i\u1EC3m thay \u0111\u1ED5i: ${label(x)}`, detail: [`${o.grade} \u2192 ${x.grade}`] });
      }
    }
    return ch;
  }
  var groupBy = (arr, f) => arr.reduce((m, x) => {
    var _a;
    return (m[_a = f(x)] || (m[_a] = [])).push(x), m;
  }, {});
  function hashRows(rows) {
    const s = JSON.stringify(rows.map((r) => {
      const { raw, ...rest } = r;
      return rest;
    }));
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16) + ":" + s.length;
  }

  // userscript/src.js
  var APP = "https://danggiabao02082007-sudo.github.io/LICHHOC/";
  var AUTO_EVERY = 3 * 36e5;
  var PAGES = /th[oờ]i kh[oó]a bi[eể]u|l[iị]ch thi|k[eế]t qu[aả] h[oọ]c t[aậ]p|b[aả]ng [đd]i[eể]m|tra c[uứ]u [đd]i[eể]m|th[oô]ng b[aá]o/i;
  var get = (k, d) => {
    try {
      return GM_getValue(k, d);
    } catch {
      return d;
    }
  };
  var set = (k, v) => {
    try {
      GM_setValue(k, v);
    } catch {
    }
  };
  var cfg = () => {
    try {
      return JSON.parse(atob(get("conn", "") || ""));
    } catch {
      return null;
    }
  };
  function api(fn, args) {
    const c = cfg();
    return new Promise((res, rej) => GM_xmlhttpRequest({
      method: "POST",
      url: `${c.u}/rest/v1/rpc/${fn}`,
      data: JSON.stringify(args),
      headers: { apikey: c.a, authorization: `Bearer ${c.a}`, "content-type": "application/json" },
      onload: (r) => {
        if (r.status >= 200 && r.status < 300) res(r.responseText ? JSON.parse(r.responseText) : null);
        else {
          let m = r.responseText;
          try {
            m = JSON.parse(m).message;
          } catch {
          }
          rej(new Error(m || "L\u1ED7i " + r.status));
        }
      },
      onerror: () => rej(new Error("Kh\xF4ng k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c m\xE1y ch\u1EE7 app"))
    }));
  }
  var BLOCK = /^(DIV|P|LI|TR|H\d)$/;
  var cellText = (td) => {
    let s = "";
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) s += c.nodeValue.replace(/\s+/g, " ");
        else if (c.nodeType === 1) {
          if (c.tagName === "BR") {
            s += "\n";
            continue;
          }
          if (/^(SCRIPT|STYLE)$/.test(c.tagName)) continue;
          const b = BLOCK.test(c.tagName);
          if (b && s && !s.endsWith("\n")) s += "\n";
          walk(c);
          if (b && !s.endsWith("\n")) s += "\n";
        }
      }
    };
    walk(td);
    return s.replace(/\u00a0/g, " ").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
  };
  function tablesOf(doc) {
    const out = [];
    for (const t of doc.querySelectorAll("table")) {
      if (t.querySelector("table")) continue;
      const trs = [...t.querySelectorAll("tr")].filter((tr) => tr.closest("table") === t);
      if (trs.length < 2) continue;
      const rows = trs.map((tr) => [...tr.children].filter((x) => /^(TD|TH)$/.test(x.tagName)).map(cellText));
      const hi = trs.findIndex((tr) => tr.querySelector("th")) >= 0 ? trs.findIndex((tr) => tr.querySelector("th")) : 0;
      if ((rows[hi] || []).length < 3) continue;
      out.push({ headers: rows[hi], rows: rows.slice(hi + 1).filter((r) => r.length >= 3) });
    }
    return out;
  }
  function termOf(doc) {
    const sel = [...doc.querySelectorAll("select")].map((s) => s.options?.[s.selectedIndex]?.text || "").join(" | ");
    return detectTerm(sel) || detectTerm((doc.body?.innerText ?? doc.body?.textContent ?? "").slice(0, 3e3));
  }
  function noticesOf(doc, base) {
    const title = norm(doc.title + " " + (doc.querySelector("h1,h2,h3")?.textContent || ""));
    const boxes = [...doc.querySelectorAll('[id*="ThongBao" i],[class*="thongbao" i],[id*="News" i],[class*="news" i],[id*="Notice" i]')];
    const scope = boxes.length ? boxes : title.includes("thong bao") ? [doc.body] : [];
    const links = [];
    for (const b of scope) for (const a of b.querySelectorAll("a[href]")) {
      const row = a.closest("tr,li,div,p") || a.parentElement;
      links.push({ text: a.textContent, href: new URL(a.getAttribute("href"), base).href, context: row?.textContent || "" });
    }
    return noticesFromLinks(links);
  }
  function readDoc(doc, url) {
    const text = doc.body?.innerText ?? doc.body?.textContent ?? "";
    const { items, unknown } = extract(tablesOf(doc), doc.title + "\n" + text.slice(0, 4e3));
    const term = termOf(doc);
    return { items: items.map((i) => ({ ...i, term })), notices: noticesOf(doc, url), unknown, url };
  }
  async function sync(pages, source = "userscript") {
    const byKey = {}, notices = [], unknown = [];
    for (const p of pages) {
      for (const it of p.items) {
        const k = it.kind + "|" + it.term;
        (byKey[k] || (byKey[k] = { kind: it.kind, term: it.term, rows: [] })).rows.push(...it.rows);
      }
      notices.push(...p.notices);
      unknown.push(...p.unknown);
    }
    const prev = await api("latest_rows", { p_key: cfg().k });
    const items = Object.values(byKey).map((it) => {
      const old = prev.find((x) => x.kind === it.kind && x.term === it.term) || (it.term ? null : prev.find((x) => x.kind === it.kind));
      return { ...it, hash: hashRows(it.rows), changes: diff(it.kind, old ? old.rows : null, it.rows) };
    });
    const r = await api("ingest", { p_key: cfg().k, p_items: items, p_notices: notices, p_source: source, p_url: location.href.slice(0, 200) });
    return { ...r, found: items.map((i) => `${{ tkb: "TKB", lichthi: "L\u1ECBch thi", diem: "\u0110i\u1EC3m" }[i.kind]}${i.term ? " " + i.term : ""} (${i.rows.length})`), nNotices: notices.length, unknown };
  }
  var HUB = /qu[aả]n l[yý] h[oọ]c t[aậ]p|h[oọ]c t[aậ]p|sinh vi[eê]n|tra c[uứ]u|k[eế]t qu[aả]/i;
  var linksOf = (doc, base, re) => [...doc.querySelectorAll("a[href]")].filter((a) => a.textContent.trim().length <= 40 && re.test(a.textContent + " " + (a.title || "") + " " + (a.querySelector("img")?.alt || "")) && !/^(javascript:|#|mailto:)|logout|dang ?xuat|logoff/i.test(a.getAttribute("href").trim())).map((a) => new URL(a.getAttribute("href"), base)).filter((u) => u.origin === location.origin);
  async function crawl() {
    const pages = [readDoc(document, location.href)], seen = /* @__PURE__ */ new Set([location.pathname + location.search]);
    const get2 = async (u) => {
      const k = u.pathname + u.search;
      if (seen.has(k) || seen.size > 14) return null;
      seen.add(k);
      try {
        const r = await fetch(u.href, { credentials: "include" });
        if (!r.ok || /Login\.aspx/i.test(r.url)) return null;
        const doc = new DOMParser().parseFromString(await r.text(), "text/html");
        await new Promise((x) => setTimeout(x, 800));
        return doc;
      } catch {
        return null;
      }
    };
    const targets = linksOf(document, location.href, PAGES);
    for (const u of linksOf(document, location.href, HUB).slice(0, 4)) {
      const d = await get2(u);
      if (!d) continue;
      pages.push(readDoc(d, u.href));
      targets.push(...linksOf(d, u.href, PAGES));
    }
    for (const u of targets) {
      const d = await get2(u);
      if (d) pages.push(readDoc(d, u.href));
    }
    pages.visited = seen.size;
    return pages;
  }
  var css = `#lh-box{position:fixed;right:14px;bottom:14px;z-index:2147483647;font:14px/1.4 system-ui,sans-serif}
#lh-btn{border:0;border-radius:999px;padding:10px 16px;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(79,70,229,.4);background:linear-gradient(90deg,#4F46E5,#DB2777)}
#lh-card{position:absolute;right:0;bottom:52px;width:330px;background:#fff;color:#1e1b4b;border-radius:16px;padding:14px;box-shadow:0 12px 32px rgba(0,0,0,.25);display:none}
#lh-card textarea{width:100%;height:70px;margin:6px 0;border:1px solid #c7d2fe;border-radius:10px;padding:6px;font:12px monospace}
#lh-card button{border:0;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;background:#4F46E5;color:#fff;margin-right:6px}
#lh-card small{color:#64748b}`;
  var box;
  var btn;
  var card;
  function ui() {
    if (box) return;
    const st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
    box = document.createElement("div");
    box.id = "lh-box";
    box.innerHTML = '<div id="lh-card"></div><button id="lh-btn">\u{1F4DA} LICHHOC</button>';
    document.body.appendChild(box);
    btn = box.querySelector("#lh-btn");
    card = box.querySelector("#lh-card");
    btn.onclick = () => {
      card.style.display = card.style.display === "block" ? "none" : "block";
      render();
    };
  }
  var status = (t) => {
    btn.textContent = t;
  };
  var esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function render(msg = "") {
    const c = cfg(), last = get("last", null);
    card.innerHTML = c ? `<b>\u{1F4DA} LICHHOC \u2013 \u0111\u1ED3ng b\u1ED9 portal</b><div style="margin:6px 0">${msg || (last ? `L\u1EA7n \u0111\u1ED3ng b\u1ED9 g\u1EA7n nh\u1EA5t: ${new Date(last.at).toLocaleString("vi-VN")}<br>${esc(last.text)}` : "Ch\u01B0a \u0111\u1ED3ng b\u1ED9 l\u1EA7n n\xE0o.")}</div>
      <button id="lh-now">\u{1F504} \u0110\u1ED3ng b\u1ED9 ngay</button><button id="lh-reset" style="background:#e2e8f0;color:#1e1b4b">\u0110\u1ED5i m\xE3</button>
      <div style="margin-top:8px"><small>T\u1EF1 qu\xE9t c\xE1c trang TKB, l\u1ECBch thi, \u0111i\u1EC3m, th\xF4ng b\xE1o t\u1ED1i \u0111a 3 gi\u1EDD/l\u1EA7n khi b\u1EA1n m\u1EDF portal. Kh\xF4ng \u0111\u1ECDc m\u1EADt kh\u1EA9u.</small></div>` : `<b>\u{1F4DA} K\u1EBFt n\u1ED1i v\u1EDBi app LICHHOC</b><div><small>M\u1EDF app \u2192 m\u1EE5c <b>\u0110\u1ED3ng b\u1ED9</b> \u2192 b\u1EA5m <b>T\u1EA1o m\xE3 k\u1EBFt n\u1ED1i</b>, ch\xE9p m\xE3 r\u1ED3i d\xE1n v\xE0o \u0111\xE2y.</small></div>
      <textarea id="lh-code" placeholder="D\xE1n m\xE3 k\u1EBFt n\u1ED1i\u2026"></textarea><button id="lh-save">L\u01B0u</button> <a href="${APP}#sync" target="_blank">M\u1EDF app</a>`;
    card.querySelector("#lh-save")?.addEventListener("click", () => {
      const v = card.querySelector("#lh-code").value.trim();
      try {
        const j = JSON.parse(atob(v));
        if (!j.u || !j.a || !j.k) throw 0;
        set("conn", v);
        render('\u2705 \u0110\xE3 k\u1EBFt n\u1ED1i. B\u1EA5m "\u0110\u1ED3ng b\u1ED9 ngay".');
      } catch {
        render("\u274C M\xE3 kh\xF4ng \u0111\xFAng, h\xE3y ch\xE9p l\u1EA1i t\u1EEB app.");
      }
    });
    card.querySelector("#lh-now")?.addEventListener("click", () => run(true));
    card.querySelector("#lh-reset")?.addEventListener("click", () => {
      set("conn", "");
      render();
    });
  }
  async function run(force) {
    if (!cfg()) {
      status("\u{1F4DA} LICHHOC \xB7 ch\u01B0a k\u1EBFt n\u1ED1i");
      return;
    }
    const auto = force || Date.now() - (get("lastCrawl", 0) || 0) > AUTO_EVERY;
    status("\u{1F4DA} \u0110ang \u0111\u1ED3ng b\u1ED9\u2026");
    try {
      const pages = auto ? await crawl() : [readDoc(document, location.href)];
      if (auto) set("lastCrawl", Date.now());
      const r = await sync(pages);
      const text = `${pages.visited ? `\u0110\u1ECDc ${pages.visited} trang \xB7 ` : ""}${r.found.length ? r.found.join(", ") : "Kh\xF4ng th\u1EA5y b\u1EA3ng TKB/l\u1ECBch thi/\u0111i\u1EC3m \u2014 h\xE3y m\u1EDF trang TKB / l\u1ECBch thi / \u0111i\u1EC3m r\u1ED3i b\u1EA5m \u0110\u1ED3ng b\u1ED9 ngay"}${r.nNotices ? ` \xB7 ${r.nNotices} th\xF4ng b\xE1o` : ""}${r.changes ? ` \xB7 \u{1F514} ${r.changes} thay \u0111\u1ED5i` : ""}${r.notices ? ` \xB7 ${r.notices} th\xF4ng b\xE1o m\u1EDBi` : ""}${r.unknown.length ? ` \xB7 ${r.unknown.length} b\u1EA3ng ch\u01B0a nh\u1EADn d\u1EA1ng` : ""}`;
      set("last", { at: Date.now(), text });
      status(r.changes || r.notices ? `\u{1F4DA} \u{1F514} ${r.changes + r.notices} m\u1EDBi` : "\u{1F4DA} LICHHOC \u2713");
      if (card.style.display === "block" || force) {
        card.style.display = "block";
        render("\u2705 " + esc(text) + (r.unknown.length ? `<br><small>B\u1EA3ng ch\u01B0a nh\u1EADn d\u1EA1ng c\xF3 c\xE1c c\u1ED9t: ${r.unknown.slice(0, 3).map((u) => esc(u.headers.slice(0, 6).join(" | "))).join("<br>")}</small>` : ""));
      }
    } catch (e) {
      status("\u{1F4DA} L\u1ED7i \u0111\u1ED3ng b\u1ED9");
      card.style.display = "block";
      render("\u274C " + esc(e.message));
    }
  }
  if ((window.__LH_TEST__ || /^(new-)?portal\d*\.hcmus\.edu\.vn$/i.test(location.hostname)) && !/Login\.aspx/i.test(location.pathname)) {
    ui();
    run(false);
  }
})();
