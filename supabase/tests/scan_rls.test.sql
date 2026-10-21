begin;
set local search_path = public, extensions;
select plan(20);

insert into auth.users(id, email) values
  ('11111111-1111-4111-8111-111111111111', 'synthetic-owner-a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'synthetic-owner-b@example.test');

select ok((select relrowsecurity from pg_class where oid = 'public.scans'::regclass), 'scans RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.findings'::regclass), 'findings RLS enabled');

set local role anon;
select throws_ok($$select * from public.scans$$, '42501', null, 'anonymous scans denied');
select throws_ok($$select * from public.findings$$, '42501', null, 'anonymous findings denied');
select throws_ok($$select public.save_scan('txt', 1, '[]')$$, '42501', null, 'anonymous RPC denied');

set local role authenticated;
select throws_ok($$select public.save_scan('txt', 1, '[]')$$, '42501', 'Authentication required', 'missing identity denied');
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $body$
begin
  perform set_config('test.scan_a', public.save_scan('txt', 32,
    '[{"type":"email","risk":"Low","count":2,"maskedExample":"a***@example.test"}]')::text, true);
end;
$body$;
select results_eq($$select total_count from public.scans$$, array[2], 'owner reads aggregate count');
select results_eq($$select masked_example from public.findings$$, array['a***@example.test'], 'owner reads masked finding');
select throws_ok($$insert into public.scans select * from public.scans$$, '42501', null, 'direct scan writes denied');
select throws_ok($$update public.scans set risk = 'Critical'$$, '42501', null, 'direct updates denied');
select throws_ok($$delete from public.findings$$, '42501', null, 'direct deletes denied');

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select is_empty($$select * from public.scans$$, 'second user cannot read first user scans');
select is_empty($$select * from public.findings$$, 'second user cannot read first user findings');
select throws_ok($$insert into public.findings(scan_id, owner_id, type, risk, count, masked_example)
  values (current_setting('test.scan_a')::uuid, '22222222-2222-4222-8222-222222222222', 'card', 'Critical', 1, '************1111')$$,
  '42501', null, 'second user cannot attach findings to first user scan');
select throws_ok($$select public.save_scan('txt', 32,
  '[{"type":"email","risk":"Low","count":1,"maskedExample":"a***@example.test","owner_id":"11111111-1111-4111-8111-111111111111"}]')$$,
  '22023', 'Invalid scan payload', 'RPC rejects owner injection');
select throws_ok($$select public.save_scan('txt', 32,
  '[{"type":"email","risk":"Low","count":1,"maskedExample":"a***@example.test"},{"type":"card","risk":"Critical","count":1,"maskedExample":"not-a-mask"}]')$$,
  '23514', null, 'later finding failure aborts atomic save');
select is_empty($$select * from public.scans$$, 'failed writes leave no partial scans');
select is_empty($$select * from public.findings$$, 'failed writes leave no partial findings');

reset role;
select throws_ok($$insert into public.findings(scan_id, owner_id, type, risk, count, masked_example)
  values (current_setting('test.scan_a')::uuid, '22222222-2222-4222-8222-222222222222', 'card', 'Critical', 1, '************1111')$$,
  '23503', null, 'composite foreign key prevents cross-owner parent linkage even with privileged insertion');
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select results_eq($$select total_count from public.scans where id = current_setting('test.scan_a')::uuid$$,
  array[2], 'first user record remains intact after denied writes');

select * from finish();
rollback;