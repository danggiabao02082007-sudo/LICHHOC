// Thông báo đẩy: tạo khóa ký (VAPID) ngay trên máy của chủ, đăng ký nhận thông báo cho thiết bị này
import { rpc } from './supabase.js';
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = s => { const p = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4); return Uint8Array.from(atob(p), c => c.charCodeAt(0)); };

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/** Tạo cặp khóa P-256 (chuẩn VAPID) bằng WebCrypto — khóa riêng chỉ gửi vào CSDL của chủ */
async function makeVapid() {
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const j = await crypto.subtle.exportKey('jwk', k.privateKey);
  const pub = new Uint8Array([4, ...fromB64u(j.x), ...fromB64u(j.y)]);
  return { publicKey: b64u(pub), privateKey: j.d };
}
export async function ensureVapid() {
  let pub = await rpc('vapid_public', {});
  if (!pub) { const v = await makeVapid(); pub = await rpc('set_vapid', { p_public: v.publicKey, p_private: v.privateKey }); }
  return pub;
}
export async function currentSub() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(); return reg ? reg.pushManager.getSubscription() : null;
}
export async function enablePush() {
  if (!pushSupported()) throw new Error(isIos() && !isStandalone() ? 'Trên iPhone: bấm Chia sẻ → "Thêm vào MH chính", mở app từ biểu tượng rồi bật lại (cần iOS 16.4 trở lên).' : 'Trình duyệt này không hỗ trợ thông báo đẩy.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Bạn chưa cho phép thông báo. Vào Cài đặt của máy → cho phép thông báo cho app rồi thử lại.');
  const pub = await ensureVapid();
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && b64u(sub.options?.applicationServerKey || new ArrayBuffer(0)) !== pub) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(pub) });
  await rpc('save_push_sub', { p_sub: sub.toJSON(), p_device: (navigator.userAgentData?.platform || navigator.platform || '') + ' · ' + (isStandalone() ? 'app' : 'trình duyệt') });
  return sub;
}
export async function disablePush() {
  const sub = await currentSub(); if (!sub) return;
  await rpc('delete_push_sub', { p_endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe();
}
