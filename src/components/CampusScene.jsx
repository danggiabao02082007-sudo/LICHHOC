// Tranh nền "sân trường" (chủ đề thường), vẽ bằng SVG. Như các cảnh khác: phần tĩnh 1 SVG; mây, máy bay giấy, lá rơi, cây đung đưa
// là lớp riêng chỉ dịch chuyển bằng CSS transform (GPU). Chế độ hiệu ứng "Nhẹ"/"Tắt" dừng các lớp này.
import { memo } from 'react';

const VB = '0 0 1060 480';
const Layer = ({ className = '', children, style }) => (
  <svg className={'absolute inset-0 w-full h-full ' + className} viewBox={VB} preserveAspectRatio="xMidYMax slice" aria-hidden="true" style={style}>{children}</svg>
);
const Cloud = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity=".95">
    <ellipse cx="0" cy="0" rx="46" ry="20" /><ellipse cx="34" cy="-10" rx="30" ry="22" /><ellipse cx="-30" cy="-6" rx="24" ry="16" /><ellipse cx="62" cy="4" rx="24" ry="14" />
  </g>
);
const Tree = ({ x, y, s = 1, c = '#16A34A' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-6" y="-10" width="12" height="46" rx="4" fill="#7C4A1E" />
    <circle cx="0" cy="-40" r="34" fill={c} /><circle cx="-26" cy="-20" r="24" fill={c} /><circle cx="26" cy="-22" r="26" fill={c} />
    <circle cx="-10" cy="-52" r="12" fill="#fff" opacity=".18" />
  </g>
);
const Plane = ({ c = '#fff' }) => (
  <g>
    <path d="M0,0 L60,14 L0,26 L12,14 Z" fill={c} stroke="#94A3B8" strokeWidth="1.2" /><path d="M12,14 L60,14 L18,22 Z" fill="#E2E8F0" />
  </g>
);
const Books = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="0" y="36" width="70" height="16" rx="3" fill="#4F46E5" /><rect x="4" y="39" width="62" height="10" rx="2" fill="#EEF2FF" />
    <rect x="6" y="20" width="62" height="16" rx="3" fill="#DB2777" /><rect x="10" y="23" width="54" height="10" rx="2" fill="#FDF2F8" />
    <rect x="-2" y="4" width="64" height="16" rx="3" fill="#F59E0B" /><rect x="2" y="7" width="56" height="10" rx="2" fill="#FFFBEB" />
    {/* mũ tốt nghiệp */}
    <path d="M30,-14 L62,-4 L30,6 L-2,-4 Z" fill="#1E1B4B" /><path d="M14,0 v8 q16,8 32,0 v-8" fill="#312E81" />
    <path d="M58,-3 v14" stroke="#FACC15" strokeWidth="2" /><circle cx="58" cy="12" r="3" fill="#FACC15" />
  </g>
);

const Base = memo(() => (
  <Layer>
    <defs>
      <linearGradient id="lawn" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#86EFAC" /><stop offset="1" stopColor="#22C55E" /></linearGradient>
      <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FEF3C7" /><stop offset="1" stopColor="#FDE68A" /></linearGradient>
    </defs>
    {/* đồi xa */}
    <path d="M0,300 Q200,250 420,285 T820,270 T1060,262 V480 H0 Z" fill="#BBF7D0" />
    {/* tòa nhà trường */}
    <g transform="translate(330 140)">
      <rect x="0" y="60" width="400" height="130" fill="url(#wall)" stroke="#D6A956" strokeWidth="2" />
      <path d="M-20,62 L200,0 L420,62 Z" fill="#DC2626" /><path d="M-20,62 L420,62" stroke="#991B1B" strokeWidth="4" />
      <circle cx="200" cy="36" r="17" fill="#fff" stroke="#991B1B" strokeWidth="3" /><path d="M200,36 v-11 M200,36 h8" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
      {[30, 90, 150, 250, 310, 370].map(x => <rect key={x} x={x - 6} y="62" width="12" height="128" fill="#FFFBEB" stroke="#D6A956" />)}
      {[0, 1].map(r => [55, 115, 280, 340].map(x => <rect key={x + '-' + r} x={x - 14} y={80 + r * 50} width="28" height="30" rx="3" fill="#93C5FD" stroke="#1D4ED8" strokeWidth="1.5" />))}
      <rect x="175" y="120" width="50" height="70" rx="25" fill="#7C2D12" /><path d="M200,120 v70" stroke="#FDE68A" strokeWidth="1.5" />
      <rect x="150" y="190" width="100" height="10" fill="#E5E7EB" /><rect x="140" y="200" width="120" height="8" fill="#D1D5DB" />
    </g>
    {/* cột cờ */}
    <g transform="translate(790 330)"><rect x="-2" y="-200" width="4" height="200" fill="#94A3B8" />
      <path d="M2,-198 h54 v36 h-54Z" fill="#DA251D" /><path d="M29,-190 l4,11 h11 l-9,7 l3,11 l-9,-7 l-9,7 l3,-11 l-9,-7 h11Z" fill="#FFFF00" /></g>
    {/* bãi cỏ + lối đi */}
    <path d="M0,340 Q300,310 560,335 T1060,325 V480 H0 Z" fill="url(#lawn)" />
    <path d="M500,348 Q520,420 420,480 H700 Q560,420 590,348 Z" fill="#E7E5E4" opacity=".9" />
    {[[60, 400], [150, 420], [880, 410], [980, 395]].map(([x, y], i) => <g key={i}>{[0, 1, 2].map(j => <circle key={j} cx={x + j * 9} cy={y - (j % 2) * 4} r="5" fill={['#F472B6', '#FACC15', '#A78BFA'][(i + j) % 3]} />)}</g>)}
    <Books x={250} y={360} />
    {/* băng ghế */}
    <g transform="translate(860 360)"><rect x="0" y="0" width="90" height="10" rx="3" fill="#B45309" /><rect x="0" y="-18" width="90" height="8" rx="3" fill="#B45309" /><rect x="6" y="10" width="6" height="18" fill="#78350F" /><rect x="78" y="10" width="6" height="18" fill="#78350F" /></g>
    <path d="M0,430 Q300,410 600,432 T1060,422 V480 H0 Z" fill="#16A34A" />
  </Layer>
));

export default memo(function CampusScene({ className = '' }) {
  return (
    <div className={className + ' overflow-hidden pointer-events-none'} aria-hidden="true">
      <Layer className="cloud slow"><Cloud x={160} y={70} s={1.1} /><Cloud x={720} y={50} s={.9} /></Layer>
      <Layer className="cloud"><Cloud x={460} y={110} s={.7} /><Cloud x={960} y={120} s={.6} /></Layer>
      <Base />
      <Layer className="stalk"><Tree x={90} y={330} s={1.1} /><Tree x={190} y={340} s={.85} c="#15803D" /><Tree x={980} y={325} s={1.15} c="#15803D" /><Tree x={1040} y={340} s={.8} /></Layer>
      <Layer className="bird"><g transform="translate(40 90) rotate(-8)"><Plane /></g></Layer>
      <Layer className="bird b2"><g transform="translate(40 150) rotate(6) scale(.8)"><Plane c="#FDE68A" /></g></Layer>
      <Layer className="falling"><g fill="#F59E0B">{[[200, 120], [600, 60], [900, 100]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="6" ry="3.5" transform={`rotate(30 ${x} ${y})`} />)}</g></Layer>
      <Layer className="falling f2"><g fill="#84CC16">{[[400, 80], [760, 40], [1000, 90]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="6" ry="3.5" transform={`rotate(-25 ${x} ${y})`} />)}</g></Layer>
    </div>
  );
});
