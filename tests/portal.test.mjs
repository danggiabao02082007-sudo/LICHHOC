// Kiểm thử bộ đọc dữ liệu portal: node tests/portal.test.mjs
// Dữ liệu mẫu tự soạn theo các kiểu trình bày thường gặp (chưa phải trang thật của portal HCMUS).
import { classify, normalize, extract, tablesFromText, detectTerm, diff, parsePeriods, parseDay, parseDate, gpa, to4, noticesFromLinks, hashRows } from '../src/lib/portal.js';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✔', m); } else { fail++; console.log('  ✘', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (được ${JSON.stringify(a)}, mong đợi ${JSON.stringify(b)})`);

console.log('1. Đọc từng ô');
eq(parsePeriods('1-3'), [1, 3], 'Tiết "1-3"'); eq(parsePeriods('Tiết 7 - 9'), [7, 9], 'Tiết "Tiết 7 - 9"'); eq(parsePeriods('123'), [1, 3], 'Tiết "123"');
eq(parsePeriods('4,5,6'), [4, 6], 'Tiết "4,5,6"'); eq(parsePeriods('10->12'), [10, 12], 'Tiết "10->12"');
eq(parseDay('Thứ 2'), 2, 'Thứ 2'); eq(parseDay('Thứ Năm'), 5, 'Thứ Năm'); eq(parseDay('CN'), 8, 'CN'); eq(parseDay('T7'), 7, 'T7'); eq(parseDay('5'), 5, 'ô chỉ có số 5');
eq(parseDate('05/01/2027'), '2027-01-05', 'Ngày dd/mm/yyyy'); eq(parseDate('5-1-27'), '2027-01-05', 'Ngày d-m-yy');
eq(detectTerm('Thời khóa biểu Học kỳ 1 Năm học 2026-2027'), 'HK1 2026-2027', 'Học kỳ dạng chữ');
eq(detectTerm('HK2/2025-2026'), 'HK2 2025-2026', 'Học kỳ dạng HK2/2025-2026'); eq(detectTerm('Năm học 2026 - 2027, học kỳ 2'), 'HK2 2026-2027', 'Năm học trước, học kỳ sau');

console.log('\n2. Thời khóa biểu dạng danh sách');
const tkb = { headers: ['STT', 'Mã MH', 'Tên môn học', 'Lớp', 'Số TC', 'Thứ', 'Tiết', 'Phòng', 'Từ ngày', 'Đến ngày', 'Giảng viên'],
  rows: [['1', 'PHY00001', 'Vật lý đại cương 1', '26VL1', '3', 'Thứ 2', '1-3', 'E201', '08/09/2026', '20/12/2026', 'TS. A'],
    ['2', 'MTH00010', 'Giải tích 1A', '26VL1', '4', 'Thứ 4\nThứ 6', '1-3\n4-5', 'F102\nF203', '08/09/2026', '20/12/2026', 'TS. B'],
    ['', '', 'Tổng số tín chỉ: 7', '', '', '', '', '', '', '', '']] };
ok(classify(tkb) === 'tkb', 'Nhận ra bảng thời khóa biểu');
const T = normalize('tkb', tkb);
eq(T.length, 3, '3 buổi học (1 môn có 2 buổi trong cùng ô)');
eq([T[0].code, T[0].day, T[0].p1, T[0].p2, T[0].room, T[0].start, T[0].end, T[0].credits], ['PHY00001', 2, 1, 3, 'E201', '2026-09-08', '2026-12-20', 3], 'Buổi 1 đúng đủ trường');
eq([T[2].day, T[2].p1, T[2].p2, T[2].room], [6, 4, 5, 'F203'], 'Buổi thứ 2 của môn tách đúng thứ/tiết/phòng');
ok(T[0].raw['Giảng viên'] === 'TS. A', 'Giữ cột gốc trong raw');

console.log('\n3. Thời khóa biểu dạng lưới (cột = thứ)');
const grid = { headers: ['Tiết', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'],
  rows: [['1', 'Vật lý đại cương 1\nPHY00001\nPhòng: E201', '', '', '', '', '', ''], ['2', 'Vật lý đại cương 1\nPHY00001\nPhòng: E201', '', '', '', '', '', ''],
    ['3', 'Vật lý đại cương 1\nPHY00001\nPhòng: E201', '', 'Giải tích 1A\nMTH00010\nPhòng: F102', '', '', '', '']] };
ok(classify(grid) === 'tkb', 'Nhận ra lưới thời khóa biểu');
const G = normalize('tkb', grid);
eq(G.map(x => [x.code, x.day, x.p1, x.p2, x.room]), [['PHY00001', 2, 1, 3, 'E201'], ['MTH00010', 4, 3, 3, 'F102']], 'Gộp tiết liên tiếp, đọc mã môn và phòng');

console.log('\n4. Lịch thi');
const ex = { headers: ['STT', 'Mã MH', 'Tên môn học', 'Ngày thi', 'Giờ thi', 'Phòng thi', 'Hình thức', 'SBD'],
  rows: [['1', 'PHY00001', 'Vật lý đại cương 1', '05/01/2027', '7g30', 'E301', 'Tự luận', '012'], ['2', 'MTH00010', 'Giải tích 1A', '08/01/2027', '13:30', 'F201', 'Trắc nghiệm', '045']] };
ok(classify(ex) === 'lichthi', 'Nhận ra lịch thi');
const E = normalize('lichthi', ex);
eq([E[0].date, E[0].time, E[0].room, E[0].seat, E[0].form], ['2027-01-05', '07:30', 'E301', '012', 'Tự luận'], 'Lịch thi đọc đúng ngày, giờ "7g30", phòng, SBD');
eq(E[1].time, '13:30', 'Giờ thi "13:30"');

console.log('\n5. Kết quả học tập (thứ tự cột giống script tính GPA: tên ở cột 2, TC cột 3, điểm cột 6)');
const gr = { headers: ['Mã MH', 'Tên môn học', 'Số TC', 'Điểm QT', 'Điểm thi', 'Điểm TK', 'Kết quả'],
  rows: [['PHY00001', 'Vật lý đại cương 1', '3', '8', '7', '7.5', 'Đạt'], ['MTH00010', 'Giải tích 1A', '4', '9', '9', '9', 'Đạt'],
    ['BAA00021', 'Giáo dục thể chất 1', '2', '', '', '8', 'Đạt'], ['CHE00001', 'Hóa đại cương', '3', '', '', '', ''], ['', 'Điểm trung bình học kỳ', '', '', '', '8.36', '']] };
ok(classify(gr) === 'diem', 'Nhận ra bảng điểm');
const D = normalize('diem', gr);
eq(D.map(x => [x.code, x.credits, x.grade]), [['PHY00001', 3, 7.5], ['MTH00010', 4, 9], ['BAA00021', 2, 8], ['CHE00001', 3, null]], 'Chọn đúng cột "Điểm TK" (không lấy điểm QT/thi), bỏ dòng trung bình');
const g = gpa(D);
eq(Math.round(g.avg10 * 100) / 100, Math.round((3 * 7.5 + 4 * 9) / 7 * 100) / 100, 'Điểm TB hệ 10 có trọng số tín chỉ, không tính Giáo dục thể chất, bỏ môn chưa có điểm');
eq(g.credits, 7, 'Số tín chỉ tính TB'); eq(to4(7.5), 3, 'Quy đổi 7,5 → 3,0'); eq(to4(9), 4, 'Quy đổi 9 → 4,0');

console.log('\n6. Văn bản dán (Ctrl+A, Ctrl+C trên trang)');
const pasted = `HCMUS Portal\nThời khóa biểu học kỳ 1 năm học 2026-2027\nSTT\tMã MH\tTên môn học\tLớp\tSố TC\tThứ\tTiết\tPhòng\tTừ ngày\tĐến ngày\n1\tPHY00001\tVật lý đại cương 1\t26VL1\t3\tThứ 2\t1-3\tE201\t08/09/2026\t20/12/2026\n2\tMTH00010\tGiải tích 1A\t26VL1\t4\tThứ 4\t1-3\tF102\t08/09/2026\t20/12/2026\n\nPhiên bản 2.2.8`;
const tt = tablesFromText(pasted);
eq(tt.length, 1, 'Tìm thấy 1 bảng trong văn bản dán');
const X = extract(tt, pasted);
eq(X.items.map(i => [i.kind, i.rows.length]), [['tkb', 2]], 'Nhận ra TKB 2 môn từ văn bản dán');
eq(detectTerm(pasted), 'HK1 2026-2027', 'Đọc học kỳ từ văn bản dán');
const junk = tablesFromText('a\tb\tc\n1\t2\t3');
eq(extract(junk).unknown.length, 1, 'Bảng lạ được đưa vào "không nhận dạng"');

console.log('\n7. Phát hiện thay đổi');
const T2 = JSON.parse(JSON.stringify(T)); T2[0].room = 'B105';
let c = diff('tkb', T, T2); eq(c.map(x => x.type), ['room'], 'Đổi phòng → 1 thay đổi loại "đổi phòng"');
ok(c[0].detail[0].includes('E201') && c[0].detail[1].includes('B105'), 'Ghi rõ phòng cũ → phòng mới');
const T3 = JSON.parse(JSON.stringify(T)); T3[1].day = 3;
c = diff('tkb', T, T3); eq(c.map(x => x.type), ['time'], 'Đổi thứ → "đổi lịch học"');
c = diff('tkb', T, T.slice(0, 1)); eq(c.map(x => x.type), ['remove'], 'Bỏ môn → "môn không còn"');
c = diff('tkb', T.slice(0, 1), T); eq(c.map(x => x.type), ['add'], 'Thêm môn → "môn mới"');
eq(diff('tkb', null, T), [], 'Lần đồng bộ đầu tiên không báo thay đổi');
eq(diff('tkb', T, JSON.parse(JSON.stringify(T))), [], 'Không đổi → không báo');
const E2 = JSON.parse(JSON.stringify(E)); E2[0].date = '2027-01-06'; E2[0].room = 'E302';
c = diff('lichthi', E, E2); eq(c.map(x => x.type), ['change'], 'Đổi ngày + phòng thi → 1 thay đổi');
ok(c[0].detail[0].includes('05/01/2027') && c[0].detail[1].includes('06/01/2027'), 'Ghi ngày thi cũ → mới');
c = diff('lichthi', E.slice(0, 1), E); eq(c.map(x => x.type), ['add'], 'Có lịch thi mới');
const D2 = JSON.parse(JSON.stringify(D)); D2[3].grade = 6.5; D2[0].grade = 8;
c = diff('diem', D, D2); eq(c.map(x => x.type), ['grade', 'grade'], 'Điểm thay đổi + có điểm mới');
ok(hashRows(T) === hashRows(JSON.parse(JSON.stringify(T))) && hashRows(T) !== hashRows(T2), 'Mã băm ổn định, đổi khi dữ liệu đổi');

console.log('\n8. Thông báo (danh sách liên kết)');
const N = noticesFromLinks([{ text: 'Thông báo lịch thi cuối kỳ học kỳ 1 năm học 2026-2027', href: 'https://new-portal2.hcmus.edu.vn/ThongBao.aspx?id=123', context: '25/11/2026' },
  { text: 'Đăng xuất', href: '/Logout.aspx' }, { text: 'Trang chủ', href: '/' }]);
eq(N.map(x => [x.title.slice(0, 25), x.date]), [['Thông báo lịch thi cuối k', '2026-11-25']], 'Lấy tin, bỏ liên kết menu, đọc ngày');

console.log(`\nKẾT QUẢ: ${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
