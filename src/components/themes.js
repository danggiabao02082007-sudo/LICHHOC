// Danh sách bộ cảnh theo chủ đề (dùng chung cho App, Đăng nhập)
import { XmasScene, XmasSky, XmasOverlay, SantaHat } from './ChristmasScene.jsx';
import { Tet, Le304, TrungThu, Halloween } from './FestiveScenes.jsx';

export const FEST = {
  xmas: { Sky: XmasSky, Scene: XmasScene, Overlay: XmasOverlay, Hat: SantaHat, head: 'from-red-700 via-rose-600 to-emerald-700', sub: '🎄 Giáng sinh an lành', subCls: 'text-red-600', hat: 'absolute -top-4 -left-3 w-9 -rotate-12 drop-shadow' },
  tet: { ...Tet, hat: 'absolute -top-3 -left-3 w-7 drop-shadow' },
  le304: { ...Le304, hat: 'absolute -top-6 -left-3 w-8 drop-shadow' },
  trungthu: { ...TrungThu, hat: 'absolute -top-3 -left-3 w-7 drop-shadow' },
  halloween: { ...Halloween, hat: 'absolute -top-5 -left-3 w-9 -rotate-12 drop-shadow' }
};
