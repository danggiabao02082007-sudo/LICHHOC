// Xuất lịch học + lịch thi ra file .ics (thêm vào Google Calendar / Lịch iPhone)
import { timeOf, addDays, dowOf } from './time.js';
const esc = s => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
const stamp = (d, hhmm) => d.replace(/-/g, '') + 'T' + (hhmm || '00:00').replace(':', '') + '00';
const DOW = ['', '', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export function buildIcs({ tkb = [], exams = [], periods = [], term = '' }) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LICHHOC//HCMUS//VI', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:Lịch học ${esc(term)}`, 'X-WR-TIMEZONE:Asia/Ho_Chi_Minh'];
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  let n = 0;
  for (const c of tkb) {
    const t = timeOf(c, periods); if (!t.start || !c.day) continue;
    let first = c.start; if (!first) continue;
    while (dowOf(first) !== c.day) first = addDays(first, 1);
    L.push('BEGIN:VEVENT', `UID:lh-${n++}-${esc(c.code)}@lichhoc`, `DTSTAMP:${now}`, `DTSTART;TZID=Asia/Ho_Chi_Minh:${stamp(first, t.start)}`, `DTEND;TZID=Asia/Ho_Chi_Minh:${stamp(first, t.end || t.start)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${DOW[c.day]}${c.end ? `;UNTIL=${c.end.replace(/-/g, '')}T235959` : ''}`,
      `SUMMARY:${esc(c.name || c.code)}`, `LOCATION:${esc(c.room)}`, `DESCRIPTION:${esc([c.code, c.group && 'Lớp ' + c.group, c.teacher, `Tiết ${c.p1}-${c.p2 || c.p1}`].filter(Boolean).join(' · '))}`, 'END:VEVENT');
  }
  for (const e of exams) {
    if (!e.date) continue;
    const s = e.time || '07:00', [h, m] = s.split(':').map(Number), end = `${String(Math.min(23, h + 2)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    L.push('BEGIN:VEVENT', `UID:lh-thi-${n++}-${esc(e.code)}@lichhoc`, `DTSTAMP:${now}`, `DTSTART;TZID=Asia/Ho_Chi_Minh:${stamp(e.date, s)}`, `DTEND;TZID=Asia/Ho_Chi_Minh:${stamp(e.date, end)}`,
      `SUMMARY:📝 Thi ${esc(e.name || e.code)}`, `LOCATION:${esc(e.room)}`, `DESCRIPTION:${esc([e.form, e.seat && 'SBD ' + e.seat, !e.time && 'Chưa rõ giờ thi'].filter(Boolean).join(' · '))}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Ngày mai thi', 'END:VALARM', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
