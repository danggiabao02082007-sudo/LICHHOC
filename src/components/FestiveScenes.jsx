// Cảnh các dịp lễ: Tết Nguyên Đán, 30/4–1/5, Trung Thu, Halloween. Hình vẽ SVG tự làm.
// Như tranh nền lúa/Giáng sinh: phần tĩnh gom trong 1 SVG; thứ chuyển động là lớp riêng, chỉ dùng transform/opacity (GPU).
import { memo } from 'react';

const VB = '0 0 1060 480';
const Layer = ({ className = '', children }) => (
  <svg className={'absolute inset-0 w-full h-full ' + className} viewBox={VB} preserveAspectRatio="xMidYMax slice" aria-hidden="true">{children}</svg>
);
const Sky = ({ bg, children }) => (
  <div className="fixed inset-0 -z-20 pointer-events-none overflow-hidden" style={{ background: bg }} aria-hidden="true">{children}</div>
);
const Twinkles = ({ n = 14, color = '#fff' }) => Array.from({ length: n }, (_, i) => (
  <span key={i} className="twinkle-star absolute rounded-full" style={{ left: (i * 41) % 97 + '%', top: (i * 23) % 50 + '%', width: i % 3 ? 3 : 4, height: i % 3 ? 3 : 4, background: color, animationDelay: (i % 5) * .6 + 's' }} />));

/** Hạt bay/rơi phủ màn hình. kind: fall (rơi), rise (bay lên), fly (bay ngang) */
function Particles({ n, kind, render, size = [10, 18], dur = [10, 18], top }) {
  return Array.from({ length: n }, (_, i) => {
    const s = size[0] + (i * 7) % (size[1] - size[0] + 1), d = dur[0] + (i * 13) % (dur[1] - dur[0] + 1);
    const style = { width: s, height: s, animationDuration: d + 's', animationDelay: -((i * 17) % d) + 's' };
    if (kind === 'fly') Object.assign(style, { top: (top ? top[0] + (i * 29) % (top[1] - top[0]) : 10 + i * 12) + '%', left: 0 });
    else style.left = (i * 37) % 100 + '%';
    return <span key={i} className={'fx-' + kind + (i % 2 ? ' alt' : '') + ' absolute'} style={style}>{render(i)}</span>;
  });
}
const Overlay = ({ children }) => <div className="fixed inset-0 z-[35] pointer-events-none overflow-hidden" aria-hidden="true">{children}</div>;
// Pháo hoa: các tia nở ra rồi tắt (scale + opacity)
const Firework = ({ x, y, c, delay, size = 120 }) => (
  <svg viewBox="-60 -60 120 120" className="firework absolute" style={{ left: x, top: y, width: size, height: size, animationDelay: delay }} aria-hidden="true">
    {Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return <g key={i}><line x1={Math.cos(a) * 14} y1={Math.sin(a) * 14} x2={Math.cos(a) * 48} y2={Math.sin(a) * 48} stroke={c[i % c.length]} strokeWidth="3" strokeLinecap="round" /><circle cx={Math.cos(a) * 54} cy={Math.sin(a) * 54} r="3.2" fill={c[(i + 1) % c.length]} /></g>; })}
  </svg>
);
// Hoa 5 cánh (mai vàng / đào hồng)
const Flower = ({ x, y, r = 6, c = '#FACC15', core = '#B45309' }) => (
  <g transform={`translate(${x} ${y})`}>
    {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy={-r * .9} rx={r * .62} ry={r * .9} fill={c} transform={`rotate(${a})`} />)}
    <circle r={r * .38} fill={core} />
  </g>
);
const FlowerSvg = ({ c, core }) => <svg viewBox="-10 -10 20 20" className="w-full h-full"><Flower x={0} y={0} r={7} c={c} core={core} /></svg>;
const Lantern = ({ x, y, s = 1, c = '#DC2626', g = '#FACC15' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <line x1="0" y1="-30" x2="0" y2="-18" stroke="#78350F" strokeWidth="2" />
    <rect x="-9" y="-20" width="18" height="5" rx="2" fill={g} />
    <ellipse cx="0" cy="2" rx="22" ry="20" fill={c} /><path d="M-10,-16 Q-18,2 -10,20 M0,-18 V22 M10,-16 Q18,2 10,20" stroke={g} strokeWidth="1.6" fill="none" opacity=".8" />
    <rect x="-9" y="19" width="18" height="5" rx="2" fill={g} /><path d="M-4,24 v14 M0,24 v18 M4,24 v14" stroke={g} strokeWidth="2" />
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
const VnFlag = ({ x, y, w = 60, pole = 110 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="-2" y={-pole} width="4" height={pole} fill="#9CA3AF" /><circle cx="0" cy={-pole - 3} r="4" fill="#FACC15" />
    <path d={`M2,${-pole} Q${w * .5},${-pole - 8} ${w},${-pole} L${w},${-pole + w * .66} Q${w * .5},${-pole + w * .66 - 8} 2,${-pole + w * .66} Z`} fill="#DA251D" />
    <path d={`M${w * .5},${-pole + w * .14} l${w * .07},${w * .21} l${w * .22},0 l-${w * .18},${w * .13} l${w * .07},${w * .21} l-${w * .18},-${w * .13} l-${w * .18},${w * .13} l${w * .07},-${w * .21} l-${w * .18},-${w * .13} l${w * .22},0Z`} fill="#FFFF00" />
  </g>
);

/* ============================ TẾT NGUYÊN ĐÁN ============================ */
const BlossomTree = ({ x, y, flip = 1, c, core }) => {
  const pts = [[-10, -150], [30, -170], [70, -150], [100, -120], [-40, -120], [-70, -95], [10, -110], [50, -95], [90, -80], [120, -60], [-20, -80], [20, -65], [-60, -55], [65, -130], [-5, -185], [40, -140], [85, -170], [-45, -160], [110, -100], [130, -85]];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip} 1)`}>
      <path d="M0,0 C4,-40 -6,-70 10,-100 C20,-120 40,-130 60,-150 M10,-100 C-10,-115 -30,-120 -50,-140 M8,-70 C30,-75 60,-80 100,-100 M60,-150 C80,-160 90,-170 100,-175 M-2,-40 C-20,-50 -40,-60 -60,-60"
        stroke="#5B3A1E" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M0,0 C4,-40 -6,-70 10,-100" stroke="#5B3A1E" strokeWidth="14" fill="none" strokeLinecap="round" />
      {pts.map(([px, py], i) => <Flower key={i} x={px} y={py} r={i % 3 ? 7 : 9} c={c} core={core} />)}
    </g>
  );
};
const BanhChung = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="0" y="0" width="54" height="40" rx="3" fill="#15803D" /><rect x="6" y="-30" width="42" height="32" rx="3" fill="#16A34A" />
    <path d="M18,0 v40 M36,0 v40 M0,20 h54 M21,-30 v32 M33,-30 v32 M6,-14 h42" stroke="#FDE68A" strokeWidth="2.4" />
  </g>
);
const CauDoi = ({ x, y, text }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="0" y="0" width="34" height="150" rx="3" fill="#B91C1C" stroke="#FACC15" strokeWidth="3" />
    {text.split('').map((ch, i) => <text key={i} x="17" y={30 + i * 26} textAnchor="middle" fontSize="20" fontWeight="800" fill="#FACC15" fontFamily="serif">{ch}</text>)}
  </g>
);
const TetBase = memo(() => (
  <Layer>
    <defs><linearGradient id="tground" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FEF3C7" /><stop offset="1" stopColor="#FDE68A" /></linearGradient></defs>
    <path d="M0,300 Q260,250 540,290 T1060,275 V480 H0 Z" fill="#BBF7D0" opacity=".7" />
    <path d="M0,340 Q300,300 560,335 T1060,325 V480 H0 Z" fill="url(#tground)" />
    <BlossomTree x={120} y={360} c="#FACC15" core="#B45309" />
    <BlossomTree x={950} y={360} flip={-1} c="#F9A8D4" core="#BE185D" />
    {/* chậu cây */}
    <path d="M90,360 h60 l-8,40 h-44 Z" fill="#B45309" /><path d="M920,360 h60 l-8,40 h-44 Z" fill="#1D4ED8" />
    <CauDoi x={300} y={180} text="PHÚC" /><CauDoi x={720} y={180} text="LỘC" />
    <BanhChung x={420} y={360} /><BanhChung x={480} y={372} />
    <RiceSack x={560} y={340} label="ĐỖ ĐẠT" sack="#FEE2E2" ink="#B91C1C" ribbon="#FACC15" />
    <RiceSack x={616} y={350} label="THÀNH CÔNG" sack="#FEE2E2" ink="#B91C1C" ribbon="#FACC15" />
    {/* dây pháo */}
    <g transform="translate(250 120)"><line x1="0" y1="0" x2="0" y2="150" stroke="#7F1D1D" strokeWidth="2" />
      {Array.from({ length: 10 }, (_, i) => <rect key={i} x={i % 2 ? 1 : -13} y={8 + i * 14} width="12" height="7" rx="2" fill="#DC2626" stroke="#FACC15" />)}</g>
    <path d="M0,430 Q300,410 600,432 T1060,422 V480 H0 Z" fill="#FDE68A" />
  </Layer>
));
const TetGlow = memo(() => <Layer className="twinkle">{[[300, 170], [334, 330], [720, 170], [754, 330], [560, 330], [480, 358]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#FDE047" />)}</Layer>);
export const Tet = {
  Sky: memo(() => <Sky bg="linear-gradient(180deg,#B91C1C 0%,#EA580C 35%,#FBBF24 65%,#FFF7ED 100%)"><Twinkles n={10} color="#FDE68A" /></Sky>),
  Scene: memo(({ className }) => <div className={className + ' overflow-hidden pointer-events-none'}><TetBase /><TetGlow /></div>),
  Overlay: memo(() => (
    <Overlay>
      <Particles n={22} kind="fall" size={[10, 16]} dur={[11, 18]} render={i => <FlowerSvg c={i % 2 ? '#FACC15' : '#F9A8D4'} core={i % 2 ? '#B45309' : '#BE185D'} />} />
      <Firework x="34%" y="6%" c={['#FACC15', '#F87171', '#FDE68A']} delay="0s" />
      <Firework x="70%" y="3%" c={['#FDE047', '#FB923C', '#FFFFFF']} delay="1.6s" size={100} />
      <Firework x="56%" y="12%" c={['#F472B6', '#FACC15', '#FFFFFF']} delay="3.1s" size={90} />
      <svg viewBox="-30 -40 60 90" className="swing absolute right-3 top-14 w-12" aria-hidden="true"><Lantern x={0} y={0} /></svg>
    </Overlay>)),
  Hat: ({ className = '' }) => <svg viewBox="-12 -12 24 24" className={className} aria-hidden="true"><Flower x={0} y={0} r={8} c="#FACC15" core="#B45309" /></svg>,
  head: 'from-red-700 via-red-600 to-amber-500', sub: '🧧 Chúc mừng năm mới', subCls: 'text-red-600'
};

/* ============================ 30/4 – 1/5 ============================ */
const Dove = () => (
  <svg viewBox="0 0 80 50" className="w-full h-full" aria-hidden="true">
    <path d="M10,30 Q30,18 50,26 Q62,30 70,24 Q66,34 52,36 Q34,42 18,38Z" fill="#fff" stroke="#CBD5E1" />
    <path d="M30,26 Q34,2 52,4 Q44,16 44,28Z" fill="#F8FAFC" stroke="#CBD5E1" />
    <circle cx="64" cy="27" r="1.6" fill="#1E293B" /><path d="M70,24 l7,1 l-6,3z" fill="#F59E0B" />
    <path d="M66,30 q4,4 8,2" stroke="#16A34A" strokeWidth="2" fill="none" /><circle cx="74" cy="32" r="2" fill="#22C55E" />
  </svg>
);
const LeBase = memo(() => (
  <Layer>
    <path d="M0,300 Q280,260 560,295 T1060,280 V480 H0 Z" fill="#86EFAC" />
    <path d="M0,350 Q300,315 560,345 T1060,335 V480 H0 Z" fill="#4ADE80" />
    {/* cờ dây */}
    <path d="M40,150 Q300,200 530,150 T1020,150" stroke="#9CA3AF" strokeWidth="2" fill="none" />
    {Array.from({ length: 22 }, (_, i) => { const x = 60 + i * 44, y = 150 + Math.sin(i / 21 * Math.PI * 2) * 22; return <path key={i} d={`M${x - 12},${y} L${x + 12},${y} L${x},${y + 24}Z`} fill={i % 2 ? '#FACC15' : '#DC2626'} />; })}
    <VnFlag x={180} y={350} w={80} pole={170} /><VnFlag x={880} y={350} w={80} pole={170} />
    <VnFlag x={330} y={340} w={50} pole={120} /><VnFlag x={730} y={340} w={50} pole={120} />
    {/* băng rôn */}
    <g transform="translate(400 210)">
      <rect x="0" y="0" width="260" height="56" rx="8" fill="#DC2626" stroke="#FACC15" strokeWidth="3" />
      <text x="130" y="37" textAnchor="middle" fontSize="26" fontWeight="900" fill="#FACC15" fontFamily="sans-serif">30/4 – 1/5</text>
    </g>
    {[[90, 380], [260, 395], [470, 390], [640, 400], [800, 385], [990, 395]].map(([x, y], i) => (
      <g key={i}><path d={`M${x},${y + 30} v-26`} stroke="#15803D" strokeWidth="3" /><Flower x={x} y={y} r={9} c={i % 2 ? '#FACC15' : '#EF4444'} core={i % 2 ? '#EA580C' : '#FDE047'} /></g>))}
    <RiceSack x={520} y={350} label="HỌC TỐT" ribbon="#DC2626" />
    <path d="M0,430 Q300,410 600,432 T1060,422 V480 H0 Z" fill="#22C55E" />
  </Layer>
));
export const Le304 = {
  Sky: memo(() => (
    <Sky bg="linear-gradient(180deg,#38BDF8 0%,#7DD3FC 40%,#E0F2FE 80%,#F0FDF4 100%)">
      <div className="absolute right-[8%] top-[8%] w-20 h-20 rounded-full" style={{ background: 'radial-gradient(circle,#FEF9C3,#FDE047 60%,#FACC15)', boxShadow: '0 0 50px 16px rgba(253,224,71,.55)' }} />
    </Sky>)),
  Scene: memo(({ className }) => <div className={className + ' overflow-hidden pointer-events-none'}><LeBase /></div>),
  Overlay: memo(() => (
    <Overlay>
      <Particles n={3} kind="fly" size={[54, 70]} dur={[16, 22]} top={[8, 30]} render={() => <Dove />} />
      <Particles n={16} kind="fall" size={[7, 11]} dur={[9, 15]} render={i => <span className="block w-full h-full rounded-sm" style={{ background: i % 2 ? '#FACC15' : '#DC2626' }} />} />
      <Firework x="36%" y="5%" c={['#DC2626', '#FACC15', '#FFFFFF']} delay="0s" />
      <Firework x="75%" y="4%" c={['#FACC15', '#DC2626']} delay="2s" size={100} />
    </Overlay>)),
  Hat: ({ className = '' }) => <svg viewBox="0 -60 70 66" className={className} aria-hidden="true"><VnFlag x={4} y={6} w={44} pole={60} /></svg>,
  head: 'from-red-700 via-red-600 to-yellow-500', sub: '⭐ Mừng 30/4 – 1/5', subCls: 'text-red-600'
};

/* ============================ TRUNG THU ============================ */
const StarLantern = ({ x, y, s = 1, c = '#EF4444' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <line x1="0" y1="26" x2="0" y2="90" stroke="#92400E" strokeWidth="3" />
    <path d="M0,-30 L8.8,-9.7 L30,-9.3 L12.9,3.6 L18.6,24.3 L0,12 L-18.6,24.3 L-12.9,3.6 L-30,-9.3 L-8.8,-9.7Z" fill={c} stroke="#FACC15" strokeWidth="2" />
    <circle r="7" fill="#FDE68A" opacity=".85" />
    <path d="M-18,24 l-4,14 M18,24 l4,14" stroke="#FACC15" strokeWidth="2" />
  </g>
);
const CarpLantern = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <line x1="0" y1="18" x2="0" y2="86" stroke="#92400E" strokeWidth="3" />
    <path d="M-40,0 Q-10,-26 26,-6 Q34,0 26,6 Q-10,26 -40,0Z" fill="#F97316" stroke="#FACC15" strokeWidth="2" />
    <path d="M-40,0 l-18,-14 l4,14 l-4,14Z" fill="#FB923C" stroke="#FACC15" strokeWidth="2" />
    <circle cx="16" cy="-3" r="3" fill="#1E293B" /><path d="M-24,-8 q6,8 0,16 M-12,-12 q6,12 0,24 M0,-12 q6,12 0,24" stroke="#FDE68A" fill="none" strokeWidth="1.6" />
  </g>
);
const Mooncake = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="8" rx="34" ry="10" fill="#92400E" /><rect x="-34" y="-12" width="68" height="20" fill="#B45309" /><ellipse cx="0" cy="-12" rx="34" ry="10" fill="#D97706" />
    <ellipse cx="0" cy="-12" rx="20" ry="5.5" fill="none" stroke="#FDE68A" strokeWidth="2" /><path d="M-8,-12 h16 M0,-16 v8" stroke="#FDE68A" strokeWidth="2" />
  </g>
);
const Rabbit = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="0" rx="22" ry="16" fill="#fff" stroke="#CBD5E1" /><circle cx="18" cy="-12" r="11" fill="#fff" stroke="#CBD5E1" />
    <ellipse cx="14" cy="-34" rx="4" ry="14" fill="#fff" stroke="#CBD5E1" /><ellipse cx="22" cy="-34" rx="4" ry="14" fill="#fff" stroke="#CBD5E1" />
    <ellipse cx="14" cy="-34" rx="1.6" ry="9" fill="#FBCFE8" /><ellipse cx="22" cy="-34" rx="1.6" ry="9" fill="#FBCFE8" />
    <circle cx="22" cy="-13" r="1.8" fill="#BE123C" /><circle cx="-22" cy="2" r="5" fill="#fff" stroke="#CBD5E1" />
  </g>
);
const TTBase = memo(() => (
  <Layer>
    <path d="M0,320 Q260,280 520,315 T1060,300 V480 H0 Z" fill="#312E81" />
    {/* mái nhà làng */}
    {[[60, 300], [170, 310], [820, 296], [940, 305]].map(([x, y], i) => <g key={i}><path d={`M${x - 50},${y} L${x},${y - 34} L${x + 50},${y} Z`} fill="#7C2D12" /><rect x={x - 38} y={y} width="76" height="30" fill="#92400E" /><rect x={x - 10} y={y + 8} width="14" height="12" fill="#FDE68A" /></g>)}
    <path d="M0,360 Q300,330 560,355 T1060,345 V480 H0 Z" fill="#4338CA" />
    <StarLantern x={250} y={300} c="#EF4444" /><StarLantern x={330} y={315} s={.8} c="#F59E0B" /><StarLantern x={760} y={305} s={.9} c="#EC4899" />
    <CarpLantern x={640} y={300} />
    <Mooncake x={480} y={395} /><Mooncake x={548} y={402} />
    <Rabbit x={880} y={400} />
    <path d="M0,430 Q300,410 600,432 T1060,422 V480 H0 Z" fill="#3730A3" />
  </Layer>
));
const TTGlow = memo(() => <Layer className="twinkle">{[[250, 300], [330, 315], [760, 305], [640, 300]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="10" fill="#FDE68A" opacity=".55" />)}</Layer>);
export const TrungThu = {
  Sky: memo(() => (
    <Sky bg="linear-gradient(180deg,#0F172A 0%,#1E1B4B 40%,#4338CA 75%,#A5B4FC 100%)">
      <Twinkles n={16} />
      {/* trăng rằm có bóng cây đa, chú Cuội */}
      <svg viewBox="-60 -60 120 120" className="absolute right-[6%] top-[5%] w-32 h-32 sm:w-40 sm:h-40" style={{ filter: 'drop-shadow(0 0 30px rgba(253,230,138,.6))' }} aria-hidden="true">
        <circle r="56" fill="#FEF3C7" /><circle r="56" fill="#FDE68A" opacity=".55" />
        <path d="M-6,40 C-4,20 -10,8 -2,-4 M-2,-4 C-20,-10 -28,-6 -34,4 M-2,-4 C10,-16 26,-14 34,-4" stroke="#B45309" strokeWidth="4" fill="none" opacity=".55" strokeLinecap="round" />
        <circle cx="-14" cy="-14" r="16" fill="#D97706" opacity=".3" /><circle cx="14" cy="-18" r="18" fill="#D97706" opacity=".3" />
        <g opacity=".5" fill="#92400E"><circle cx="18" cy="24" r="4" /><rect x="15" y="27" width="6" height="12" rx="2" /></g>
      </svg>
    </Sky>)),
  Scene: memo(({ className }) => <div className={className + ' overflow-hidden pointer-events-none'}><TTBase /><TTGlow /></div>),
  Overlay: memo(() => (
    <Overlay>
      <Particles n={7} kind="rise" size={[14, 22]} dur={[18, 26]} render={i => (
        <svg viewBox="-34 -34 68 68" className="w-full h-full"><path d="M0,-30 L8.8,-9.7 L30,-9.3 L12.9,3.6 L18.6,24.3 L0,12 L-18.6,24.3 L-12.9,3.6 L-30,-9.3 L-8.8,-9.7Z" fill={['#EF4444', '#F59E0B', '#EC4899'][i % 3]} stroke="#FACC15" strokeWidth="2" /><circle r="7" fill="#FDE68A" /></svg>)} />
    </Overlay>)),
  Hat: ({ className = '' }) => <svg viewBox="-34 -34 68 68" className={className} aria-hidden="true"><path d="M0,-30 L8.8,-9.7 L30,-9.3 L12.9,3.6 L18.6,24.3 L0,12 L-18.6,24.3 L-12.9,3.6 L-30,-9.3 L-8.8,-9.7Z" fill="#EF4444" stroke="#FACC15" strokeWidth="3" /><circle r="7" fill="#FDE68A" /></svg>,
  head: 'from-indigo-800 via-purple-700 to-amber-500', sub: '🥮 Trung Thu đoàn viên', subCls: 'text-indigo-700'
};

/* ============================ HALLOWEEN ============================ */
const Pumpkin = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="-16" cy="0" rx="20" ry="26" fill="#EA580C" /><ellipse cx="16" cy="0" rx="20" ry="26" fill="#EA580C" /><ellipse cx="0" cy="0" rx="20" ry="28" fill="#F97316" />
    <path d="M-2,-26 q2,-12 10,-14" stroke="#15803D" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M-16,-8 l8,-8 l8,8z M16,-8 l-8,-8 l-8,8z" fill="#FDE047" transform="translate(0 0)" />
    <path d="M-18,8 Q0,24 18,8 l-5,4 l-4,-4 l-4,5 l-4,-5 l-4,5 l-4,-5z" fill="#FDE047" />
  </g>
);
const BareTree = ({ x, y }) => (
  <path transform={`translate(${x} ${y})`} d="M0,0 C4,-50 -8,-90 6,-140 M6,-140 C-10,-160 -30,-165 -50,-190 M6,-140 C20,-160 40,-160 60,-185 M2,-90 C-20,-100 -40,-100 -66,-120 M4,-70 C26,-80 46,-80 70,-100 M-30,-165 l-14,-30 M40,-160 l18,-28"
    stroke="#1F1235" strokeWidth="9" fill="none" strokeLinecap="round" />
);
const Bat = () => (
  <svg viewBox="0 0 80 40" className="w-full h-full" aria-hidden="true">
    <path d="M40,18 C34,6 24,4 4,8 C12,12 12,18 8,24 C16,20 22,22 28,28 C30,22 34,20 40,26 C46,20 50,22 52,28 C58,22 64,20 72,24 C68,18 68,12 76,8 C56,4 46,6 40,18Z" fill="#1F1235" />
    <circle cx="37" cy="17" r="1.4" fill="#FDE047" /><circle cx="43" cy="17" r="1.4" fill="#FDE047" />
  </svg>
);
const HwBase = memo(() => (
  <Layer>
    <path d="M0,300 Q260,260 520,300 T1060,285 V480 H0 Z" fill="#3B0764" />
    {/* lâu đài ma */}
    <g transform="translate(430 150)" fill="#1F1235">
      <rect x="0" y="60" width="200" height="110" /><rect x="-20" y="20" width="50" height="150" /><rect x="170" y="0" width="50" height="170" />
      <path d="M-28,22 L5,-30 L38,22Z M162,2 L195,-60 L228,2Z M60,60 L100,10 L140,60Z" />
    </g>
    <g fill="#FDE047" opacity=".9">{[[452, 200], [600, 180], [510, 240], [560, 240], [612, 230]].map(([x, y], i) => <rect key={i} x={x} y={y} width="14" height="18" rx="3" />)}</g>
    <BareTree x={160} y={330} /><BareTree x={950} y={325} />
    <path d="M0,350 Q300,320 560,348 T1060,338 V480 H0 Z" fill="#581C87" />
    {/* bia mộ vui */}
    {[[300, 350], [760, 352]].map(([x, y], i) => <g key={i}><path d={`M${x - 20},${y} v-34 a20,20 0 0 1 40,0 v34z`} fill="#94A3B8" /><text x={x} y={y - 16} textAnchor="middle" fontSize="11" fontWeight="800" fill="#475569" fontFamily="sans-serif">BOO</text></g>)}
    <Pumpkin x={240} y={392} /><Pumpkin x={330} y={404} s={.75} /><Pumpkin x={830} y={395} s={.9} /><Pumpkin x={700} y={404} s={.7} />
    {/* chồng sách đội mũ phù thủy */}
    <RiceSack x={520} y={350} ribbon="#7C3AED" />
    <path d="M520,352 L550,300 L580,352Z" fill="#1F1235" /><ellipse cx="550" cy="352" rx="38" ry="7" fill="#1F1235" /><rect x="536" y="338" width="28" height="6" fill="#F97316" />
    {/* mèo đen trên hàng rào */}
    <g transform="translate(90 330)"><rect x="-40" y="0" width="100" height="6" fill="#1F1235" />{[-36, -12, 12, 36].map(px => <rect key={px} x={px} y="-6" width="8" height="40" fill="#1F1235" />)}
      <g transform="translate(10 -22)" fill="#111827"><ellipse cx="0" cy="8" rx="12" ry="14" /><circle cx="0" cy="-10" r="9" /><path d="M-8,-16 l2,-10 l6,8z M8,-16 l-2,-10 l-6,8z" /><path d="M10,14 q16,-4 12,-24" stroke="#111827" strokeWidth="4" fill="none" /></g>
      <circle cx="6" cy="-33" r="1.8" fill="#FDE047" /><circle cx="14" cy="-33" r="1.8" fill="#FDE047" /></g>
    <path d="M0,430 Q300,410 600,432 T1060,422 V480 H0 Z" fill="#4C1D95" />
  </Layer>
));
const HwGlow = memo(() => <Layer className="flicker">{[[240, 392], [330, 404], [830, 395], [700, 404]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="22" fill="#FDE047" opacity=".25" />)}</Layer>);
export const Halloween = {
  Sky: memo(() => (
    <Sky bg="linear-gradient(180deg,#0B0618 0%,#2E1065 40%,#7C2D12 78%,#F97316 100%)">
      <Twinkles n={12} />
      <div className="absolute right-[8%] top-[7%] w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle at 40% 40%,#FFF7ED,#FED7AA 55%,#FB923C)', boxShadow: '0 0 60px 18px rgba(251,146,60,.45)' }} />
    </Sky>)),
  Scene: memo(({ className }) => <div className={className + ' overflow-hidden pointer-events-none'}><HwBase /><HwGlow /></div>),
  Overlay: memo(() => (
    <Overlay>
      <Particles n={5} kind="fly" size={[40, 60]} dur={[12, 20]} top={[6, 40]} render={() => <Bat />} />
      <Particles n={10} kind="fall" size={[10, 14]} dur={[12, 18]} render={i => <svg viewBox="-10 -10 20 20" className="w-full h-full"><path d="M0,-9 C6,-4 8,4 0,9 C-8,4 -6,-4 0,-9Z" fill={i % 2 ? '#EA580C' : '#B45309'} /></svg>} />
      <svg viewBox="0 0 100 100" className="absolute left-0 top-0 w-24 opacity-70" aria-hidden="true">
        <path d="M0,0 L100,0 M0,0 L90,40 M0,0 L70,70 M0,0 L40,90 M0,0 L0,100 M20,0 Q16,8 18,18 Q8,16 0,20 M45,0 Q36,18 40,40 Q18,36 0,45 M70,0 Q58,30 62,60 Q30,58 0,70" stroke="#E2E8F0" strokeWidth="1.2" fill="none" />
      </svg>
    </Overlay>)),
  Hat: ({ className = '' }) => <svg viewBox="0 0 64 48" className={className} aria-hidden="true"><path d="M6,40 L34,2 L52,40Z" fill="#1F1235" /><ellipse cx="30" cy="40" rx="28" ry="6" fill="#1F1235" /><rect x="18" y="30" width="26" height="5" fill="#F97316" /></svg>,
  head: 'from-orange-600 via-purple-700 to-slate-900', sub: '🎃 Halloween vui vẻ', subCls: 'text-orange-600'
};
