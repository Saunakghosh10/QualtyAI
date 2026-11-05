-- Qualty.AI order chatroom, evidence vault, certificates, compliance, storage.

create type public.message_kind as enum ('text', 'system', 'observation', 'dispatch', 'flag', 'media', 'summary');
create type public.chat_role as enum ('customer', 'company', 'inspector', 'admin', 'system');
create type public.evidence_kind as enum ('photo', 'video', 'report');
create type public.cert_status as enum ('issued', 'revoked');

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind public.evidence_kind not null,
  file_path text not null unique,          -- storage path in the 'evidence' bucket: <order_id>/<file>
  file_name text not null,
  mime text not null,
  captured_at timestamptz not null,        -- device time at capture
  uploaded_at timestamptz not null default now(),  -- server time, can't be faked
  gps_lat double precision,
  gps_lng double precision,
  gps_accuracy double precision,
  sha256 text not null,
  author_id uuid references auth.users (id),
  author_name text not null default '',
  author_role public.chat_role not null default 'customer',
  caption text not null default '',
  check (file_path like order_id::text || '/%')
);
create index evidence_order_idx on public.evidence (order_id, uploaded_at);

-- The order chatroom: one stream of messages per order.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind public.message_kind not null default 'text',
  author_id uuid references auth.users (id),
  author_name text not null default '',
  author_role public.chat_role not null default 'customer',
  text text not null default '',
  dispatch jsonb,       -- { vehicleNo, sealNo, bags, weightTons }
  readings jsonb,       -- subset of CommodityParams
  evidence_id uuid references public.evidence (id),
  severity text check (severity in ('warning', 'critical')),
  created_at timestamptz not null default now()
);
create index messages_order_idx on public.messages (order_id, created_at);
create index messages_evidence_idx on public.messages (evidence_id);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  type text not null,
  number text not null unique,
  issued_to text not null,
  issued_on date not null default current_date,
  valid_until date,
  verify_code text not null unique default upper(encode(extensions.gen_random_bytes(10), 'hex')),
  status public.cert_status not null default 'issued',
  revoked_reason text,
  file_path text,       -- 'company-docs' bucket: <company_id>/certificates/<file>
  file_name text,
  sha256 text,
  created_at timestamptz not null default now()
);
create index certificates_company_idx on public.certificates (company_id);
create index certificates_order_idx on public.certificates (order_id);

create table public.compliance_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  issued_by text not null,
  reference text not null default '',
  valid_until date not null,
  covers text[] not null default '{}',   -- certificate types this approval allows
  file_path text,       -- 'company-docs' bucket: <company_id>/compliance/<file>
  file_name text,
  created_at timestamptz not null default now()
);
create index compliance_company_idx on public.compliance_items (company_id);

-- ---------- author stamping: clients can't spoof who posted ----------

create function public.chat_role_for(oid uuid) returns public.chat_role
language sql stable security definer set search_path = '' as $$
  select case
    when public.is_admin() then 'admin'::public.chat_role
    when exists (select 1 from public.orders where id = oid and customer_id = (select auth.uid())) then 'customer'
    when exists (select 1 from public.orders o join public.company_members m on m.company_id = o.inspection_company_id
                 where o.id = oid and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = 'inspector')
      then 'inspector'
    else 'company' end;
$$;

create function public.stamp_author() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Server jobs (service role) and system messages posted by other triggers keep their own author.
  if auth.uid() is null or pg_trigger_depth() > 1 then return new; end if;
  new.author_id := auth.uid();
  new.author_role := public.chat_role_for(new.order_id);
  select coalesce(nullif(full_name, ''), email, '') into new.author_name from public.profiles where id = auth.uid();
  if tg_table_name = 'evidence' then new.uploaded_at := now();
  else new.created_at := now(); end if;
  return new;
end $$;

create trigger messages_stamp before insert on public.messages for each row execute function public.stamp_author();
create trigger evidence_stamp before insert on public.evidence for each row execute function public.stamp_author();

-- ---------- system messages on order events ----------

create function public.post_order_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare msg text;
begin
  if tg_op = 'INSERT' then
    msg := case when new.status = 'booked' then 'Order booked. Chatroom opened.' else 'Enquiry created. Waiting for bids.' end;
  elsif new.status is distinct from old.status then
    msg := case new.status
      when 'booked' then 'Bid accepted. Order booked and chatroom opened.'
      when 'in-progress' then 'Inspection started.'
      when 'completed' then 'Inspection marked complete.'
      else 'Status changed to ' || new.status end;
  else return new; end if;
  insert into public.messages (order_id, kind, author_role, author_name, text)
  values (new.id, 'system', 'system', 'Qualty', msg);
  return new;
end $$;

create trigger orders_events after insert or update of status on public.orders
  for each row execute function public.post_order_event();

-- Public certificate check by code: returns only what a verifier needs.
create function public.verify_certificate(code text)
returns table (number text, type text, issued_to text, issued_on date, valid_until date,
               status public.cert_status, revoked_reason text, company_name text)
language sql stable security definer set search_path = '' as $$
  select c.number, c.type, c.issued_to, c.issued_on, c.valid_until, c.status, c.revoked_reason, co.name
    from public.certificates c join public.companies co on co.id = c.company_id
   where c.verify_code = upper(trim(code));
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

revoke execute on function public.stamp_author(), public.post_order_event() from public, anon, authenticated;

-- ---------- RLS ----------

alter table public.evidence enable row level security;
alter table public.messages enable row level security;
alter table public.certificates enable row level security;
alter table public.compliance_items enable row level security;

-- Evidence and messages are append-only for clients (no update/delete policies).
create policy evidence_select on public.evidence for select to authenticated
  using (public.is_order_member(order_id));
create policy evidence_insert on public.evidence for insert to authenticated
  with check (public.is_order_member(order_id));

create policy messages_select on public.messages for select to authenticated
  using (public.is_order_member(order_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (public.is_order_member(order_id)
    and kind in ('text', 'observation', 'dispatch', 'flag', 'media')
    and (kind not in ('observation', 'dispatch', 'flag') or public.chat_role_for(order_id) <> 'customer')
    and (evidence_id is null or exists (select 1 from public.evidence e where e.id = evidence_id and e.order_id = messages.order_id)));

create policy certs_select on public.certificates for select to authenticated
  using (public.has_company_role(company_id) or (select public.is_admin())
    or (order_id is not null and public.is_order_customer(order_id)));
create policy certs_insert on public.certificates for insert to authenticated
  with check (public.has_company_role(company_id, '{owner,ops,inspector}') and status = 'issued');
create policy certs_update on public.certificates for update to authenticated
  using (public.has_company_role(company_id, '{owner,ops}') or (select public.is_admin()))
  with check (public.has_company_role(company_id, '{owner,ops}') or (select public.is_admin()));
revoke update on public.certificates from authenticated;
grant update (status, revoked_reason, file_path, file_name, sha256) on public.certificates to authenticated;

create policy compliance_select on public.compliance_items for select to authenticated
  using (public.has_company_role(company_id) or (select public.is_admin()));
create policy compliance_write on public.compliance_items for all to authenticated
  using (public.has_company_role(company_id, '{owner,ops}'))
  with check (public.has_company_role(company_id, '{owner,ops}'));

-- ---------- Realtime for the chatroom ----------
alter publication supabase_realtime add table public.messages;

-- ---------- Storage ----------
-- Folder names come from the client, so cast them without throwing.
create function public.try_uuid(t text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin return t::uuid; exception when others then return null; end $$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 104857600),          -- 100 MB (video)
       ('company-docs', 'company-docs', false, 20971520)     -- 20 MB
on conflict (id) do nothing;

-- evidence/<order_id>/...: order members read and add; nobody overwrites or deletes.
create policy evidence_files_read on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.is_order_member(public.try_uuid((storage.foldername(name))[1])));
create policy evidence_files_add on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.is_order_member(public.try_uuid((storage.foldername(name))[1])));

-- company-docs/<company_id>/<kyc|certificates|compliance>/...
create policy company_docs_read on storage.objects for select to authenticated
  using (bucket_id = 'company-docs' and (
    (select public.is_admin())
    or ((storage.foldername(name))[2] = 'kyc' and public.has_company_role(public.try_uuid((storage.foldername(name))[1]), '{owner,finance}'))
    or ((storage.foldername(name))[2] = 'certificates' and public.has_company_role(public.try_uuid((storage.foldername(name))[1])))
    or ((storage.foldername(name))[2] = 'compliance' and public.has_company_role(public.try_uuid((storage.foldername(name))[1])))
    or ((storage.foldername(name))[2] = 'certificates' and exists (
          select 1 from public.certificates c where c.file_path = name and c.order_id is not null
            and public.is_order_customer(c.order_id)))));
create policy company_docs_add on storage.objects for insert to authenticated
  with check (bucket_id = 'company-docs' and (
    ((storage.foldername(name))[2] = 'kyc' and public.has_company_role(public.try_uuid((storage.foldername(name))[1]), '{owner,finance}'))
    or ((storage.foldername(name))[2] = 'certificates' and public.has_company_role(public.try_uuid((storage.foldername(name))[1]), '{owner,ops,inspector}'))
    or ((storage.foldername(name))[2] = 'compliance' and public.has_company_role(public.try_uuid((storage.foldername(name))[1]), '{owner,ops}'))));
