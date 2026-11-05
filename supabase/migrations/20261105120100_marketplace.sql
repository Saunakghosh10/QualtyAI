-- Qualty.AI marketplace: saved specs, service store, orders, bids, invoices, payments.

create type public.order_mode as enum ('quick', 'inquiry');
create type public.order_status as enum ('enquiry', 'booked', 'in-progress', 'completed');
create type public.party_verification as enum ('unverified', 'format-checked', 'verified');
create type public.bid_status as enum ('open', 'accepted', 'declined', 'withdrawn');
create type public.payment_method as enum ('Bank transfer', 'UPI', 'Card', 'Letter of credit', 'Other');

create table public.saved_specs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  buyer_name text not null,
  reference text not null default '',
  params jsonb not null,
  created_at timestamptz not null default now()
);
create index saved_specs_owner_idx on public.saved_specs (owner_id);

create table public.service_listings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service text not null,
  commodities text[] not null default '{}',   -- empty = any commodity
  location text not null,
  price_usd numeric(12, 2) not null check (price_usd > 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  turnaround_days integer not null check (turnaround_days > 0),
  surveyors integer not null default 1 check (surveyors > 0),
  available_from date not null,
  available_to date not null check (available_to >= available_from),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index service_listings_company_idx on public.service_listings (company_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references auth.users (id),
  mode public.order_mode not null,
  service text not null,
  commodity text not null,
  spec jsonb,
  spec_label text,
  buyer_name text not null,
  buyer_gstin text,
  buyer_iec text,
  buyer_verification public.party_verification not null default 'unverified',
  seller_name text not null,
  seller_gstin text,
  seller_iec text,
  seller_verification public.party_verification not null default 'unverified',
  location text not null,
  inspection_date date not null,
  volume_tons numeric(12, 2) not null check (volume_tons > 0),
  status public.order_status not null default 'enquiry',
  inspection_company_id uuid references public.companies (id),
  price_usd numeric(12, 2),            -- agreed price after discount
  listing_id uuid references public.service_listings (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_company_idx on public.orders (inspection_company_id);
create index orders_open_enquiries_idx on public.orders (created_at) where status = 'enquiry';
create index orders_listing_idx on public.orders (listing_id);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  company_id uuid not null references public.companies (id),
  price_usd numeric(12, 2) not null check (price_usd > 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  days integer not null check (days > 0),
  scope text not null default '',
  status public.bid_status not null default 'open',
  follow_up_on date,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create unique index bids_one_open_per_company on public.bids (order_id, company_id) where status = 'open';
create index bids_company_idx on public.bids (company_id);

-- Negotiation history: every counter-offer from either side.
create table public.bid_rounds (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null references public.bids (id) on delete cascade,
  side text not null check (side in ('customer', 'company')),
  price_usd numeric(12, 2) not null check (price_usd > 0),
  note text not null default '',
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index bid_rounds_bid_idx on public.bid_rounds (bid_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  number text not null unique,
  amount_usd numeric(12, 2) not null check (amount_usd > 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  issued_on date not null default current_date,
  due_on date not null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount_usd numeric(12, 2) not null check (amount_usd > 0),
  method public.payment_method not null,
  reference text not null default '',
  received_on date not null,
  created_at timestamptz not null default now()
);
create index payments_invoice_idx on public.payments (invoice_id);

-- ---------- access helpers ----------

-- Order participants: customer, assigned company's active members, admins. These share the chat room.
create function public.is_order_member(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.orders o
    where o.id = oid and (o.customer_id = (select auth.uid())
       or (o.inspection_company_id is not null and public.has_company_role(o.inspection_company_id))));
$$;

create function public.is_order_customer(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders where id = oid and customer_id = (select auth.uid()));
$$;

-- Owner/sales of any company can browse open enquiries to bid on them.
create function public.can_bid() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.company_members
                 where user_id = (select auth.uid()) and status = 'active' and role in ('owner', 'sales'));
$$;

create function public.net_price(price numeric, discount numeric) returns numeric
language sql immutable set search_path = '' as $$ select round(price * (1 - coalesce(discount, 0) / 100)); $$;

-- ---------- order guard: clients can't pick the company, price or status ----------

create function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare l public.service_listings;
begin
  new.customer_id := auth.uid();
  new.buyer_verification := 'unverified';
  new.seller_verification := 'unverified';
  new.completed_at := null;
  if new.mode = 'quick' then
    select * into l from public.service_listings where id = new.listing_id and active;
    if not found then raise exception 'quick booking needs an active listing' using errcode = '23514'; end if;
    new.inspection_company_id := l.company_id;
    new.price_usd := public.net_price(l.price_usd, l.discount_pct);
    new.status := 'booked';
  else
    new.listing_id := null;
    new.inspection_company_id := null;
    new.price_usd := null;
    new.status := 'enquiry';
  end if;
  return new;
end $$;
create trigger orders_guard before insert on public.orders
  for each row execute function public.orders_before_insert();

-- ---------- RPCs for state changes ----------

create function public.accept_bid(bid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.bids;
begin
  select * into b from public.bids where id = bid for update;
  if not found or not public.is_order_customer(b.order_id) then
    raise exception 'bid not found' using errcode = '42501'; end if;
  if b.status <> 'open' then raise exception 'bid is not open'; end if;
  update public.orders
     set status = 'booked', inspection_company_id = b.company_id,
         price_usd = public.net_price(b.price_usd, b.discount_pct)
   where id = b.order_id and status = 'enquiry';
  if not found then raise exception 'order is no longer taking bids'; end if;
  update public.bids set status = 'accepted' where id = bid;
  update public.bids set status = 'declined' where order_id = b.order_id and id <> bid and status = 'open';
end $$;

create function public.decline_bid(bid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.bids set status = 'declined'
   where id = bid and status = 'open' and public.is_order_customer(order_id);
  if not found then raise exception 'bid not found or not open'; end if;
end $$;

create function public.withdraw_bid(bid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.bids set status = 'withdrawn'
   where id = bid and status = 'open' and public.has_company_role(company_id, '{owner,sales}');
  if not found then raise exception 'bid not found or not open'; end if;
end $$;

-- Assigned company moves booked -> in-progress -> completed (admins can set any status).
create function public.set_order_status(oid uuid, next public.order_status) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where id = oid for update;
  if not found then raise exception 'order not found' using errcode = '42501'; end if;
  if not public.is_admin() then
    if not public.has_company_role(o.inspection_company_id, '{owner,ops,inspector}') then
      raise exception 'not allowed' using errcode = '42501'; end if;
    if not ((o.status = 'booked' and next = 'in-progress') or (o.status = 'in-progress' and next = 'completed')) then
      raise exception 'cannot go from % to %', o.status, next; end if;
  end if;
  update public.orders
     set status = next, completed_at = case when next = 'completed' then now() else null end
   where id = oid;
end $$;

create function public.set_party_verification(oid uuid, side text, state public.party_verification) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if state = 'verified' and not public.is_admin() then
    raise exception 'only admins can mark a party verified' using errcode = '42501'; end if;
  if not (public.is_admin() or public.is_order_customer(oid)) then
    raise exception 'not allowed' using errcode = '42501'; end if;
  if side = 'buyer' then update public.orders set buyer_verification = state where id = oid;
  elsif side = 'seller' then update public.orders set seller_verification = state where id = oid;
  else raise exception 'side must be buyer or seller'; end if;
end $$;

revoke execute on function public.accept_bid(uuid), public.decline_bid(uuid), public.withdraw_bid(uuid),
  public.set_order_status(uuid, public.order_status),
  public.set_party_verification(uuid, text, public.party_verification) from public, anon;
revoke execute on function public.orders_before_insert() from public, anon, authenticated;

-- ---------- RLS ----------

alter table public.saved_specs enable row level security;
alter table public.service_listings enable row level security;
alter table public.orders enable row level security;
alter table public.bids enable row level security;
alter table public.bid_rounds enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

create policy specs_owner on public.saved_specs for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy listings_select on public.service_listings for select to authenticated
  using (active or public.has_company_role(company_id) or (select public.is_admin()));
create policy listings_write on public.service_listings for all to authenticated
  using (public.has_company_role(company_id, '{owner,sales}'))
  with check (public.has_company_role(company_id, '{owner,sales}'));

create policy orders_select on public.orders for select to authenticated
  using (public.is_order_member(id) or (status = 'enquiry' and (select public.can_bid())));
create policy orders_insert on public.orders for insert to authenticated
  with check (customer_id = (select auth.uid()));
-- Customer edits details only while the order is still an enquiry.
create policy orders_update on public.orders for update to authenticated
  using (customer_id = (select auth.uid()) and status = 'enquiry')
  with check (customer_id = (select auth.uid()) and status = 'enquiry');
revoke update on public.orders from authenticated;
grant update (service, commodity, spec, spec_label, buyer_name, buyer_gstin, buyer_iec,
  seller_name, seller_gstin, seller_iec, location, inspection_date, volume_tons) on public.orders to authenticated;

create policy bids_select on public.bids for select to authenticated
  using (public.is_order_customer(order_id) or public.has_company_role(company_id) or (select public.is_admin()));
create policy bids_insert on public.bids for insert to authenticated
  with check (public.has_company_role(company_id, '{owner,sales}') and status = 'open'
    and created_by = (select auth.uid())
    and exists (select 1 from public.orders o where o.id = order_id and o.status = 'enquiry'));
create policy bids_update on public.bids for update to authenticated
  using (public.has_company_role(company_id, '{owner,sales}') and status = 'open')
  with check (public.has_company_role(company_id, '{owner,sales}') and status = 'open');
revoke update on public.bids from authenticated;
grant update (price_usd, discount_pct, days, scope, follow_up_on) on public.bids to authenticated;

create policy rounds_select on public.bid_rounds for select to authenticated
  using (exists (select 1 from public.bids b where b.id = bid_id));  -- inherits bids_select
create policy rounds_insert on public.bid_rounds for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.bids b where b.id = bid_id and b.status = 'open' and (
      (side = 'customer' and public.is_order_customer(b.order_id)) or
      (side = 'company' and public.has_company_role(b.company_id, '{owner,sales}')))));

create policy invoices_select on public.invoices for select to authenticated
  using (public.is_order_customer(order_id) or (select public.is_admin()) or exists (
    select 1 from public.orders o where o.id = order_id
      and public.has_company_role(o.inspection_company_id, '{owner,finance}')));
create policy invoices_write on public.invoices for all to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
      and public.has_company_role(o.inspection_company_id, '{owner,finance}')))
  with check (exists (select 1 from public.orders o where o.id = order_id
      and public.has_company_role(o.inspection_company_id, '{owner,finance}')));

create policy payments_select on public.payments for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id));  -- inherits invoices_select
create policy payments_write on public.payments for all to authenticated
  using (exists (select 1 from public.invoices i join public.orders o on o.id = i.order_id
      where i.id = invoice_id and public.has_company_role(o.inspection_company_id, '{owner,finance}')))
  with check (exists (select 1 from public.invoices i join public.orders o on o.id = i.order_id
      where i.id = invoice_id and public.has_company_role(o.inspection_company_id, '{owner,finance}')));
