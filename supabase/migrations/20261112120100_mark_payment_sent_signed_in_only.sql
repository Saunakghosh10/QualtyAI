-- Payment claims need a signed-in customer (advisor 0028).
revoke execute on function public.mark_payment_sent(uuid, text) from public, anon;
grant execute on function public.mark_payment_sent(uuid, text) to authenticated;
