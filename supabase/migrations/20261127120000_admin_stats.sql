-- Numbers for the Qualty team's stats page (/admin): sign-ups, companies, orders and money.
-- Admins only. Reads auth.users, which the browser can't, so it runs as security definer.

create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only the Qualty team can see these numbers' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'users', (
      select jsonb_build_object(
        'total', count(*),
        'confirmed', count(*) filter (where u.email_confirmed_at is not null),
        'last7', count(*) filter (where u.created_at > now() - interval '7 days'),
        'last30', count(*) filter (where u.created_at > now() - interval '30 days'),
        'activeLast7', count(*) filter (where u.last_sign_in_at > now() - interval '7 days'))
      from auth.users u),

    'roles', (
      select coalesce(jsonb_object_agg(r.role, r.n), '{}'::jsonb)
      from (select p.role::text as role, count(*) as n from public.profiles p group by p.role) r),

    'signupsByDay', (
      select jsonb_agg(jsonb_build_object('day', d.day, 'count', d.n) order by d.day)
      from (
        select g::date as day,
               (select count(*) from auth.users u where u.created_at::date = g::date) as n
        from generate_series(current_date - 29, current_date, interval '1 day') g) d),

    'companies', jsonb_build_object(
      'total', (select count(*) from public.companies),
      'kycVerified', (select count(*) from public.companies c where c.kyc_verified_at is not null),
      'withListings', (select count(distinct l.company_id) from public.service_listings l where l.active),
      'activeListings', (select count(*) from public.service_listings l where l.active)),

    'orders', (
      select jsonb_build_object(
        'total', count(*),
        'enquiry', count(*) filter (where o.status = 'enquiry'),
        'booked', count(*) filter (where o.status = 'booked'),
        'inProgress', count(*) filter (where o.status = 'in-progress'),
        'completed', count(*) filter (where o.status = 'completed'),
        'paid', count(*) filter (where o.paid_at is not null),
        'last7', count(*) filter (where o.created_at > now() - interval '7 days'))
      from public.orders o),

    'byService', (
      select coalesce(jsonb_agg(jsonb_build_object('service', s.service, 'count', s.n) order by s.n desc, s.service), '[]'::jsonb)
      from (select o.service, count(*) as n from public.orders o group by o.service) s),

    'bids', (select count(*) from public.bids),
    'certificates', (select count(*) from public.certificates where status = 'issued'),

    'money', jsonb_build_object(
      'customerTotal', (select coalesce(sum(o.customer_price_usd), 0) from public.orders o where o.status <> 'enquiry'),
      'companyTotal', (select coalesce(sum(o.price_usd), 0) from public.orders o where o.status <> 'enquiry'),
      'invoiced', (select coalesce(sum(round(i.amount_usd * (1 - i.discount_pct / 100), 2)), 0) from public.invoices i),
      'collected', (select coalesce(sum(p.amount_usd), 0) from public.payments p)),

    'recentSignups', (
      select coalesce(jsonb_agg(r order by r."createdAt" desc), '[]'::jsonb)
      from (
        select coalesce(nullif(p.full_name, ''), u.raw_user_meta_data ->> 'full_name', '') as name,
               u.email,
               coalesce(p.role::text, 'customer') as role,
               (select c.name from public.company_members m join public.companies c on c.id = m.company_id
                 where m.user_id = u.id order by m.invited_at limit 1) as company,
               u.email_confirmed_at is not null as confirmed,
               u.created_at as "createdAt",
               u.last_sign_in_at as "lastSignIn"
        from auth.users u left join public.profiles p on p.id = u.id
        order by u.created_at desc
        limit 25) r)
  );
end $$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
