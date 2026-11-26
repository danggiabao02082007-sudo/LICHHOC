-- LICHHOC: dán toàn bộ file này vào Supabase → SQL Editor → Run (chạy 1 lần trên project mới)

-- ===== 20261126000001_lichhoc.sql =====
-- =====================================================================
-- LỊCH HỌC HCMUS — CƠ SỞ DỮ LIỆU (chạy 1 lần trên project Supabase MỚI, riêng cho app này)
-- App chỉ dành cho 1 người: tài khoản đăng ký ĐẦU TIÊN là chủ; sau đó không ai đăng ký thêm được.
-- Mọi bảng: chỉ chủ đọc được (RLS). Ghi dữ liệu chỉ qua hàm.
-- Nguồn dữ liệu:
--   · Tiện ích Tampermonkey trên portal (dùng "mã đồng bộ" do chủ tạo trong app)
--   · Dán tay trong app (đăng nhập)
--   · Máy chạy ngầm GitHub Actions mỗi 30 phút: tin trường/khoa + gửi thông báo đẩy (dùng "khóa máy chạy ngầm")
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------- Chủ app ----------
create table if not exists public.app_owner (
  id int primary key default 1 check (id = 1),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_owner where user_id = auth.uid())
$$;
create or replace function public._only_one_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.app_owner) then
    raise exception 'App chỉ dành cho 1 người và đã có chủ. Không đăng ký thêm được.';
  end if;
  return new;
end $$;
create or replace function public._set_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_owner(user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists lichhoc_only_one_user on auth.users;
create trigger lichhoc_only_one_user before insert on auth.users for each row execute function public._only_one_user();
drop trigger if exists lichhoc_set_owner on auth.users;
create trigger lichhoc_set_owner after insert on auth.users for each row execute function public._set_owner();

-- ---------- Khóa: mã đồng bộ (tiện ích) + khóa máy chạy ngầm ----------
create table if not exists public.app_keys (
  id int primary key default 1 check (id = 1),
  sync_hash text,                 -- sha256 của mã đồng bộ (chủ tạo trong app)
  cron_hash text,                 -- sha256 của khóa máy chạy ngầm (chủ tạo trong app, tự dán vào GitHub Secrets)
  sync_created_at timestamptz,
  cron_created_at timestamptz,
  vapid_public text,              -- khóa ký thông báo đẩy: app tạo ngay trên máy của chủ
  vapid_private text              -- chỉ máy chạy ngầm đọc được (qua cron_pending)
);
insert into public.app_keys(id) values (1) on conflict (id) do nothing;
create or replace function public._sha(t text) returns text language sql immutable as $$ select encode(extensions.digest(coalesce(t,''), 'sha256'), 'hex') $$;
create or replace function public._check_sync(p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.is_owner() then return; end if;
  if p_key is null or not exists (select 1 from public.app_keys where sync_hash = public._sha(p_key)) then
    raise exception 'Mã đồng bộ không đúng. Hãy tạo mã mới trong app (mục Đồng bộ) và dán lại vào tiện ích.';
  end if;
end $$;
create or replace function public._check_cron(p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from public.app_keys where cron_hash = public._sha(p_key)) then raise exception 'Sai khóa máy chạy ngầm'; end if;
end $$;
/** Chủ tạo mã đồng bộ mới (mã cũ hết hiệu lực). Trả về mã — chỉ hiện 1 lần. */
create or replace function public.new_sync_key() returns text
language plpgsql security definer set search_path = public as $$
declare k text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not public.is_owner() then raise exception 'Chỉ chủ app'; end if;
  update public.app_keys set sync_hash = public._sha(k), sync_created_at = now() where id = 1;
  return k;
end $$;

/** Chủ tạo khóa máy chạy ngầm (dán vào GitHub Secrets tên CRON_KEY). Trả về khóa — chỉ hiện 1 lần. */
create or replace function public.new_cron_key() returns text
language plpgsql security definer set search_path = public as $$
declare k text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not public.is_owner() then raise exception 'Chỉ chủ app'; end if;
  update public.app_keys set cron_hash = public._sha(k), cron_created_at = now() where id = 1;
  return k;
end $$;
/** Khóa ký thông báo đẩy (VAPID) do app tạo trên máy chủ app; chỉ đặt 1 lần (trừ khi p_force) */
create or replace function public.set_vapid(p_public text, p_private text, p_force boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_owner() then raise exception 'Chỉ chủ app'; end if;
  if p_public !~ '^[A-Za-z0-9_-]{80,100}$' or p_private !~ '^[A-Za-z0-9_-]{40,50}$' then raise exception 'Khóa không hợp lệ'; end if;
  update public.app_keys set vapid_public = p_public, vapid_private = p_private where id = 1 and (vapid_public is null or p_force);
  select vapid_public into v from public.app_keys where id = 1;
  return v;
end $$;
create or replace function public.vapid_public() returns text
language sql stable security definer set search_path = public as $$ select case when public.is_owner() then (select vapid_public from public.app_keys where id = 1) end $$;

-- ---------- Dữ liệu ----------
create table if not exists public.snapshots (
  id bigserial primary key,
  kind text not null check (kind in ('tkb','lichthi','diem')),
  term text not null default '',
  source text not null default 'paste' check (source in ('paste','userscript')),
  page_url text not null default '',
  rows jsonb not null,
  hash text not null,
  captured_at timestamptz not null default now()
);
create index if not exists snapshots_kind_term on public.snapshots(kind, term, captured_at desc);

create table if not exists public.changes (
  id bigserial primary key,
  kind text not null,
  term text not null default '',
  type text not null default '',
  title text not null,
  detail jsonb not null default '[]',
  created_at timestamptz not null default now(),
  seen boolean not null default false,
  pushed boolean not null default false
);

create table if not exists public.notices (
  id bigserial primary key,
  source text not null check (source in ('portal','truong','khoa')),
  uid text not null,
  title text not null,
  url text not null default '',
  published_at timestamptz,
  summary text not null default '',
  created_at timestamptz not null default now(),
  seen boolean not null default false,
  pushed boolean not null default false,
  unique (source, uid)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  course text not null default '',
  due_at timestamptz,
  note text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subs (
  endpoint text primary key,
  sub jsonb not null,
  device text not null default '',
  created_at timestamptz not null default now(),
  last_ok timestamptz
);

create table if not exists public.sync_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  source text not null,
  summary jsonb not null default '{}'
);

create table if not exists public.reminder_log (key text primary key, at timestamptz not null default now());

-- Cài đặt lưu trên máy chủ (để máy chạy ngầm biết giờ tiết học, cách nhắc)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'
);
insert into public.settings(id, data) values (1, jsonb_build_object(
  'current_term', '',
  'remind_class_min', 30, 'remind_exam', true, 'remind_task', true, 'push_changes', true, 'push_notices', true,
  'periods', jsonb_build_array(                                     -- giờ tiết học MẶC ĐỊNH (tham khảo) — sửa trong app cho đúng
    jsonb_build_array('07:30','08:20'), jsonb_build_array('08:20','09:10'), jsonb_build_array('09:10','10:00'),
    jsonb_build_array('10:10','11:00'), jsonb_build_array('11:00','11:50'), jsonb_build_array('12:40','13:30'),
    jsonb_build_array('13:30','14:20'), jsonb_build_array('14:20','15:10'), jsonb_build_array('15:20','16:10'),
    jsonb_build_array('16:10','17:00'), jsonb_build_array('17:10','18:00'), jsonb_build_array('18:00','18:50'))
)) on conflict (id) do nothing;

-- RLS: chỉ chủ đọc; ghi qua hàm (tasks, settings cho chủ ghi trực tiếp)
do $$
declare t text;
begin
  foreach t in array array['app_owner','app_keys','snapshots','changes','notices','tasks','push_subs','sync_log','reminder_log','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
  foreach t in array array['snapshots','changes','notices','tasks','sync_log','settings'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists "chu_doc" on public.%I', t);
    execute format('create policy "chu_doc" on public.%I for select to authenticated using (public.is_owner())', t);
  end loop;
end $$;
grant insert, update, delete on public.tasks to authenticated;
drop policy if exists "chu_ghi" on public.tasks;
create policy "chu_ghi" on public.tasks for all to authenticated using (public.is_owner()) with check (public.is_owner());
grant update (data) on public.settings to authenticated;
drop policy if exists "chu_sua" on public.settings;
create policy "chu_sua" on public.settings for update to authenticated using (public.is_owner()) with check (public.is_owner());
grant usage, select on sequence public.snapshots_id_seq, public.changes_id_seq, public.notices_id_seq, public.sync_log_id_seq to authenticated;

-- ---------- Nhận dữ liệu từ portal (tiện ích hoặc dán tay) ----------
-- p_items: [{kind, term, rows, hash, changes:[{type,title,detail}]}], p_notices: [{uid,title,url,date}]
create or replace function public.ingest(p_key text, p_items jsonb, p_notices jsonb default '[]', p_source text default 'paste', p_url text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare it jsonb; ch jsonb; v_last text; v_saved int := 0; v_changes int := 0; v_new_notices int := 0; n jsonb; v_first boolean;
begin
  perform public._check_sync(p_key);
  if p_source not in ('paste','userscript') then raise exception 'Nguồn không hợp lệ'; end if;
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]')) loop
    if it->>'kind' not in ('tkb','lichthi','diem') then continue; end if;
    select hash into v_last from public.snapshots where kind = it->>'kind' and term = coalesce(it->>'term','') order by captured_at desc limit 1;
    if v_last is not distinct from it->>'hash' then continue; end if;          -- không có gì mới
    insert into public.snapshots(kind, term, source, page_url, rows, hash)
    values (it->>'kind', coalesce(it->>'term',''), p_source, coalesce(p_url,''), coalesce(it->'rows','[]'), coalesce(it->>'hash',''));
    v_saved := v_saved + 1;
    for ch in select * from jsonb_array_elements(coalesce(it->'changes','[]')) loop
      insert into public.changes(kind, term, type, title, detail) values (it->>'kind', coalesce(it->>'term',''), coalesce(ch->>'type',''), ch->>'title', coalesce(ch->'detail','[]'));
      v_changes := v_changes + 1;
    end loop;
    if coalesce(it->>'term','') <> '' and it->>'kind' = 'tkb' then
      update public.settings set data = jsonb_set(data, '{current_term}', to_jsonb(it->>'term')) where id = 1
        and (coalesce(data->>'current_term','') = '' or it->>'term' > data->>'current_term');
    end if;
  end loop;
  v_first := not exists (select 1 from public.notices where source = 'portal');
  for n in select * from jsonb_array_elements(coalesce(p_notices,'[]')) loop
    insert into public.notices(source, uid, title, url, published_at, seen, pushed)
    values ('portal', left(n->>'uid', 400), left(n->>'title', 500), coalesce(n->>'url',''), (n->>'date')::date, v_first, v_first)
    on conflict (source, uid) do nothing;
    if found then v_new_notices := v_new_notices + 1; end if;
  end loop;
  insert into public.sync_log(source, summary) values (p_source, jsonb_build_object('saved', v_saved, 'changes', v_changes, 'notices', v_new_notices, 'url', left(coalesce(p_url,''),200)));
  return jsonb_build_object('saved', v_saved, 'changes', v_changes, 'notices', v_new_notices);
end $$;

/** Dữ liệu lần trước (để tiện ích/app so thay đổi trước khi gửi) */
create or replace function public.latest_rows(p_key text, p_kinds text[] default array['tkb','lichthi','diem'])
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._check_sync(p_key);
  return coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'term', term, 'rows', rows, 'hash', hash))
    from (select distinct on (kind, term) kind, term, rows, hash from public.snapshots where kind = any(p_kinds) order by kind, term, captured_at desc) s), '[]');
end $$;

-- ---------- Chủ: đánh dấu đã xem, thông báo đẩy ----------
create or replace function public.mark_seen(p_what text, p_ids bigint[] default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ app'; end if;
  if p_what = 'changes' then update public.changes set seen = true where (p_ids is null or id = any(p_ids)) and not seen;
  elsif p_what = 'notices' then update public.notices set seen = true where (p_ids is null or id = any(p_ids)) and not seen; end if;
end $$;
create or replace function public.save_push_sub(p_sub jsonb, p_device text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ app'; end if;
  insert into public.push_subs(endpoint, sub, device) values (p_sub->>'endpoint', p_sub, left(coalesce(p_device,''),200))
  on conflict (endpoint) do update set sub = excluded.sub, device = excluded.device;
end $$;
create or replace function public.delete_push_sub(p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ app'; end if;
  delete from public.push_subs where endpoint = p_endpoint;
end $$;
create or replace function public.push_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_owner() then jsonb_build_object('devices', (select count(*) from public.push_subs),
    'last_sync', (select max(at) from public.sync_log where source <> 'cron'), 'last_cron', (select max(at) from public.sync_log where source = 'cron'),
    'sync_key_at', (select sync_created_at from public.app_keys where id = 1), 'cron_key_at', (select cron_created_at from public.app_keys where id = 1),
    'vapid', (select vapid_public is not null from public.app_keys where id = 1)) end
$$;
/** Xóa toàn bộ dữ liệu học tập (giữ tài khoản, cài đặt). */
create or replace function public.reset_study_data(p_confirm text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ app'; end if;
  if p_confirm is distinct from 'XÓA' then raise exception 'Phải gõ XÓA để xác nhận'; end if;
  delete from public.snapshots where true; delete from public.changes where true; delete from public.notices where true;
  delete from public.sync_log where true; delete from public.reminder_log where true;
end $$;

-- ---------- Máy chạy ngầm (GitHub Actions) ----------
create or replace function public.cron_known(p_key text, p_source text) returns text[]
language plpgsql security definer set search_path = public as $$
begin
  perform public._check_cron(p_key);
  return array(select uid from public.notices where source = p_source order by created_at desc limit 500);
end $$;
/** Thêm tin trường/khoa. Lần đầu của mỗi nguồn: đánh dấu đã xem để không dội hàng loạt thông báo. */
create or replace function public.cron_add_notices(p_key text, p_source text, p_items jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n jsonb; c int := 0; v_first boolean;
begin
  perform public._check_cron(p_key);
  if p_source not in ('truong','khoa') then raise exception 'Nguồn không hợp lệ'; end if;
  v_first := not exists (select 1 from public.notices where source = p_source);
  for n in select * from jsonb_array_elements(coalesce(p_items,'[]')) loop
    insert into public.notices(source, uid, title, url, published_at, summary, seen, pushed)
    values (p_source, left(n->>'uid',400), left(n->>'title',500), coalesce(n->>'url',''), (n->>'date')::timestamptz, left(coalesce(n->>'summary',''),600), v_first, v_first)
    on conflict (source, uid) do nothing;
    if found then c := c + 1; end if;
  end loop;
  return c;
end $$;
/** Mọi thứ máy chạy ngầm cần trong 1 lần gọi */
create or replace function public.cron_pending(p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._check_cron(p_key);
  return jsonb_build_object(
    'settings', (select data from public.settings where id = 1),
    'vapid', (select jsonb_build_object('public', vapid_public, 'private', vapid_private) from public.app_keys where id = 1),
    'subs', coalesce((select jsonb_agg(sub) from public.push_subs), '[]'),
    'changes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'detail', detail, 'kind', kind)) from public.changes where not pushed), '[]'),
    'notices', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'url', url, 'source', source)) from public.notices where not pushed), '[]'),
    'tkb', (select rows from public.snapshots where kind = 'tkb' order by (term = (select data->>'current_term' from public.settings where id = 1)) desc, captured_at desc limit 1),
    'lichthi', coalesce((select jsonb_agg(r) from (select distinct on (term) rows r from public.snapshots where kind = 'lichthi' order by term, captured_at desc) x), '[]'),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'course', course, 'due_at', due_at)) from public.tasks where not done and due_at is not null and due_at > now() - interval '1 day'), '[]'),
    'sent', coalesce((select jsonb_agg(key) from public.reminder_log where at > now() - interval '3 days'), '[]'));
end $$;
create or replace function public.cron_done(p_key text, p_changes bigint[], p_notices bigint[], p_reminders text[], p_gone text[], p_ok text[], p_summary jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._check_cron(p_key);
  update public.changes set pushed = true where id = any(coalesce(p_changes,'{}'));
  update public.notices set pushed = true where id = any(coalesce(p_notices,'{}'));
  insert into public.reminder_log(key) select unnest(coalesce(p_reminders,'{}')) on conflict do nothing;
  delete from public.reminder_log where at < now() - interval '30 days';
  delete from public.push_subs where endpoint = any(coalesce(p_gone,'{}'));
  update public.push_subs set last_ok = now() where endpoint = any(coalesce(p_ok,'{}'));
  insert into public.sync_log(source, summary) values ('cron', coalesce(p_summary,'{}'));
  delete from public.sync_log where at < now() - interval '60 days';
end $$;

-- Quyền gọi hàm
revoke execute on all functions in schema public from anon, public;
grant execute on function public.ingest(text,jsonb,jsonb,text,text), public.latest_rows(text,text[]),
  public.cron_known(text,text), public.cron_add_notices(text,text,jsonb), public.cron_pending(text),
  public.cron_done(text,bigint[],bigint[],text[],text[],text[],jsonb) to anon, authenticated;
grant execute on function public.new_cron_key(), public.set_vapid(text,text,boolean), public.vapid_public(), public.new_sync_key(), public.mark_seen(text,bigint[]), public.save_push_sub(jsonb,text),
  public.delete_push_sub(text), public.push_status(), public.reset_study_data(text), public.is_owner() to authenticated;

