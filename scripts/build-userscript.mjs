// Đóng gói tiện ích Tampermonkey từ userscript/src.js (dùng chung bộ đọc src/lib/portal.js với app)
import { build } from 'esbuild';
import { readFileSync, mkdirSync } from 'node:fs';
const ver = JSON.parse(readFileSync('package.json', 'utf8')).version;
const URL = 'https://danggiabao02082007-sudo.github.io/lichhoc/lichhoc.user.js';
const banner = `// ==UserScript==
// @name         LICHHOC – Đồng bộ portal HCMUS
// @namespace    https://danggiabao02082007-sudo.github.io/lichhoc/
// @version      ${ver}
// @description  Khi bạn đã đăng nhập portal HCMUS: tự đọc thời khóa biểu, lịch thi, kết quả học tập, thông báo và gửi về app LICHHOC của bạn. Không đọc mật khẩu.
// @match        https://new-portal2.hcmus.edu.vn/*
// @match        https://portal.hcmus.edu.vn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      supabase.co
// @run-at       document-idle
// @updateURL    ${URL}
// @downloadURL  ${URL}
// ==/UserScript==
`;
mkdirSync('dist', { recursive: true });
await build({ entryPoints: ['userscript/src.js'], bundle: true, format: 'iife', target: 'es2020', outfile: 'dist/lichhoc.user.js', banner: { js: banner }, legalComments: 'none' });
console.log('Đã đóng gói dist/lichhoc.user.js');
