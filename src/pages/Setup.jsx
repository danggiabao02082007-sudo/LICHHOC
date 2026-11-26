// Hiện khi app chưa được nối với cơ sở dữ liệu Supabase (config.js còn trống)
import Backdrop from '../components/Backdrop.jsx';
export default function Setup() {
  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center px-4 pt-12 pb-12">
      <Backdrop tall />
      <div className="card relative w-full max-w-lg rounded-[2rem] bg-white/95 shadow-2xl p-6 ring-4 ring-white/80">
        <div className="text-center"><img src="icons/icon-192.png" alt="" className="w-20 h-20 rounded-3xl mx-auto shadow-lg heartbeat" />
          <h1 className="mt-3 text-3xl font-extrabold bg-gradient-to-r from-indigo-700 via-fuchsia-600 to-amber-500 bg-clip-text text-transparent">Lịch Học</h1>
          <p className="text-slate-600 text-sm">App chưa được nối với cơ sở dữ liệu.</p></div>
        <ol className="mt-5 space-y-2 text-sm">
          <li><b>1.</b> Vào <a className="text-indigo-700 font-bold underline" href="https://supabase.com/dashboard/projects" target="_blank" rel="noreferrer">supabase.com</a> → <b>New project</b> (miễn phí, chọn vùng Singapore).</li>
          <li><b>2.</b> Mở <b>SQL Editor</b> → dán toàn bộ file <code>supabase/setup.sql</code> trong repo LICHHOC → <b>Run</b>.</li>
          <li><b>3.</b> Vào <b>Project Settings → API</b>, gửi cho người cài app 2 thông tin công khai: <b>Project URL</b> và khóa <b>anon public</b>. (Không gửi khóa <i>service_role</i>.)</li>
        </ol>
      </div>
    </div>
  );
}
