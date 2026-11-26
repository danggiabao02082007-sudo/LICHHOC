// Chủ đề giao diện theo mùa lễ, lưu riêng trên từng máy.
//  auto: tự chọn theo ngày (bảng MÙA bên dưới) · các giá trị khác: luôn dùng chủ đề đó
const KEY = 'lichhoc.theme';
export const THEMES = [
  ['auto', '🗓️ Tự động', 'Tự đổi theo mùa lễ: Tết, 30/4–1/5, Trung Thu, Halloween, Giáng sinh; ngoài mùa lễ là sân trường'],
  ['normal', '🏫 Sân trường', 'Giao diện thường: sân trường, sách vở, máy bay giấy'],
  ['tet', '🧧 Tết Nguyên Đán', 'Hoa mai, hoa đào, bánh chưng, câu đối, pháo hoa, lồng đèn đỏ'],
  ['le304', '⭐ 30/4 – 1/5', 'Cờ đỏ sao vàng, chim bồ câu, pháo hoa, cờ dây'],
  ['trungthu', '🥮 Trung Thu', 'Trăng rằm, cây đa chú Cuội, đèn ông sao, đèn cá chép, bánh trung thu'],
  ['halloween', '🎃 Halloween', 'Bí ngô, lâu đài ma, dơi bay, mèo đen'],
  ['xmas', '🎄 Giáng sinh', 'Cây thông, quà, tuần lộc kéo xe, tuyết phủ các thẻ']
];
const IDS = THEMES.map(x => x[0]).filter(x => x !== 'auto' && x !== 'normal');

// Ngày âm lịch quy ra dương lịch (theo lịch Việt Nam). Chỉ dùng để tự bật chủ đề và đếm ngày.
// Hết bảng thì chế độ Tự động không bật Tết/Trung Thu nữa (vẫn chọn tay được) → cần bổ sung năm mới.
export const TET = { 2026: '2026-02-17', 2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03' };
export const TRUNG_THU = { 2026: '2026-09-25', 2027: '2027-09-15', 2028: '2028-10-03', 2029: '2029-09-22', 2030: '2030-09-12' };

const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const diff = (a, b) => Math.round((day0(a) - day0(b)) / 864e5);

/** Ngày chính của dịp lễ gần nhất (chưa qua quá `after` ngày) */
export function keyDate(id, now = new Date()) {
  const y = now.getFullYear();
  const pick = list => list.map(parse).find(d => diff(now, d) <= 10) || null;
  if (id === 'tet') return pick([TET[y], TET[y + 1]].filter(Boolean));
  if (id === 'trungthu') return pick([TRUNG_THU[y], TRUNG_THU[y + 1]].filter(Boolean));
  if (id === 'xmas') return new Date(now.getMonth() === 0 && now.getDate() <= 10 ? y - 1 : y, 11, 25);
  if (id === 'halloween') return new Date(now.getMonth() >= 10 && now.getDate() > 5 ? y + 1 : y, 9, 31);
  if (id === 'le304') return new Date(now.getMonth() > 4 ? y + 1 : y, 3, 30);
  return null;
}
/** Số ngày tới dịp lễ (âm = đã qua) */
export const daysTo = (id, now = new Date()) => { const k = keyDate(id, now); return k ? diff(k, now) : null; };

// MÙA: [chủ đề, số ngày trước, số ngày sau] quanh ngày chính. Thứ tự = ưu tiên khi trùng.
const SEASONS = [['tet', 14, 10], ['xmas', 35, 12], ['le304', 12, 3], ['trungthu', 21, 3], ['halloween', 16, 2]];
export function seasonOf(now = new Date()) {
  for (const [id, before, after] of SEASONS) { const n = daysTo(id, now); if (n != null && n <= before && n >= -after) return id; }
  return 'normal';
}

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = v => { try { localStorage.setItem(KEY, v); } catch { /* bỏ qua */ } };
export const getTheme = () => { const t = read(); return THEMES.some(x => x[0] === t) ? t : 'auto'; };
export const effectiveTheme = (t = getTheme()) => t === 'auto' ? seasonOf() : t;

export function applyTheme(t = getTheme()) {
  const eff = effectiveTheme(t), c = document.documentElement.classList;
  IDS.forEach(id => c.toggle('theme-' + id, id === eff));
  c.toggle('theme-fest', eff !== 'normal');
  window.dispatchEvent(new CustomEvent('themechange', { detail: eff }));
  return eff;
}
export const setTheme = t => { write(t); return applyTheme(t); };
export const daysToXmas = (d = new Date()) => daysTo('xmas', d);
