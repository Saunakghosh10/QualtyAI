-- Decisions from the 2026-11-17 roadmap call:
--   * Standard-rate services (ECTN, CoC, Customs Import Control, Buyer & Seller Verification) can be
--     booked at the default price even when no company lists them; the Qualty team assigns a company later.
--   * The Qualty team can create orders by hand for a customer and add the inspection company from the chat.
--   * Company KYC/KYB checked through Sandbox (server-side only); checked fields are locked afterwards.

-- ---------- standard rates: customers can see the customer price ----------
insert into public.standard_rates values ('Buyer & Seller Verification', 60)  -- placeholder until Vinay confirms
on conflict (service) do nothing;

create function public.standard_customer_prices()
returns table (service text, customer_price_usd numeric)
language sql stable security definer set search_path = '' as $$
  select r.service, public.customer_price(r.price_usd) from public.standard_rates r order by r.service
$$;
revoke execute on function public.standard_customer_prices() from public;
grant execute on function public.standard_customer_prices() to anon, authenticated;

-- ---------- prices at booking ----------
create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare l public.service_listings; rate numeric;
  manual boolean := coalesce(current_setting('qualty.manual_order', true), '') = 'on' and public.is_admin();
begin
  if not manual or new.customer_id is null then new.customer_id := auth.uid(); end if;
  new.buyer_verification := 'unverified';
  new.seller_verification := 'unverified';
  new.completed_at := null;
  new.paid_at := null;
  new.payment_ref := null;
  new.payment_sent_on := null;
  new.room_name := null;
  if manual then
    -- The Qualty team set the company price by hand (admin_create_order checked it).
    new.listing_id := null;
    if new.price_usd is null then
      new.inspection_company_id := null;
      new.customer_price_usd := null;
      new.status := 'enquiry';
    else
      new.customer_price_usd := public.customer_price(new.price_usd);
      new.status := 'booked';
    end if;
  elsif new.mode = 'quick' and new.listing_id is null then
    -- Standard-rate service booked at the default price; Qualty assigns the company.
    select price_usd into rate from public.standard_rates where service = new.service;
    if rate is null then raise exception 'quick booking needs an active listing' using errcode = '23514'; end if;
    new.inspection_company_id := null;
    new.price_usd := rate;
    new.customer_price_usd := public.customer_price(rate);
    new.status := 'booked';
  elsif new.mode = 'quick' then
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

-- ---------- the Qualty team creates an order by hand ----------
-- The customer must already have an account. With a company price the order is booked and invoiced
-- at price x 1.3; without one it opens as an enquiry for companies to bid on.
create function public.admin_create_order(
  customer_email text, service text, commodity text, location text, inspection_date date,
  volume_tons numeric, buyer_name text, seller_name text,
  company_id uuid default null, price_usd numeric default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare cid uuid; oid uuid; cname text;
begin
  if not public.is_admin() then raise exception 'only the Qualty team can create orders by hand' using errcode = '42501'; end if;
  select id into cid from auth.users where lower(email) = lower(trim(customer_email));
  if cid is null then raise exception 'no account uses %; ask them to sign up first', trim(customer_email) using errcode = 'P0002'; end if;
  if (company_id is null) <> (price_usd is null) then
    raise exception 'set both the company and its price, or neither' using errcode = '23514'; end if;
  if price_usd is not null and price_usd <= 0 then raise exception 'price must be more than $0' using errcode = '23514'; end if;
  if company_id is not null then
    select name into cname from public.companies where id = company_id;
    if cname is null then raise exception 'company not found' using errcode = 'P0002'; end if;
  end if;
  perform set_config('qualty.manual_order', 'on', true);
  insert into public.orders (customer_id, mode, service, commodity, location, inspection_date, volume_tons,
                             buyer_name, seller_name, inspection_company_id, price_usd)
  values (cid, case when company_id is null then 'inquiry' else 'quick' end::public.order_mode,
          trim(service), trim(commodity), trim(location), inspection_date, volume_tons,
          trim(buyer_name), trim(seller_name), company_id, price_usd)
  returning id into oid;
  perform set_config('qualty.manual_order', 'off', true);
  insert into public.messages (order_id, kind, text, author_name, author_role)
  values (oid, 'system', 'The Qualty team created this order'
          || coalesce(' with ' || cname || ' as the inspection company', '') || '.', 'Qualty', 'system');
  return oid;
end $$;
revoke execute on function public.admin_create_order(text, text, text, text, date, numeric, text, text, uuid, numeric) from public, anon;
grant execute on function public.admin_create_order(text, text, text, text, date, numeric, text, text, uuid, numeric) to authenticated;

-- ---------- the Qualty team adds the inspection company from the chat ----------
-- Only for booked orders that have no company yet (standard-rate bookings); the price is already fixed.
create function public.assign_company(oid uuid, cid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare cname text;
begin
  if not public.is_admin() then raise exception 'only the Qualty team can assign a company' using errcode = '42501'; end if;
  select name into cname from public.companies where id = cid;
  if cname is null then raise exception 'company not found' using errcode = 'P0002'; end if;
  update public.orders set inspection_company_id = cid
   where id = oid and status in ('booked', 'in-progress') and inspection_company_id is null;
  if not found then raise exception 'this order already has a company, or is not booked' using errcode = '23514'; end if;
  insert into public.messages (order_id, kind, text, author_name, author_role)
  values (oid, 'system', 'The Qualty team added ' || cname || ' as the inspection company.', 'Qualty', 'system');
end $$;
revoke execute on function public.assign_company(uuid, uuid) from public, anon;
grant execute on function public.assign_company(uuid, uuid) to authenticated;

-- ---------- KYC/KYB through Sandbox: checked fields are locked ----------
alter table public.companies
  add column kyc_verified_at timestamptz,
  add column kyc_legal_name text,
  add column kyc_source text;

create function public.companies_kyc_lock() returns trigger
language plpgsql security definer set search_path = '' as $$
declare trusted boolean := coalesce(auth.role(), '') = 'service_role' or public.is_admin();
begin
  if tg_op = 'INSERT' then
    if not trusted then
      new.kyc_verified_at := null; new.kyc_legal_name := null; new.kyc_source := null;
    end if;
    return new;
  end if;
  if not trusted then
    -- Only the server (after a Sandbox check) or the Qualty team set the KYC result.
    new.kyc_verified_at := old.kyc_verified_at;
    new.kyc_legal_name := old.kyc_legal_name;
    new.kyc_source := old.kyc_source;
    if old.kyc_verified_at is not null and (
         new.name is distinct from old.name or new.gstin is distinct from old.gstin
         or new.pan is distinct from old.pan or new.address is distinct from old.address) then
      raise exception 'company name, GSTIN, PAN and address are locked after verification; ask the Qualty team to change them'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger companies_kyc_lock before insert or update on public.companies
  for each row execute function public.companies_kyc_lock();
revoke execute on function public.companies_kyc_lock() from public, anon, authenticated;
