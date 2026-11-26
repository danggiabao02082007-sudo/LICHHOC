import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ToastHost } from './components/ui.jsx';
import { initMotion } from './lib/motion.js';
import { applyTheme } from './lib/theme.js';
initMotion();
applyTheme();
// Điện thoại: chặn phóng to / thu nhỏ (iPhone bỏ qua user-scalable=no nên chặn thêm cử chỉ 2 ngón)
if (matchMedia('(pointer: coarse)').matches) {
  const stop = e => e.preventDefault();
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, stop, { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
}
createRoot(document.getElementById('root')).render(<ToastHost><App /></ToastHost>);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
