-- insert ... returning (supabase-js .insert().select()) checks the select policy on the new row,
-- but is_order_member() looks the order up by id and can't see a row from its own statement.
-- Check ownership on the row itself first.
drop policy orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (customer_id = (select auth.uid())
         or public.is_order_member(id)
         or (status = 'enquiry' and (select public.can_bid())));
