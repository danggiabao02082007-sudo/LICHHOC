// Sinh các trang portal giả lập (kiểu ASP.NET WebForms + GridView) để thử tiện ích
// Giống portal thật (new-portal4): Dashboard chỉ có ô "Quản Lý Học Tập" → trang mục lục mới có link TKB, lịch thi, điểm
const menu = `<div id="menu"><a href="Default.aspx?pid=62">Dashboard</a> | <a href="Logout.aspx">Đăng xuất</a></div>`;
const tiles = `<div class="tiles"><a href="Default.aspx?pid=63"><img src="u.png" alt=""><br>User Account</a> <a href="Default.aspx?pid=70"><img src="q.png" alt=""><br>Quản Lý Học Tập</a></div>`;
const hub = `<ul><li><a href="SinhVien/ThoiKhoaBieu.aspx">Thời khóa biểu</a></li><li><a href="SinhVien/LichThi.aspx">Lịch thi</a></li>
  <li><a href="SinhVien/KetQuaHocTap.aspx">Kết quả học tập</a></li><li><a href="ThongBao.aspx">Thông báo</a></li></ul>`;
const page = (title, body) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>HCMUS Portal - ${title}</title></head><body><form id="aspnetForm">${menu}<h2>${title}</h2>${body}</form></body></html>`;
const grid = (heads, rows) => `<table class="grid" cellspacing="0" rules="all" border="1" id="ctl00_ContentPlaceHolder1_gvData"><tr>${heads.map(h => `<th scope="col">${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const term = `<select name="ddlHocKy"><option>Học kỳ 2 năm học 2025-2026</option><option selected="selected">Học kỳ 1 năm học 2026-2027</option></select>`;
module.exports = room => ({
  'Default.aspx?pid=70': page('Quản Lý Học Tập', hub),
  'Default.aspx': page('Dashboard', tiles + `<div id="ThongBao"><ul>
    <li><a href="ThongBaoChiTiet.aspx?id=101">Thông báo lịch thi cuối kỳ học kỳ 1 năm học 2026-2027</a> <span>(25/11/2026)</span></li>
    <li><a href="ThongBaoChiTiet.aspx?id=100">Thông báo đóng học phí học kỳ 1 năm học 2026-2027</a> <span>(10/11/2026)</span></li></ul></div>`),
  'SinhVien/ThoiKhoaBieu.aspx': page('Thời khóa biểu', term + grid(['STT', 'Mã MH', 'Tên môn học', 'Lớp', 'Số TC', 'Thứ', 'Tiết', 'Phòng', 'Từ ngày', 'Đến ngày', 'Giảng viên'], [
    ['1', 'PHY00001', 'Vật lý đại cương 1', '26VL1', '3', 'Thứ 2', '1-3', room, '07/09/2026', '10/01/2027', 'TS. Nguyễn Văn A'],
    ['2', 'MTH00010', 'Giải tích 1A', '26VL1', '4', 'Thứ 3<br>Thứ 5', '4-5<br>1-3', 'F102<br>F203', '07/09/2026', '10/01/2027', 'TS. Trần Thị B'],
    ['3', 'PHY00081', 'Thực hành Vật lý đại cương 1', '26VL1_1', '1', 'Thứ 4', '7-10', 'PTN B.101', '07/09/2026', '10/01/2027', 'ThS. Lê C'],
    ['4', 'CHE00001', 'Hóa đại cương 1', '26VL1', '3', 'Thứ 6', '1-3', 'E301', '07/09/2026', '10/01/2027', 'TS. Phạm D'],
    ['5', 'BAA00101', 'Triết học Mác - Lênin', '26_1', '3', 'Thứ 7', '6-8', 'C21', '07/09/2026', '10/01/2027', 'TS. Võ E']])),
  'SinhVien/LichThi.aspx': page('Lịch thi', term + grid(['STT', 'Mã MH', 'Tên môn học', 'Ngày thi', 'Giờ thi', 'Phòng thi', 'Hình thức', 'SBD'], [
    ['1', 'PHY00001', 'Vật lý đại cương 1', '05/01/2027', '7g30', 'E301', 'Tự luận', '012'],
    ['2', 'MTH00010', 'Giải tích 1A', '07/01/2027', '13:30', 'F201', 'Tự luận', '045'],
    ['3', 'CHE00001', 'Hóa đại cương 1', '09/01/2027', '9g00', 'E302', 'Trắc nghiệm', '018']])),
  'SinhVien/KetQuaHocTap.aspx': page('Kết quả học tập', `<h3>Học kỳ 2 năm học 2025-2026</h3>` + grid(['Mã MH', 'Tên môn học', 'Số TC', 'Điểm QT', 'Điểm thi', 'Điểm TK', 'Kết quả'], [
    ['MTH00001', 'Toán cao cấp', '4', '8', '7', '7.5', 'Đạt'], ['PHY00000', 'Nhập môn Vật lý', '2', '9', '9', '9', 'Đạt'], ['BAA00021', 'Giáo dục thể chất 1', '2', '', '', '8', 'Đạt']])),
  'ThongBao.aspx': page('Thông báo', `<div class="news"><table>
    <tr><td><a href="ThongBaoChiTiet.aspx?id=101">Thông báo lịch thi cuối kỳ học kỳ 1 năm học 2026-2027</a></td><td>25/11/2026</td></tr>
    <tr><td><a href="ThongBaoChiTiet.aspx?id=100">Thông báo đóng học phí học kỳ 1 năm học 2026-2027</a></td><td>10/11/2026</td></tr></table></div>`)
});
