// Chế độ hiệu ứng động, lưu riêng trên từng máy (localStorage).
//  auto: mặc định — đo khung hình/giây lúc mở app, dưới 30 fps thì tự chuyển sang "nhẹ"
//  full: đầy đủ · lite: tắt các hiệu ứng nền nặng · off: tắt hết
const KEY = 'lichhoc.motion';
export const MODES = [
  ['auto', '🤖 Tự động', 'App tự giảm hiệu ứng nếu máy chạy chậm (dưới 30 khung hình/giây)'],
  ['full', '✨ Đầy đủ', 'Bật toàn bộ: máy bay giấy, mây trôi, lá rơi, ánh sáng lướt…'],
  ['lite', '🍃 Nhẹ', 'Giữ hiệu ứng nhỏ trên giao diện, tắt chuyển động nền nặng'],
  ['off', '⏸️ Tắt', 'Tắt hết hiệu ứng động, tiết kiệm pin nhất']
];
const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* chế độ riêng tư: bỏ qua */ } };

export const getMode = () => { const m = read(KEY); return MODES.some(x => x[0] === m) ? m : 'auto'; };
let effective = null;
export const getEffective = () => effective;

function apply(level) {
  effective = level;
  const c = document.documentElement.classList;
  c.remove('motion-full', 'motion-lite', 'motion-off');
  c.add('motion-' + level);
  window.dispatchEvent(new CustomEvent('motionchange', { detail: level }));
}

/** Đo khung hình/giây trong ms mili giây */
export function measureFps(ms = 2500) {
  return new Promise(res => {
    let n = 0, t0 = 0;
    const f = t => { if (!t0) t0 = t; n++; if (t - t0 < ms) requestAnimationFrame(f); else res((n - 1) * 1000 / (t - t0)); };
    requestAnimationFrame(f);
  });
}

let token = 0;
export async function setMode(mode) {
  write(KEY, mode);
  const my = ++token;
  if (mode !== 'auto') return apply(mode);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return apply('off');
  apply('full');
  await new Promise(r => setTimeout(r, 1200));          // chờ trang vẽ xong rồi mới đo
  if (my !== token || document.hidden) return;
  const fps = await measureFps();
  if (my !== token) return;
  window.__lastFps = fps;
  if (fps < 30) apply('lite');
}
export const initMotion = () => setMode(getMode());
