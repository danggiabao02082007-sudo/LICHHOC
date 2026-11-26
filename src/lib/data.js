// Dữ liệu học tập dùng chung cho các trang (tải 1 lần, tải lại khi đồng bộ xong)
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, q } from './supabase.js';
export const StudyCtx = createContext(null);
export const useStudy = () => useContext(StudyCtx);

/** Bản mới nhất của mỗi (loại, học kỳ) */
function latest(snaps) {
  const m = {};
  for (const s of snaps) { const k = s.kind + '|' + s.term; if (!m[k] || s.captured_at > m[k].captured_at) m[k] = s; }
  return Object.values(m);
}
export function useStudyLoader(enabled) {
  const [st, setSt] = useState({ loading: true });
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const [snaps, settings, unseenC, unseenN, status] = await Promise.all([
        q(supabase.from('snapshots').select('id,kind,term,rows,captured_at,source').order('captured_at', { ascending: false }).limit(60)),
        q(supabase.from('settings').select('data').eq('id', 1).single()),
        supabase.from('changes').select('id', { count: 'exact', head: true }).eq('seen', false),
        supabase.from('notices').select('id', { count: 'exact', head: true }).eq('seen', false),
        supabase.rpc('push_status')]);
      const L = latest(snaps), data = settings.data;
      const terms = [...new Set(L.map(s => s.term))].sort().reverse();
      const pick = (kind, term) => (L.find(s => s.kind === kind && s.term === (term ?? data.current_term)) || L.filter(s => s.kind === kind).sort((a, b) => b.captured_at.localeCompare(a.captured_at))[0]) || null;
      const allGrades = L.filter(s => s.kind === 'diem').flatMap(s => s.rows.map(r => ({ ...r, term: r.term || s.term })));
      setSt({ loading: false, error: null, snaps: L, settings: data, terms, pick, allGrades, unseenChanges: unseenC.count || 0, unseenNotices: unseenN.count || 0, status: status.data || {} });
    } catch (e) { setSt(s => ({ ...s, loading: false, error: e.message })); }
  }, [enabled]);
  useEffect(() => { load(); }, [load]);
  return { ...st, reload: load };
}
export async function saveSettings(patch, cur) {
  const data = { ...cur, ...patch };
  await q(supabase.from('settings').update({ data }).eq('id', 1));
  return data;
}
