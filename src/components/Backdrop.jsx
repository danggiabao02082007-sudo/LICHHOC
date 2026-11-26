// Nền theo chủ đề: sân trường (thường) hoặc cảnh mùa lễ
import { useEffect, useState } from 'react';
import CampusScene from './CampusScene.jsx';
import { FEST } from './themes.js';
import { effectiveTheme } from '../lib/theme.js';

export function useThemeId() {
  const [id, setId] = useState(() => effectiveTheme());
  useEffect(() => { const h = e => setId(e.detail); addEventListener('themechange', h); return () => removeEventListener('themechange', h); }, []);
  return id;
}
export default function Backdrop({ tall }) {
  const fest = FEST[useThemeId()];
  if (fest) return <><fest.Sky /><fest.Scene className={`fixed inset-x-0 bottom-0 w-full ${tall ? 'h-[55vh]' : 'h-[46vh]'} -z-10`} /><fest.Overlay /></>;
  return <>
    <div className="fixed inset-0 -z-20 bg-gradient-to-b from-sky-400 via-sky-200 to-indigo-50" />
    <div className="fixed right-[7%] top-[6%] -z-10 w-20 h-20 rounded-full sunrays" style={{ background: 'radial-gradient(circle,#FEF9C3,#FDE047 60%,#FACC15)', boxShadow: '0 0 50px 16px rgba(253,224,71,.5)' }} />
    <CampusScene className={`fixed inset-x-0 bottom-0 w-full ${tall ? 'h-[55vh]' : 'h-[46vh]'} -z-10`} />
  </>;
}
