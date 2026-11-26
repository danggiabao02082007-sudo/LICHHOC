// Cảnh Giáng sinh, vẽ bằng SVG. Giống tranh nền cánh đồng lúa: phần tĩnh gom vào 1 SVG, mỗi thứ chuyển động là 1 lớp riêng
// chỉ dịch chuyển bằng CSS transform (GPU). Chế độ hiệu ứng "Nhẹ"/"Tắt" sẽ dừng tuyết rơi, đèn nháy, xe tuần lộc.
import { memo } from 'react';

const VB = '0 0 1060 480';
const Layer = ({ className = '', children }) => (
  <svg className={'absolute inset-0 w-full h-full ' + className} viewBox={VB} preserveAspectRatio="xMidYMax slice" aria-hidden="true">{children}</svg>
);

// Cây thông nhỏ phủ tuyết ở xa
const Pine = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-4" y="0" width="8" height="14" fill="#5B3A1E" />
    <path d="M0,-70 L-26,-28 L-14,-28 L-34,4 L34,4 L14,-28 L26,-28 Z" fill="#14532D" />
    <path d="M0,-70 L-12,-50 L-4,-53 L0,-47 L5,-53 L12,-50 Z M-26,-28 L-14,-28 L-8,-24 L0,-30 L9,-24 L14,-28 L26,-28 L18,-34 L-18,-34 Z" fill="#F8FAFC" />
  </g>
);

// Hộp quà
const Gift = ({ x, y, w, h, c, r = '#FDE047' }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="0" y="0" width={w} height={h} rx="3" fill={c} />
    <rect x="-2" y="-6" width={w + 4} height="9" rx="2" fill={c} stroke="rgba(0,0,0,.12)" />
    <rect x={w / 2 - 4} y="-6" width="8" height={h + 6} fill={r} />
    <path d={`M${w / 2},-6 C${w / 2 - 18},-24 ${w / 2 - 22},-4 ${w / 2},-6 C${w / 2 + 18},-24 ${w / 2 + 22},-4 ${w / 2},-6`} fill="none" stroke={r} strokeWidth="5" />
    <path d={`M0,${h - 4} h${w}`} stroke="#fff" strokeOpacity=".5" strokeWidth="3" />
  </g>
);

// Chồng sách thắt nơ (thay bao gạo của app bán gạo)
const RiceSack = ({ x, y, ribbon = '#DC2626', label = 'SÁCH' }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="0" y="40" width="62" height="16" rx="3" fill="#2563EB" /><rect x="3" y="43" width="56" height="10" rx="2" fill="#F8FAFC" opacity=".9" />
    <rect x="4" y="24" width="56" height="16" rx="3" fill="#DB2777" /><rect x="7" y="27" width="50" height="10" rx="2" fill="#FDF2F8" opacity=".9" />
    <rect x="-2" y="8" width="58" height="16" rx="3" fill="#16A34A" /><rect x="1" y="11" width="52" height="10" rx="2" fill="#F0FDF4" opacity=".9" />
    <text x="27" y="20" textAnchor="middle" fontSize="8" fontWeight="800" fill="#14532D" fontFamily="sans-serif">{label}</text>
    <path d="M28,6 v52" stroke={ribbon} strokeWidth="4" />
    <path d="M28,6 c-12,-14 -20,0 0,0 c12,-14 20,0 0,0" fill={ribbon} />
  </g>
);

const Snowman = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="40" rx="30" ry="28" fill="#fff" stroke="#CBD5E1" />
    <circle cx="0" cy="0" r="20" fill="#fff" stroke="#CBD5E1" />
    <circle cx="-7" cy="-4" r="2.4" fill="#1E293B" /><circle cx="7" cy="-4" r="2.4" fill="#1E293B" />
    <path d="M0,2 l14,4 l-14,2z" fill="#F97316" />
    <path d="M-8,10 Q0,15 8,10" stroke="#1E293B" strokeWidth="2" fill="none" />
    <path d="M-20,16 Q0,24 20,16 L22,22 Q0,30 -22,22Z" fill="#DC2626" /><rect x="10" y="20" width="8" height="22" rx="3" fill="#DC2626" />
    <rect x="-16" y="-32" width="32" height="8" rx="2" fill="#1E293B" /><rect x="-10" y="-52" width="20" height="22" rx="2" fill="#1E293B" />
    <rect x="-10" y="-36" width="20" height="5" fill="#DC2626" />
    <circle cx="0" cy="34" r="3" fill="#1E293B" /><circle cx="0" cy="46" r="3" fill="#1E293B" />
    <path d="M-28,30 l-26,-20 M-46,16 l-6,-10 M24,30 l28,-18 M44,18 l8,-8" stroke="#7C4A1E" strokeWidth="3" strokeLinecap="round" />
  </g>
);

// Cây thông Noel lớn (phần tĩnh)
const BigTree = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="-14" y="-6" width="28" height="34" fill="#6B3F1D" />
    {[[0, -260, 70], [0, -200, 100], [0, -135, 128], [0, -70, 150]].map(([cx, top, half], i) => (
      <g key={i}>
        <path d={`M${cx},${top} L${-half},${top + 95} Q0,${top + 112} ${half},${top + 95} Z`} fill={i % 2 ? '#166534' : '#15803D'} />
        <path d={`M${-half},${top + 95} Q${-half / 2},${top + 82} 0,${top + 96} Q${half / 2},${top + 82} ${half},${top + 95} Q0,${top + 112} ${-half},${top + 95}Z`} fill="#F8FAFC" opacity=".92" />
      </g>))}
    <path d="M-60,-150 Q0,-120 62,-160 M-96,-90 Q0,-55 104,-100 M-122,-22 Q0,14 132,-34" stroke="#FACC15" strokeWidth="4" fill="none" strokeDasharray="1 9" strokeLinecap="round" />
    <path d="M-60,-150 Q0,-120 62,-160 M-96,-90 Q0,-55 104,-100 M-122,-22 Q0,14 132,-34" stroke="#F43F5E" strokeWidth="2.5" fill="none" opacity=".7" />
    {[[-30, -175, '#EF4444'], [36, -168, '#3B82F6'], [-58, -108, '#F59E0B'], [10, -96, '#EF4444'], [70, -112, '#A855F7'],
      [-92, -40, '#3B82F6'], [-30, -30, '#F59E0B'], [40, -36, '#EF4444'], [100, -46, '#22C55E'], [-4, -210, '#F59E0B']].map(([bx, by, c], i) => (
      <g key={i}><circle cx={bx} cy={by} r="9" fill={c} /><circle cx={bx - 3} cy={by - 3} r="3" fill="#fff" opacity=".7" /><rect x={bx - 2} y={by - 12} width="4" height="4" fill="#CBD5E1" /></g>))}
  </g>
);

const Base = memo(() => (
  <Layer>
    <defs>
      <linearGradient id="xsnow" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#DBEAFE" /></linearGradient>
      <linearGradient id="xhill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#EFF6FF" /><stop offset="1" stopColor="#BFDBFE" /></linearGradient>
    </defs>
    {/* đồi tuyết xa */}
    <path d="M0,250 Q160,190 320,240 T640,225 T1060,215 V480 H0 Z" fill="url(#xhill)" />
    {[[70, 255, .8], [150, 240, .6], [255, 250, .9], [470, 235, .7], [560, 244, .85], [700, 230, .65], [780, 238, .8], [1010, 228, .75]].map(([x, y, s], i) => <Pine key={i} x={x} y={y} s={s} />)}
    {/* ngôi nhà nhỏ có ánh đèn */}
    <g transform="translate(360 262)">
      <rect x="0" y="0" width="90" height="56" fill="#B45309" /><path d="M-10,2 L45,-38 L100,2 Z" fill="#7F1D1D" />
      <path d="M-12,4 Q20,-6 45,-40 Q70,-6 102,4 Q80,-2 45,-30 Q12,-2 -12,4Z" fill="#fff" />
      <rect x="12" y="16" width="22" height="18" fill="#FDE68A" /><rect x="56" y="16" width="22" height="18" fill="#FDE68A" />
      <rect x="38" y="30" width="16" height="26" fill="#78350F" /><rect x="66" y="-32" width="12" height="22" fill="#57534E" />
    </g>
    {/* nền tuyết gần */}
    <path d="M0,330 Q200,295 420,325 T820,312 T1060,318 V480 H0 Z" fill="url(#xsnow)" />
    <path d="M0,330 Q200,295 420,325 T820,312 T1060,318" fill="none" stroke="#fff" strokeWidth="6" />
    <Snowman x={190} y={330} />
    <BigTree x={850} y={372} />
    <Gift x={735} y={350} w={46} h={36} c="#DC2626" />
    <Gift x={790} y={362} w={34} h={26} c="#2563EB" r="#F8FAFC" />
    <Gift x={905} y={352} w={44} h={34} c="#16A34A" r="#FDE047" />
    <Gift x={958} y={364} w={30} h={24} c="#A855F7" r="#FDE047" />
    <RiceSack x={600} y={330} />
    <RiceSack x={652} y={340} />
    <path d="M0,420 Q300,400 600,425 T1060,415 V480 H0 Z" fill="#fff" opacity=".85" />
  </Layer>
));

// Đèn trên cây thông nhấp nháy (lớp riêng)
const Lights = memo(() => (
  <Layer className="twinkle">
    {[[-50, -140], [-10, -126], [30, -138], [-80, -80], [-40, -66], [0, -60], [40, -70], [86, -86], [-110, -12], [-60, 2], [0, 4], [60, -4], [116, -24]].map(([lx, ly], i) => (
      <circle key={i} cx={850 + lx} cy={372 + ly} r="4.5" fill={['#FDE047', '#F87171', '#60A5FA', '#86EFAC'][i % 4]} />))}
  </Layer>
));
// Ngôi sao đỉnh cây
const Star = memo(() => (
  <Layer className="star-glow">
    <g transform="translate(850 104)">
      <circle r="22" fill="#FDE047" opacity=".35" />
      <path d="M0,-20 L5.9,-6.5 L20,-6.2 L8.6,2.4 L12.4,16.2 L0,8 L-12.4,16.2 L-8.6,2.4 L-20,-6.2 L-5.9,-6.5Z" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.5" />
    </g>
  </Layer>
));

/** Cảnh dưới đáy màn hình (thay cánh đồng lúa) */
export const XmasScene = memo(function XmasScene({ className }) {
  return <div className={className + ' overflow-hidden pointer-events-none'}><Base /><Lights /><Star /></div>;
});

/** Bầu trời đêm có trăng và sao */
export const XmasSky = memo(function XmasSky() {
  const stars = [[8, 12], [18, 30], [27, 8], [36, 22], [48, 14], [57, 34], [66, 10], [74, 26], [83, 16], [92, 32], [12, 44], [42, 40], [62, 46], [88, 48], [5, 26], [53, 4]];
  return (
    <div className="fixed inset-x-0 top-0 h-[70vh] -z-20 pointer-events-none overflow-hidden" style={{ background: 'linear-gradient(180deg,#0B1E4A 0%,#1E3A8A 38%,#6D8FD6 70%,#DCEBFF 100%)' }} aria-hidden="true">
      <div className="absolute right-[8%] top-[9%] w-16 h-16 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%,#FFFBEB,#FDE68A 60%,#FCD34D)', boxShadow: '0 0 40px 12px rgba(253,230,138,.45)' }} />
      {stars.map(([l, t], i) => <span key={i} className="twinkle-star absolute rounded-full bg-white" style={{ left: l + '%', top: t + '%', width: i % 3 ? 3 : 4, height: i % 3 ? 3 : 4, animationDelay: (i % 5) * .6 + 's' }} />)}
    </div>
  );
});

// Xe tuần lộc bay ngang màn hình (đè lên nội dung nhưng không chặn bấm)
const Sleigh = () => (
  <svg viewBox="0 0 420 120" className="w-[200px] sm:w-[260px] h-auto drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]" aria-hidden="true">
    {/* tuần lộc */}
    {[[300, 50], [222, 56], [144, 62]].map(([x, y], i) => (
      <g key={i} transform={`translate(${x} ${y})`}><g className={'reindeer r' + i}>
        <path d="M-26,0 Q-24,-14 0,-12 Q18,-12 24,-4 Q26,6 14,8 L-20,8 Q-30,6 -26,0Z" fill="#92400E" />
        <path d="M18,-8 Q26,-26 34,-28 Q40,-26 38,-20 Q34,-16 26,-6Z" fill="#92400E" />
        <circle cx="36" cy="-24" r="6" fill="#92400E" /><circle cx="42" cy="-24" r="3" fill={i === 0 ? '#EF4444' : '#1F2937'} />
        <path d="M32,-30 l-6,-14 m3,7 l-8,-4 M36,-30 l4,-14 m-2,7 l7,-5" stroke="#78350F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M-18,8 l-6,14 M-10,8 l-2,15 M8,8 l6,14 M14,8 l10,12" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
        <path d="M-6,-12 Q0,-4 10,-12" stroke="#DC2626" strokeWidth="3" fill="none" /><circle cx="2" cy="-7" r="2.5" fill="#FACC15" />
      </g></g>))}
    <path d="M100,72 Q160,60 196,60 M196,60 Q240,52 274,54 M274,54 Q300,48 320,44" stroke="#B45309" strokeWidth="1.6" fill="none" />
    {/* xe trượt + ông già Noel + túi quà */}
    <g transform="translate(20 46)">
      <path d="M8,56 Q0,56 2,48 M2,48 L92,48 Q104,48 104,40" stroke="#CA8A04" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M10,10 L80,10 Q96,10 96,28 L96,40 L14,40 Q6,40 6,30 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="2" />
      <path d="M10,22 Q50,30 94,22" stroke="#FACC15" strokeWidth="3" fill="none" />
      <path d="M14,12 Q4,-14 30,-12 Q40,-26 52,-10 Q44,10 14,12Z" fill="#7C2D12" />
      <rect x="18" y="-12" width="12" height="12" fill="#2563EB" /><rect x="32" y="-16" width="12" height="14" fill="#16A34A" />
      <g transform="translate(66 -4)">
        <path d="M-12,14 Q-14,-4 0,-6 Q14,-4 12,14Z" fill="#DC2626" />
        <circle cx="0" cy="-14" r="9" fill="#FCD9B6" />
        <path d="M-9,-12 Q0,6 9,-12 Q6,0 0,2 Q-6,0 -9,-12Z" fill="#fff" />
        <path d="M-10,-18 Q0,-36 14,-26 L10,-18Z" fill="#DC2626" /><circle cx="15" cy="-26" r="3.5" fill="#fff" />
        <rect x="-11" y="-20" width="22" height="4" rx="2" fill="#fff" />
      </g>
    </g>
  </svg>
);

/** Tuyết rơi + xe tuần lộc, phủ lên toàn màn hình (không chặn thao tác) */
export const XmasOverlay = memo(function XmasOverlay() {
  const flakes = Array.from({ length: 34 }, (_, i) => ({
    l: (i * 37) % 100, s: 4 + (i * 7) % 7, d: 9 + (i * 13) % 10, dl: -((i * 17) % 19), o: .55 + ((i * 11) % 40) / 100, x: (i % 2 ? 1 : -1) * (10 + (i * 5) % 30)
  }));
  return (
    <div className="fixed inset-0 z-[35] pointer-events-none overflow-hidden" aria-hidden="true">
      {flakes.map((f, i) => (
        <span key={i} className={'snowflake absolute -top-4 rounded-full bg-white' + (f.x < 0 ? ' l' : '')}
          style={{ left: f.l + '%', width: f.s, height: f.s, opacity: f.o, animationDuration: f.d + 's', animationDelay: f.dl + 's' }} />))}
      <div className="sleigh-fly absolute top-[2px] left-0"><Sleigh /></div>
    </div>
  );
});

/** Mũ ông già Noel đội lên logo */
export const SantaHat = ({ className = '' }) => (
  <svg viewBox="0 0 64 48" className={className} aria-hidden="true">
    <path d="M6,38 Q14,6 40,8 Q58,10 58,30 L50,28 Q48,16 38,18 Q22,22 18,40Z" fill="#DC2626" />
    <rect x="2" y="34" width="34" height="11" rx="5.5" fill="#fff" transform="rotate(-12 19 40)" />
    <circle cx="56" cy="32" r="6" fill="#fff" />
  </svg>
);
