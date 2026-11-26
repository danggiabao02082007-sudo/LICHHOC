// Ngày giờ theo giờ Việt Nam + lịch tuần + tiết học
const pad = n => String(n).padStart(2, '0');
export const DAYN = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
export const DAYS = ['', '', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
/** Date → 'YYYY-MM-DD' theo giờ máy (máy của bạn ở VN) */
export const iso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const dowOf = s => { const w = fromIso(s).getDay(); return w === 0 ? 8 : w + 1; };       // 2..8
export const mondayOf = s => addDays(s, -(dowOf(s) - 2));
export const fmt = s => s ? s.split('-').reverse().join('/') : '';
export const fmtShort = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';
export const dt = t => { if (!t) return ''; const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const ago = t => {
  if (!t) return ''; const s = (Date.now() - new Date(t)) / 1000;
  if (s < 60) return 'vừa xong'; if (s < 3600) return `${Math.floor(s / 60)} phút trước`; if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 30 * 86400) return `${Math.floor(s / 86400)} ngày trước`; return dt(t).slice(0, 10);
};
export const daysUntil = s => Math.round((fromIso(s) - fromIso(iso())) / 864e5);
export const untilText = s => { const n = daysUntil(s); return n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : n === 2 ? 'Ngày kia' : n > 0 ? `Còn ${n} ngày` : `${-n} ngày trước`; };

/** Giờ bắt đầu/kết thúc của buổi học theo bảng tiết */
const toMin = hhmm => { const [h, m] = (hhmm || '0:0').split(':').map(Number); return h * 60 + m; };
/** Giờ tại tiết p (p có thể lẻ: 3.5 = giữa tiết 3). edge 0 = đầu, 1 = cuối tiết nguyên */
export function periodAt(periods, p, edge) {
  const i = Math.floor(p), f = p - i, r = periods?.[i - 1]; if (!r) return '';
  if (!f) return r[edge] || '';
  if (!r[0] || !r[1]) return '';
  const m = Math.round(toMin(r[0]) + f * (toMin(r[1]) - toMin(r[0])));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
export function timeOf(c, periods) {
  if (!c.p1) return { start: '', end: '' };
  return { start: periodAt(periods, c.p1, 0), end: periodAt(periods, c.p2 || c.p1, 1) };
}
/** Buổi học có diễn ra vào ngày `s` không (đúng thứ + trong khoảng ngày học nếu có) */
export const meetsOn = (c, s) => c.day === dowOf(s) && (!c.start || s >= c.start) && (!c.end || s <= c.end);
/** Các buổi học trong ngày, sắp theo tiết */
export const classesOn = (rows, s) => (rows || []).filter(c => meetsOn(c, s)).sort((a, b) => (a.p1 || 0) - (b.p1 || 0));
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
/** Trạng thái buổi học hôm nay: 'past' | 'now' | 'next' | 'later' */
export function classState(c, periods, list) {
  const t = timeOf(c, periods), n = nowMin();
  if (!t.start) return 'later';
  if (n >= toMin(t.end || t.start)) return 'past';
  if (n >= toMin(t.start)) return 'now';
  const nxt = list.find(x => { const tt = timeOf(x, periods); return tt.start && nowMin() < toMin(tt.start); });
  return nxt === c ? 'next' : 'later';
}
export const minsTo = hhmm => toMin(hhmm) - nowMin();

/** Màu ổn định cho từng môn */
const PALETTE = ['from-indigo-500 to-violet-500', 'from-pink-500 to-rose-500', 'from-amber-500 to-orange-500', 'from-emerald-500 to-teal-500',
  'from-sky-500 to-cyan-500', 'from-fuchsia-500 to-purple-500', 'from-lime-500 to-green-600', 'from-red-500 to-orange-400', 'from-blue-600 to-indigo-500', 'from-teal-500 to-sky-500'];
export const colorOf = key => { let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
