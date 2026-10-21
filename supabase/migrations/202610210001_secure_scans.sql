begin;

create schema minidsp_private;
revoke all on schema minidsp_private from public, anon;
grant usage on schema minidsp_private to authenticated;

create table public.scans (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (display_name ~ '^scan-[0-9a-f-]{36}\.(csv|txt)$'),
  byte_size integer not null check (byte_size between 1 and 1048576),
  risk text not null check (risk in ('None', 'Low', 'Medium', 'High', 'Critical')),
  total_count integer not null check (total_count between 0 and 1048576),
  created_at timestamptz not null default pg_catalog.now(),
  unique (id, owner_id)
);

create table public.findings (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  scan_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  risk text not null,
  count integer not null check (count between 1 and 1048576),
  masked_example text not null check (pg_catalog.length(masked_example) <= 260),
  foreign key (scan_id, owner_id) references public.scans(id, owner_id) on delete cascade,
  unique (scan_id, type),
  check (
    (type = 'email' and risk = 'Low' and masked_example ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]\*{3}@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$') or
    (type = 'uk-phone' and risk = 'Medium' and masked_example ~ '^0[127]\*{6}[0-9]{3}$') or
    (type = 'uk-nino' and risk = 'High' and masked_example ~ '^[A-Z]{2}\*{6}[A-D]?$') or
    (type = 'card' and risk = 'Critical' and masked_example ~ '^\*{9,15}[0-9]{4}$')
  )
);

create index scans_owner_created_idx on public.scans(owner_id, created_at desc);
create index findings_owner_scan_idx on public.findings(owner_id, scan_id);

alter table public.scans enable row level security;
alter table public.findings enable row level security;
revoke all on table public.scans, public.findings from public, anon, authenticated;
grant select on table public.scans, public.findings to authenticated;

create policy scans_owner_read on public.scans for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy findings_owner_read on public.findings for select to authenticated
  using ((select auth.uid()) = owner_id);

create function minidsp_private.save_scan(p_extension text, p_byte_size integer, p_findings jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  new_scan_id uuid := pg_catalog.gen_random_uuid();
  item jsonb;
  finding_total integer;
  highest_risk text;
begin
  if actor is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_extension is null or p_extension not in ('csv', 'txt') or
     p_byte_size is null or p_byte_size not between 1 and 1048576 or
     p_findings is null or pg_catalog.jsonb_typeof(p_findings) <> 'array' then
    raise exception using errcode = '22023', message = 'Invalid scan payload';
  end if;
  if pg_catalog.jsonb_array_length(p_findings) > 4 then
    raise exception using errcode = '22023', message = 'Invalid scan payload';
  end if;

  insert into public.scans(id, owner_id, display_name, byte_size, risk, total_count)
  values (new_scan_id, actor, 'scan-' || new_scan_id::text || '.' || p_extension, p_byte_size, 'None', 0);

  for item in select value from pg_catalog.jsonb_array_elements(p_findings) loop
    if pg_catalog.jsonb_typeof(item) <> 'object' then
      raise exception using errcode = '22023', message = 'Invalid scan payload';
    end if;
    if not (item ?& array['type', 'risk', 'count', 'maskedExample']) or
       (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(item)) <> 4 then
      raise exception using errcode = '22023', message = 'Invalid scan payload';
    end if;
    if pg_catalog.jsonb_typeof(item -> 'type') <> 'string' or
       pg_catalog.jsonb_typeof(item -> 'risk') <> 'string' or
       pg_catalog.jsonb_typeof(item -> 'maskedExample') <> 'string' or
       pg_catalog.jsonb_typeof(item -> 'count') <> 'number' or
       (item ->> 'count') !~ '^[1-9][0-9]{0,6}$' then
      raise exception using errcode = '22023', message = 'Invalid scan payload';
    end if;
    insert into public.findings(scan_id, owner_id, type, risk, count, masked_example)
    values (new_scan_id, actor, item ->> 'type', item ->> 'risk', (item ->> 'count')::integer, item ->> 'maskedExample');
  end loop;

  select coalesce(pg_catalog.sum(count), 0)::integer,
    case pg_catalog.max(case risk when 'Critical' then 4 when 'High' then 3 when 'Medium' then 2 else 1 end)
      when 4 then 'Critical' when 3 then 'High' when 2 then 'Medium' when 1 then 'Low' else 'None' end
  into finding_total, highest_risk from public.findings where scan_id = new_scan_id;
  update public.scans set total_count = finding_total, risk = highest_risk where id = new_scan_id;
  return new_scan_id;
end;
$function$;

revoke all on function minidsp_private.save_scan(text, integer, jsonb) from public, anon, authenticated;
grant execute on function minidsp_private.save_scan(text, integer, jsonb) to authenticated;

create function public.save_scan(p_extension text, p_byte_size integer, p_findings jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select minidsp_private.save_scan(p_extension, p_byte_size, p_findings);
$function$;

revoke all on function public.save_scan(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.save_scan(text, integer, jsonb) to authenticated;

commit;