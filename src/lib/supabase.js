import { createClient } from '@supabase/supabase-js';
const cfg = window.APP_CONFIG || {};
/** Chưa cấu hình (chưa tạo project Supabase) → null, app hiện màn hình hướng dẫn cài đặt */
export const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
export const SB = { url: cfg.SUPABASE_URL || '', anon: cfg.SUPABASE_ANON_KEY || '' };
export const supabase = configured ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

/** Gọi hàm máy chủ; ném lỗi tiếng Việt nếu thất bại */
export async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}
export async function q(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}
