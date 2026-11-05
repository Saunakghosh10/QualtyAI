-- Advisor follow-ups: keep policy helpers away from anon, index FKs, one permissive policy per action.

-- Policy helpers only matter for signed-in users. verify_certificate stays public on purpose.
revoke execute on function public.is_admin(), public.has_company_role(uuid, public.team_role[]),
  public.is_company_user(), public.is_order_member(uuid), public.is_order_customer(uuid),
  public.can_bid(), public.chat_role_for(uuid) from public, anon;
grant execute on function public.is_admin(), public.has_company_role(uuid, public.team_role[]),
  public.is_company_user(), public.is_order_member(uuid), public.is_order_customer(uuid),
  public.can_bid(), public.chat_role_for(uuid) to authenticated;

create index companies_created_by_idx on public.companies (created_by);
create index bids_created_by_idx on public.bids (created_by);
create index bid_rounds_created_by_idx on public.bid_rounds (created_by);
create index evidence_author_idx on public.evidence (author_id);
create index messages_author_idx on public.messages (author_id);

-- Split "for all" write policies so SELECT has a single permissive policy.
drop policy listings_write on public.service_listings;
create policy listings_insert on public.service_listings for insert to authenticated
  with check (public.has_company_role(company_id, '{owner,sales}'));
create policy listings_update on public.service_listings for update to authenticated
  using (public.has_company_role(company_id, '{owner,sales}'))
  with check (public.has_company_role(company_id, '{owner,sales}'));
create policy listings_delete on public.service_listings for delete to authenticated
  using (public.has_company_role(company_id, '{owner,sales}'));

drop policy invoices_write on public.invoices;
create policy invoices_insert on public.invoices for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id
      and public.has_company_role(o.inspection_company_id, '{owner,finance}')));
create policy invoices_update on public.invoices for update to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
      and public.has_company_role(o.inspection_company_id, '{owner,finance}')))
  with check (exists (select 1 from public.orders o where o.id = order_id
      and public.has_company_role(o.inspection_company_id, '{owner,finance}')));

drop policy payments_write on public.payments;
create policy payments_insert on public.payments for insert to authenticated
  with check (exists (select 1 from public.invoices i join public.orders o on o.id = i.order_id
      where i.id = invoice_id and public.has_company_role(o.inspection_company_id, '{owner,finance}')));
create policy payments_delete on public.payments for delete to authenticated
  using (exists (select 1 from public.invoices i join public.orders o on o.id = i.order_id
      where i.id = invoice_id and public.has_company_role(o.inspection_company_id, '{owner,finance}')));

drop policy compliance_write on public.compliance_items;
create policy compliance_insert on public.compliance_items for insert to authenticated
  with check (public.has_company_role(company_id, '{owner,ops}'));
create policy compliance_update on public.compliance_items for update to authenticated
  using (public.has_company_role(company_id, '{owner,ops}'))
  with check (public.has_company_role(company_id, '{owner,ops}'));
create policy compliance_delete on public.compliance_items for delete to authenticated
  using (public.has_company_role(company_id, '{owner,ops}'));
