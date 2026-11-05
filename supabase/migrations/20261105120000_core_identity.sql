-- Qualty.AI core: profiles, inspection companies, team members, KYC.
-- Mirrors the types in web/src/lib/store.ts.

create type public.app_role as enum ('customer', 'company', 'inspector', 'admin');
create type public.team_role as enum ('owner', 'sales', 'ops', 'finance', 'inspector');
create type public.member_status as enum ('invited', 'active');
create type public.kyc_doc_status as enum ('submitted', 'verified', 'rejected');

-- One row per auth user. Role is the persona; company powers come from company_members.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  gstin text,
  pan text,
  address text not null default '',
  email text not null default '',
  phone text not null default '',
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

-- Invited members have no user_id until they sign up with the invited email.
create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  email text,
  phone text,
  role public.team_role not null,
  status public.member_status not null default 'invited',
  invited_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create unique index company_members_email_uq on public.company_members (company_id, lower(email)) where email is not null;
create index company_members_user_idx on public.company_members (user_id);

create table public.kyc_docs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  type text not null check (type in (
    'Certificate of incorporation', 'GST certificate', 'PAN card', 'IEC certificate',
    'Accreditation certificate', 'Cancelled cheque / bank letter')),
  file_path text not null,
  file_name text not null,
  sha256 text not null,
  uploaded_at timestamptz not null default now(),
  status public.kyc_doc_status not null default 'submitted',
  note text
);
create index kyc_docs_company_idx on public.kyc_docs (company_id);

-- ---------- helpers (security definer so policies don't recurse) ----------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- True when the current user is an active member of the company with one of the roles (any role if null).
create function public.has_company_role(cid uuid, roles public.team_role[] default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = (select auth.uid()) and m.status = 'active'
      and (roles is null or m.role = any (roles)));
$$;

create function public.is_company_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.company_members
                 where user_id = (select auth.uid()) and status = 'active');
$$;

-- ---------- triggers ----------

-- New auth user: create the profile and claim any pending team invites for that email.
-- Only 'customer' or 'company' can be self-chosen; inspector/admin are set by an admin.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  wanted text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          new.email,
          case when wanted = 'company' then 'company'::public.app_role else 'customer'::public.app_role end);

  update public.company_members
     set user_id = new.id, status = 'active'
   where user_id is null and email is not null and lower(email) = lower(new.email);
  if found then
    update public.profiles set role = 'inspector'
     where id = new.id and exists (
       select 1 from public.company_members where user_id = new.id and role = 'inspector');
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Whoever creates a company becomes its active owner.
create function public.handle_new_company() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.company_members (company_id, user_id, name, email, role, status)
  select new.id, p.id, coalesce(nullif(p.full_name, ''), p.email, 'Owner'), p.email, 'owner', 'active'
    from public.profiles p where p.id = new.created_by;
  update public.profiles set role = 'company' where id = new.created_by and role = 'customer';
  return new;
end $$;

create trigger on_company_created after insert on public.companies
  for each row execute function public.handle_new_company();

-- ---------- RLS ----------

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.kyc_docs enable row level security;

-- profiles: see yourself (admins see all); you can only change your name.
-- Role changes go through public.set_user_role (admin only).
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- companies: names are public to signed-in users (bids, store); owner edits.
create policy companies_select on public.companies for select to authenticated using (true);
create policy companies_insert on public.companies for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy companies_update on public.companies for update to authenticated
  using (public.has_company_role(id, '{owner}') or (select public.is_admin()))
  with check (public.has_company_role(id, '{owner}') or (select public.is_admin()));

-- company_members: members see their team; owner manages it.
create policy members_select on public.company_members for select to authenticated
  using (user_id = (select auth.uid()) or public.has_company_role(company_id) or (select public.is_admin()));
create policy members_insert on public.company_members for insert to authenticated
  with check (public.has_company_role(company_id, '{owner}') and user_id is null and status = 'invited');
create policy members_update on public.company_members for update to authenticated
  using (public.has_company_role(company_id, '{owner}') or (select public.is_admin()))
  with check (public.has_company_role(company_id, '{owner}') or (select public.is_admin()));
create policy members_delete on public.company_members for delete to authenticated
  using ((public.has_company_role(company_id, '{owner}') and user_id is distinct from (select auth.uid()))
         or (select public.is_admin()));
revoke update on public.company_members from authenticated;
grant update (name, email, phone, role) on public.company_members to authenticated;

-- kyc_docs: owner/finance upload and view; only admins verify or reject.
create policy kyc_select on public.kyc_docs for select to authenticated
  using (public.has_company_role(company_id, '{owner,finance}') or (select public.is_admin()));
create policy kyc_insert on public.kyc_docs for insert to authenticated
  with check (public.has_company_role(company_id, '{owner,finance}') and status = 'submitted');
create policy kyc_admin_update on public.kyc_docs for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke update on public.kyc_docs from authenticated;
grant update (status, note) on public.kyc_docs to authenticated;

-- Admin-only role change (e.g. promote a Qualty staff member to admin).
create function public.set_user_role(target uuid, new_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'only admins can change roles' using errcode = '42501'; end if;
  update public.profiles set role = new_role where id = target;
end $$;

-- Claim team invites sent to my email after I had already signed up.
create function public.claim_invites() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.company_members m
     set user_id = (select auth.uid()), status = 'active'
    from auth.users u
   where u.id = (select auth.uid()) and m.user_id is null and m.email is not null
     and lower(m.email) = lower(u.email);
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.set_user_role(uuid, public.app_role) from public, anon;
revoke execute on function public.claim_invites() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_company() from public, anon, authenticated;
