-- Qualty platform margin, room names and standard certificate rates.
-- Decisions from the 2026-11-14 call with Vinay, and Saunak's follow-up:
--   * Customers pay the company's price plus 30%. Companies see a customer's
--     enquiry budget 30% lower. Neither side can read the other's figure,
--     not even through the API.
--   * Qualty collects the customer's payment. Only Qualty admins raise
--     invoices and record payments; companies see whether an order is paid,
--     never the invoice amount.
--   * The Qualty team can set a customer's price by hand, never below the
--     company's price, and only before any payment.
--   * Chatrooms can be given a group name. The order number stays next to it.
--   * ECTN, CoC and Customs Import Control are sold at one fixed rate across
--     India.

-- ---------- margin ----------
create function public.margin_pct() returns numeric
language sql immutable set search_path = '' as $$ select 30::numeric $$;

/** What the customer pays for a company price. */
create function public.customer_price(company_usd numeric) returns numeric
language sql immutable set search_path = '' as $$
  select round(company_usd * (1 + public.margin_pct() / 100)) $$;

/** The company price behind a customer figure (customer counter-offers). */
create function public.company_price(customer_usd numeric) returns numeric
language sql immutable set search_path = '' as $$
  select round(customer_usd / (1 + public.margin_pct() / 100)) $$;

/** The enquiry budget companies see. */
create function public.budget_for_companies(customer_usd numeric) returns numeric
language sql immutable set search_path = '' as $$
  select round(customer_usd * (1 - public.margin_pct() / 100)) $$;

alter table public.orders
  add column customer_price_usd numeric(12, 2) check (customer_price_usd is null or customer_price_usd > 0),
  add column room_name text check (room_name is null or length(room_name) between 1 and 60);

-- Existing booked orders: invoices already carry what the customer owes.
update public.orders o
   set customer_price_usd = coalesce(
         (select public.net_price(i.amount_usd, i.discount_pct) from public.invoices i where i.order_id = o.id),
         public.customer_price(o.price_usd))
 where o.price_usd is not null;

-- ---------- hide the money columns ----------
-- price_usd is the company's figure, customer_price_usd the customer's,
-- budget_usd the customer's budget. Everyone reads them through order_figures().
revoke select on public.orders from anon, authenticated;
grant select (id, customer_id, mode, service, commodity, spec, spec_label,
              buyer_name, buyer_gstin, buyer_iec, buyer_verification,
              seller_name, seller_gstin, seller_iec, seller_verification,
              location, inspection_date, volume_tons, status, inspection_company_id,
              listing_id, created_at, completed_at, paid_at, payment_ref,
              payment_sent_on, room_name)
  on public.orders to authenticated;

revoke select on public.bids from anon, authenticated;
grant select (id, order_id, company_id, discount_pct, days, scope, status,
              follow_up_on, created_by, created_at, proposed_date)
  on public.bids to authenticated;

revoke select on public.bid_rounds from anon, authenticated;
grant select (id, bid_id, side, note, created_by, created_at) on public.bid_rounds to authenticated;

/** Is the signed-in user the customer of this order? Admins are not. */
create function public.sees_customer_side(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders where id = oid and customer_id = (select auth.uid())) $$;

/** Money on the orders this user can read, each side in its own terms. */
create function public.order_figures()
returns table (order_id uuid, price_usd numeric, customer_price_usd numeric, budget_usd numeric)
language sql stable security definer set search_path = '' as $$
  select o.id,
         case when public.is_admin() or not public.sees_customer_side(o.id) then o.price_usd end,
         case when public.is_admin() or public.sees_customer_side(o.id) then o.customer_price_usd end,
         case when public.is_admin() or public.sees_customer_side(o.id) then o.budget_usd
              else public.budget_for_companies(o.budget_usd) end
    from public.orders o
   where o.customer_id = (select auth.uid()) or public.is_order_member(o.id) or public.is_admin()
$$;

/** Bid prices. Customers see the price with the margin and the discount already in it. */
create function public.bid_figures()
returns table (bid_id uuid, price_usd numeric, discount_pct numeric)
language sql stable security definer set search_path = '' as $$
  select b.id,
         case when public.sees_customer_side(b.order_id) and not public.is_admin()
              then public.customer_price(public.net_price(b.price_usd, b.discount_pct))
              else b.price_usd end,
         case when public.sees_customer_side(b.order_id) and not public.is_admin()
              then 0 else b.discount_pct end
    from public.bids b
   where public.is_order_customer(b.order_id) or public.has_company_role(b.company_id) or public.is_admin()
$$;

/** Counter-offer prices, in the reader's terms. */
create function public.round_figures()
returns table (round_id uuid, price_usd numeric)
language sql stable security definer set search_path = '' as $$
  select r.id,
         case when public.sees_customer_side(b.order_id) and not public.is_admin()
              then public.customer_price(r.price_usd) else r.price_usd end
    from public.bid_rounds r join public.bids b on b.id = r.bid_id
   where public.is_order_customer(b.order_id) or public.has_company_role(b.company_id) or public.is_admin()
$$;

revoke execute on function public.order_figures(), public.bid_figures(), public.round_figures(),
  public.sees_customer_side(uuid) from public, anon;
grant execute on function public.order_figures(), public.bid_figures(), public.round_figures()
  to authenticated;

-- Companies see the budget less the margin.
drop function public.open_enquiries();
create function public.open_enquiries()
returns table (id uuid, service text, commodity text, spec jsonb, spec_label text, location text,
               inspection_date date, volume_tons numeric, budget_usd numeric, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.id, o.service, o.commodity, o.spec, o.spec_label, o.location,
         o.inspection_date, o.volume_tons, public.budget_for_companies(o.budget_usd), o.created_at
    from public.orders o
   where o.status = 'enquiry' and public.can_bid()
     and o.customer_id <> (select auth.uid())
   order by o.created_at desc
$$;
revoke execute on function public.open_enquiries() from public, anon;
grant execute on function public.open_enquiries() to authenticated;

-- The public store shows what customers pay.
drop function public.browse_listings();
create function public.browse_listings()
returns table (id uuid, company_id uuid, company_name text, company_verified boolean, service text,
               commodities text[], location text, price_usd numeric, discount_pct numeric,
               turnaround_days integer, surveyors integer, available_from date, available_to date,
               created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.id, l.company_id, c.name,
         exists (select 1 from public.kyc_docs k where k.company_id = c.id and k.status = 'verified'),
         l.service, l.commodities, l.location,
         public.customer_price(public.net_price(l.price_usd, l.discount_pct)), 0::numeric,
         l.turnaround_days, l.surveyors, l.available_from, l.available_to, l.created_at
    from public.service_listings l join public.companies c on c.id = l.company_id
   where l.active and l.available_to >= current_date
   order by public.net_price(l.price_usd, l.discount_pct)
$$;
revoke execute on function public.browse_listings() from public;
grant execute on function public.browse_listings() to anon, authenticated;

-- ---------- prices at booking ----------
create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare l public.service_listings;
begin
  new.customer_id := auth.uid();
  new.buyer_verification := 'unverified';
  new.seller_verification := 'unverified';
  new.completed_at := null;
  new.paid_at := null;
  new.payment_ref := null;
  new.payment_sent_on := null;
  new.room_name := null;
  if new.mode = 'quick' then
    select * into l from public.service_listings where id = new.listing_id and active;
    if not found then raise exception 'quick booking needs an active listing' using errcode = '23514'; end if;
    new.inspection_company_id := l.company_id;
    new.price_usd := public.net_price(l.price_usd, l.discount_pct);
    new.customer_price_usd := public.customer_price(new.price_usd);
    new.status := 'booked';
  else
    new.listing_id := null;
    new.inspection_company_id := null;
    new.price_usd := null;
    new.customer_price_usd := null;
    new.status := 'enquiry';
  end if;
  return new;
end $$;

create or replace function public.accept_bid(bid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.bids; net numeric;
begin
  select * into b from public.bids where id = bid for update;
  if not found or not public.is_order_customer(b.order_id) then
    raise exception 'bid not found' using errcode = '42501'; end if;
  if b.status <> 'open' then raise exception 'bid is not open' using errcode = '23514'; end if;
  net := public.net_price(b.price_usd, b.discount_pct);
  update public.orders
     set status = 'booked', inspection_company_id = b.company_id,
         price_usd = net, customer_price_usd = public.customer_price(net)
   where id = b.order_id and status = 'enquiry';
  if not found then raise exception 'order is no longer taking bids' using errcode = '23514'; end if;
  update public.bids set status = 'accepted' where id = bid;
  update public.bids set status = 'declined' where order_id = b.order_id and id <> bid and status = 'open';
end $$;

-- The customer is invoiced at the customer price.
create or replace function public.invoice_on_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'booked' and new.customer_price_usd is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'booked')
     and not exists (select 1 from public.invoices where order_id = new.id) then
    insert into public.invoices (order_id, number, amount_usd, discount_pct, due_on)
    values (new.id,
            'INV-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 6)),
            new.customer_price_usd, 0, current_date + 7);
  end if;
  return new;
end $$;

-- ---------- negotiation ----------
-- Counters go through counter_bid so a customer's figure is turned into the
-- company's terms before it is stored.
drop policy rounds_insert on public.bid_rounds;

create function public.counter_bid(bid uuid, price numeric, note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare b public.bids; side text; stored numeric;
begin
  select * into b from public.bids where id = bid for update;
  if not found or b.status <> 'open' or not public.is_open_enquiry(b.order_id) then
    raise exception 'bid not found or not open' using errcode = '42501'; end if;
  if not (price > 0) then raise exception 'price must be more than 0' using errcode = '23514'; end if;
  if public.is_order_customer(b.order_id) then
    side := 'customer'; stored := public.company_price(price);
  elsif public.has_company_role(b.company_id, '{owner,sales}') then
    side := 'company'; stored := price;
  else
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.bid_rounds (bid_id, side, price_usd, note, created_by)
  values (bid, side, stored, coalesce(trim(note), ''), auth.uid());
  if side = 'company' then
    update public.bids set price_usd = stored, discount_pct = 0 where id = bid;
  end if;
end $$;
revoke execute on function public.counter_bid(uuid, numeric, text) from public, anon;
grant execute on function public.counter_bid(uuid, numeric, text) to authenticated;

-- ---------- Qualty collects ----------
drop policy invoices_select on public.invoices;
drop policy invoices_insert on public.invoices;
drop policy invoices_update on public.invoices;
create policy invoices_select on public.invoices for select to authenticated
  using (public.is_order_customer(order_id) or (select public.is_admin()));
create policy invoices_insert on public.invoices for insert to authenticated
  with check ((select public.is_admin()));
create policy invoices_update on public.invoices for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy payments_insert on public.payments;
drop policy payments_delete on public.payments;
create policy payments_insert on public.payments for insert to authenticated
  with check ((select public.is_admin()));
create policy payments_delete on public.payments for delete to authenticated
  using ((select public.is_admin()));
-- payments_select already goes through invoices, so companies lose it too.

/** The Qualty team sets the customer's price by hand: never below the company's, never after payment starts. */
create function public.set_customer_price(oid uuid, price numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into o from public.orders where id = oid for update;
  if not found or o.price_usd is null then raise exception 'order has no agreed price yet' using errcode = '23514'; end if;
  if not (price >= o.price_usd) then
    raise exception 'customer price can''t be below the company''s' using errcode = '23514'; end if;
  if exists (select 1 from public.payments p join public.invoices i on i.id = p.invoice_id where i.order_id = oid) then
    raise exception 'payment has started on this invoice' using errcode = '23514'; end if;
  update public.orders set customer_price_usd = price where id = oid;
  update public.invoices set amount_usd = price, discount_pct = 0 where order_id = oid;
end $$;
revoke execute on function public.set_customer_price(uuid, numeric) from public, anon;
grant execute on function public.set_customer_price(uuid, numeric) to authenticated;

-- ---------- room names ----------
create function public.rename_room(oid uuid, name text) returns void
language plpgsql security definer set search_path = '' as $$
declare clean text := nullif(regexp_replace(trim(coalesce(name, '')), '\s+', ' ', 'g'), '');
begin
  if not public.can_use_room(oid) then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(clean) > 60 then raise exception 'keep the group name under 60 characters' using errcode = '23514'; end if;
  update public.orders set room_name = clean where id = oid;
  insert into public.messages (order_id, kind, author_role, author_name, text)
  values (oid, 'system', 'system', 'Qualty',
          case when clean is null then 'Group name cleared.' else 'Group renamed to ' || clean || '.' end);
end $$;
revoke execute on function public.rename_room(uuid, text) from public, anon;
grant execute on function public.rename_room(uuid, text) to authenticated;

-- ---------- standard certificate rates ----------
create table public.standard_rates (
  service text primary key,
  price_usd numeric(12, 2) not null check (price_usd > 0)
);
alter table public.standard_rates enable row level security;
-- Company figures: inspection companies and the Qualty team only.
create policy standard_rates_select on public.standard_rates for select to authenticated
  using (public.is_company_user() or (select public.is_admin()));
-- Placeholder figures until Vinay sends the real ones.
insert into public.standard_rates values
  ('ECTN (Electronic Cargo Tracking Note)', 120),
  ('CoC (Certificate of Conformity)', 350),
  ('Customs Import Control', 250);

create function public.listings_standard_rate() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rate numeric;
begin
  -- One rate at every location in India, with no discount on top.
  select price_usd into rate from public.standard_rates where service = new.service;
  if rate is not null and (new.price_usd <> rate or new.discount_pct <> 0) then
    raise exception '% has a standard rate of $% across India.', new.service, trim_scale(rate) using errcode = '23514';
  end if;
  return new;
end $$;
create trigger listings_standard_rate before insert or update on public.service_listings
  for each row execute function public.listings_standard_rate();
revoke execute on function public.listings_standard_rate() from public, anon, authenticated;

-- ---------- listings: company prices stay with the company ----------
-- Everyone else reads the store through browse_listings(), which returns customer prices.
drop policy listings_select on public.service_listings;
create policy listings_select on public.service_listings for select to authenticated
  using (public.has_company_role(company_id) or (select public.is_admin()));
