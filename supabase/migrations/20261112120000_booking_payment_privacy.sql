-- Booking flow, pay-to-open chatrooms and privacy between customers and inspection companies.
-- Decisions from the 2026-11-11 call with Vinay:
--   * Book now needs an account; enquiries carry the customer's budget.
--   * Every booked order gets an invoice automatically. The chatroom opens once the invoice is paid.
--   * Inspection data stays between the customer and the booked company. Other companies browsing
--     enquiries see the job (service, cargo, port, date, budget), never the buyer, seller or customer.
--   * Visitors can browse the service store before signing up.

-- ---------- new columns ----------

alter table public.orders
  add column budget_usd numeric(12, 2) check (budget_usd is null or budget_usd > 0),
  add column paid_at timestamptz,
  add column payment_ref text,
  add column payment_sent_on date;

alter table public.bids
  add column proposed_date date;

-- Customers can set the budget while the enquiry is open; payment columns change only through RPCs.
grant update (budget_usd) on public.orders to authenticated;
grant update (proposed_date) on public.bids to authenticated;

-- Client inserts can't mark an order paid.
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

-- ---------- who may use an order's chatroom ----------

-- Members of a paid order (customer and the booked company's team), and admins.
create function public.can_use_room(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (public.is_order_member(oid)
    and exists (select 1 from public.orders o where o.id = oid and o.paid_at is not null));
$$;

drop policy messages_select on public.messages;
drop policy messages_insert on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (public.can_use_room(order_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (public.can_use_room(order_id)
    and kind in ('text', 'observation', 'dispatch', 'flag', 'media')
    and (kind not in ('observation', 'dispatch', 'flag') or public.chat_role_for(order_id) <> 'customer')
    and (evidence_id is null or exists (select 1 from public.evidence e where e.id = evidence_id and e.order_id = messages.order_id)));

drop policy evidence_select on public.evidence;
drop policy evidence_insert on public.evidence;
create policy evidence_select on public.evidence for select to authenticated
  using (public.can_use_room(order_id));
create policy evidence_insert on public.evidence for insert to authenticated
  with check (public.can_use_room(order_id));

drop policy evidence_files_read on storage.objects;
drop policy evidence_files_add on storage.objects;
create policy evidence_files_read on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.can_use_room(public.try_uuid((storage.foldername(name))[1])));
create policy evidence_files_add on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.can_use_room(public.try_uuid((storage.foldername(name))[1])));

-- ---------- enquiries: companies see the job, not the people ----------

drop policy orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or public.is_order_member(id));

-- Open enquiries for companies that can bid, plus enquiries they already bid on.
create function public.open_enquiries()
returns table (id uuid, service text, commodity text, spec jsonb, spec_label text, location text,
               inspection_date date, volume_tons numeric, budget_usd numeric, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.id, o.service, o.commodity, o.spec, o.spec_label, o.location,
         o.inspection_date, o.volume_tons, o.budget_usd, o.created_at
    from public.orders o
   where o.status = 'enquiry' and public.can_bid()
     and o.customer_id <> (select auth.uid())
   order by o.created_at desc;
$$;
revoke execute on function public.open_enquiries() from public, anon;
grant execute on function public.open_enquiries() to authenticated;

-- A company's bids keep pointing at orders it can no longer read in full; that is intended.

-- ---------- public service store ----------

-- What a visitor sees before signing up: active listings and the company name.
create function public.browse_listings()
returns table (id uuid, company_id uuid, company_name text, company_verified boolean, service text,
               commodities text[], location text, price_usd numeric, discount_pct numeric,
               turnaround_days integer, surveyors integer, available_from date, available_to date,
               created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.id, l.company_id, c.name,
         exists (select 1 from public.kyc_docs k where k.company_id = c.id and k.status = 'verified'),
         l.service, l.commodities, l.location, l.price_usd, l.discount_pct, l.turnaround_days,
         l.surveyors, l.available_from, l.available_to, l.created_at
    from public.service_listings l join public.companies c on c.id = l.company_id
   where l.active and l.available_to >= current_date
   order by public.net_price(l.price_usd, l.discount_pct);
$$;
grant execute on function public.browse_listings() to anon, authenticated;

-- ---------- invoice on booking, paid when covered ----------

create function public.invoice_on_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'booked' and new.price_usd is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'booked')
     and not exists (select 1 from public.invoices where order_id = new.id) then
    insert into public.invoices (order_id, number, amount_usd, discount_pct, due_on)
    values (new.id,
            'INV-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 6)),
            new.price_usd, 0, current_date + 7);
  end if;
  return new;
end $$;
create trigger orders_invoice after insert or update of status on public.orders
  for each row execute function public.invoice_on_booking();

-- Keep orders.paid_at in step with the payments recorded against its invoice.
create function public.sync_paid() returns trigger
language plpgsql security definer set search_path = '' as $$
declare inv public.invoices; total numeric; paid numeric; was timestamptz;
begin
  select * into inv from public.invoices where id = coalesce(new.invoice_id, old.invoice_id);
  if not found then return null; end if;
  total := public.net_price(inv.amount_usd, inv.discount_pct);
  select coalesce(sum(amount_usd), 0) into paid from public.payments where invoice_id = inv.id;
  select paid_at into was from public.orders where id = inv.order_id;
  if paid >= total and was is null then
    update public.orders set paid_at = now() where id = inv.order_id;
    insert into public.messages (order_id, kind, author_role, author_name, text)
    values (inv.order_id, 'system', 'system', 'Qualty', 'Payment confirmed. Chatroom opened for the customer and the inspection company.');
  elsif paid < total and was is not null then
    update public.orders set paid_at = null where id = inv.order_id;
  end if;
  return null;
end $$;
create trigger payments_sync_paid after insert or update or delete on public.payments
  for each row execute function public.sync_paid();

-- The customer says they paid and gives the bank or UPI reference; the company confirms it.
create function public.mark_payment_sent(oid uuid, ref text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if length(trim(coalesce(ref, ''))) < 3 then raise exception 'add the payment reference'; end if;
  update public.orders set payment_ref = trim(ref), payment_sent_on = current_date
   where id = oid and customer_id = (select auth.uid()) and status <> 'enquiry' and paid_at is null;
  if not found then raise exception 'order not found or already paid' using errcode = '42501'; end if;
end $$;
grant execute on function public.mark_payment_sent(uuid, text) to authenticated;

-- System messages now say the room opens after payment.
create or replace function public.post_order_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare msg text;
begin
  if tg_op = 'INSERT' then
    msg := case when new.status = 'booked' then 'Order booked. Invoice sent; the chatroom opens once payment is confirmed.'
                else 'Enquiry created. Waiting for bids.' end;
  elsif new.status is distinct from old.status then
    msg := case new.status
      when 'booked' then 'Bid accepted. Invoice sent; the chatroom opens once payment is confirmed.'
      when 'in-progress' then 'Inspection started.'
      when 'completed' then 'Inspection marked complete.'
      else 'Status changed to ' || new.status end;
  else return new; end if;
  insert into public.messages (order_id, kind, author_role, author_name, text)
  values (new.id, 'system', 'system', 'Qualty', msg);
  return new;
end $$;

-- An inspection can't start before payment.
create or replace function public.set_order_status(oid uuid, next public.order_status) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where id = oid for update;
  if not found then raise exception 'order not found' using errcode = '42501'; end if;
  if not public.is_admin() then
    if not public.has_company_role(o.inspection_company_id, '{owner,ops,inspector}') then
      raise exception 'not allowed' using errcode = '42501'; end if;
    if o.paid_at is null then raise exception 'waiting for payment'; end if;
    if not ((o.status = 'booked' and next = 'in-progress') or (o.status = 'in-progress' and next = 'completed')) then
      raise exception 'cannot go from % to %', o.status, next; end if;
  end if;
  update public.orders
     set status = next, completed_at = case when next = 'completed' then now() else null end
   where id = oid;
end $$;

revoke execute on function public.invoice_on_booking(), public.sync_paid() from public, anon, authenticated;
revoke execute on function public.can_use_room(uuid) from public, anon;
grant execute on function public.can_use_room(uuid) to authenticated;

-- Orders booked before this change were already in use: treat them as paid so their rooms stay open.
update public.orders set paid_at = coalesce(paid_at, created_at) where status <> 'enquiry';
