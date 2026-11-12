-- Companies no longer read enquiry rows directly (only through open_enquiries()), so the bid
-- insert check can't look the order up under their RLS. Check it with a definer helper instead.
create function public.is_open_enquiry(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders where id = oid and status = 'enquiry');
$$;
revoke execute on function public.is_open_enquiry(uuid) from public, anon;
grant execute on function public.is_open_enquiry(uuid) to authenticated;

drop policy bids_insert on public.bids;
create policy bids_insert on public.bids for insert to authenticated
  with check (public.has_company_role(company_id, '{owner,sales}') and status = 'open'
    and created_by = (select auth.uid())
    and public.is_open_enquiry(order_id));
